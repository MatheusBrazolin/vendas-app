'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import type { Json, PaymentMethod } from '@/types/database'

interface SaleItem {
  product_id: string
  quantity: number
}

interface CreateSaleInput {
  payment_method: PaymentMethod
  notes: string
  items: SaleItem[]
}

export async function createSale(input: CreateSaleInput): Promise<{ saleId?: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_sale_with_items', {
    p_payment_method: input.payment_method,
    p_notes: input.notes || null,
    p_items: input.items as unknown as Json,
  })

  if (error) {
    const msg = error.message
    if (msg.includes('insufficient_stock')) {
      const product = msg.split(':')[1]?.trim() ?? 'produto'
      return { error: `Estoque insuficiente para: ${product}` }
    }
    if (msg.includes('product_not_found')) {
      return { error: 'Produto não encontrado.' }
    }
    if (msg.includes('empty_cart')) {
      return { error: 'Adicione pelo menos um produto.' }
    }
    if (msg.includes('unauthenticated')) {
      return { error: 'Sessão expirada. Faça login novamente.' }
    }
    return { error: error.message }
  }

  revalidatePath('/vendas')
  revalidatePath('/produtos')
  revalidatePath('/dashboard')

  return { saleId: data as string }
}

export interface CancelSaleResult {
  success: boolean
  error?: string
}

/**
 * Cancel (delete) a sale and restore product stock.
 *
 * Authorization is enforced twice — once here for a fast fail with a friendly
 * message, and again inside the `cancel_sale` Postgres function (defense in
 * depth: the RPC raises 42501 if `is_admin()` is false).
 *
 * Stock restoration + delete happens inside a single SQL function so the
 * operation is atomic — no risk of restoring stock and then failing to delete
 * the sale, or vice-versa.
 */
export async function cancelSale(saleId: string): Promise<CancelSaleResult> {
  if (!(await isAdmin())) {
    return {
      success: false,
      error: 'Apenas administradores podem excluir vendas.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_sale', { p_sale_id: saleId })

  if (error) {
    if (error.message.includes('sale_not_found')) {
      return { success: false, error: 'Venda não encontrada.' }
    }
    if (error.message.includes('forbidden')) {
      return {
        success: false,
        error: 'Apenas administradores podem excluir vendas.',
      }
    }
    return { success: false, error: error.message }
  }

  // Invalidate every surface that derives data from sales/stock.
  revalidatePath('/vendas')
  revalidatePath(`/vendas/${saleId}`)
  revalidatePath('/dashboard')
  revalidatePath('/produtos')

  return { success: true }
}

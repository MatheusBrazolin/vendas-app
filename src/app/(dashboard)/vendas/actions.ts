'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

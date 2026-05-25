import { createClient } from '@/lib/supabase/server'
import type { SaleWithItems } from '@/types/database'

export async function getSales(limit = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getSaleById(id: string): Promise<SaleWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*, products(*))')
    .eq('id', id)
    .single()

  if (error) return null
  return data as SaleWithItems
}

export async function getSalesByPeriod(from: Date, to: Date) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTopProducts(limit = 5) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sale_items')
    .select('product_id, quantity, products(name, code)')
    .limit(500)

  if (error) throw new Error(error.message)

  const totals: Record<string, { name: string; code: string; total: number }> = {}

  for (const item of data ?? []) {
    const pid = item.product_id
    if (!totals[pid]) {
      totals[pid] = {
        name: (item.products as { name: string; code: string })?.name ?? '',
        code: (item.products as { name: string; code: string })?.code ?? '',
        total: 0,
      }
    }
    totals[pid].total += item.quantity
  }

  return Object.entries(totals)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

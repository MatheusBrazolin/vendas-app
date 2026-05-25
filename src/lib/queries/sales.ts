import { createClient } from '@/lib/supabase/server'
import type { PaymentMethod, Sale, SaleWithItems } from '@/types/database'

export interface SalesListParams {
  payment?: PaymentMethod
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
  page?: number
  pageSize?: number
}

export interface SalesListResult {
  items: Sale[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 25

export async function getSalesPaged(
  params: SalesListParams = {},
): Promise<SalesListResult> {
  const supabase = await createClient()
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, params.pageSize ?? DEFAULT_PAGE_SIZE))

  let query = supabase
    .from('sales')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params.payment) {
    query = query.eq('payment_method', params.payment)
  }

  if (params.from) {
    query = query.gte('created_at', new Date(`${params.from}T00:00:00`).toISOString())
  }
  if (params.to) {
    query = query.lte('created_at', new Date(`${params.to}T23:59:59.999`).toISOString())
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    items: (data ?? []) as Sale[],
    total,
    page,
    pageSize,
    totalPages,
  }
}

/** Legacy helper kept for the dashboard widgets. */
export async function getSales(limit = 50): Promise<Sale[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as Sale[]
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

export async function getSalesByPeriod(from: Date, to: Date): Promise<Sale[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data ?? []) as Sale[]
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

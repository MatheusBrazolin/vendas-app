import { createClient } from '@/lib/supabase/server'
import { brDayRangeUTC } from '@/lib/utils/datetime'
import type { PaymentMethod, Sale, SaleWithItems } from '@/types/database'

export interface SalesListParams {
  payment?: PaymentMethod
  /** Filtro de dia exato (YYYY-MM-DD em BRT). */
  day?: string
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

  if (params.day) {
    // Filtro de dia exato em BRT. brDayRangeUTC traduz "2026-06-02" para
    // o intervalo UTC que cobre 00:00 → 23:59:59.999 em São Paulo —
    // sem ele, uma venda às 22h SP do dia 02 (= 01h UTC do dia 03) cairia
    // no dia errado, e filtrar "03" mostraria venda do "02".
    const { start, end } = brDayRangeUTC(params.day)
    query = query.gte('created_at', start).lte('created_at', end)
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

export async function getSaleById(id: string): Promise<SaleWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*, products(*)), customers(full_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as SaleWithItems
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

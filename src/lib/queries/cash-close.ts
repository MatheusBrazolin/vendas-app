import { createClient } from '@/lib/supabase/server'
import type { PaymentMethod } from '@/types/database'

export interface PaymentBreakdown {
  method: PaymentMethod
  count: number
  total: number
}

export interface CashCloseSummary {
  /** ISO date YYYY-MM-DD that was queried */
  date: string
  /** Number of sales in the window */
  count: number
  /** Sum of total_amount in the window */
  total: number
  /** Average ticket = total / count, or 0 when count is 0 */
  averageTicket: number
  /** Per-method aggregation, sorted by total desc */
  byPayment: PaymentBreakdown[]
  /** Raw sales list for table rendering */
  sales: Array<{
    id: string
    created_at: string
    total_amount: number
    payment_method: PaymentMethod
    notes: string | null
  }>
}

/**
 * Aggregate all sales for a single local-day window (00:00 → 23:59:59.999).
 * `localDate` should be an ISO date string in the YYYY-MM-DD form, in the user's timezone.
 */
export async function getCashClose(localDate: string): Promise<CashCloseSummary> {
  const start = new Date(`${localDate}T00:00:00`)
  const end = new Date(`${localDate}T23:59:59.999`)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select('id, created_at, total_amount, payment_method, notes')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const sales = (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    total_amount: Number(row.total_amount),
    payment_method: row.payment_method as PaymentMethod,
    notes: row.notes,
  }))

  const byPaymentMap = new Map<PaymentMethod, PaymentBreakdown>()
  let total = 0
  for (const sale of sales) {
    total += sale.total_amount
    const current = byPaymentMap.get(sale.payment_method) ?? {
      method: sale.payment_method,
      count: 0,
      total: 0,
    }
    byPaymentMap.set(sale.payment_method, {
      method: sale.payment_method,
      count: current.count + 1,
      total: current.total + sale.total_amount,
    })
  }

  const byPayment = Array.from(byPaymentMap.values()).sort((a, b) => b.total - a.total)
  const count = sales.length
  const averageTicket = count > 0 ? total / count : 0

  return { date: localDate, count, total, averageTicket, byPayment, sales }
}

/** YYYY-MM-DD of "today" in the server's local time. */
export function todayLocalISO(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

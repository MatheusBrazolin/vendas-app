import { createClient } from '@/lib/supabase/server'
import type { Sale } from '@/types/database'
import { startOfDay, startOfMonth, endOfDay, endOfMonth, subDays, format } from 'date-fns'

export async function getDashboardMetrics() {
  const supabase = await createClient()
  const now = new Date()

  const [todaySales, monthSales, allProducts, recentSales] = await Promise.all([
    supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', startOfDay(now).toISOString())
      .lte('created_at', endOfDay(now).toISOString()),

    supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', startOfMonth(now).toISOString())
      .lte('created_at', endOfMonth(now).toISOString()),

    supabase
      .from('products')
      .select('stock_quantity, min_stock')
      .eq('is_active', true),

    supabase
      .from('sales')
      .select('id, total_amount, payment_method, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const todayTotal = (todaySales.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
  const monthTotal = (monthSales.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
  const todayCount = todaySales.data?.length ?? 0
  const monthCount = monthSales.data?.length ?? 0
  const avgTicket = monthCount > 0 ? monthTotal / monthCount : 0
  const lowStockCount = (allProducts.data ?? []).filter(
    (p) => p.stock_quantity <= p.min_stock
  ).length

  return {
    todayTotal,
    monthTotal,
    todayCount,
    monthCount,
    avgTicket,
    lowStockCount,
    recentSales: (recentSales.data ?? []) as Sale[],
  }
}

export async function getSalesLast30Days() {
  const supabase = await createClient()
  const now = new Date()
  const from = subDays(now, 29)

  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, created_at')
    .gte('created_at', from.toISOString())
    .order('created_at')

  if (error) throw new Error(error.message)

  const byDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const day = format(subDays(now, 29 - i), 'dd/MM')
    byDay[day] = 0
  }

  for (const sale of data ?? []) {
    const day = format(new Date(sale.created_at), 'dd/MM')
    if (byDay[day] !== undefined) {
      byDay[day] += Number(sale.total_amount)
    }
  }

  return Object.entries(byDay).map(([date, total]) => ({ date, total }))
}

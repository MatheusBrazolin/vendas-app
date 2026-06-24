import { Suspense } from 'react'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { LowStockAlert } from '@/components/dashboard/low-stock-alert'
import { TopProducts } from '@/components/dashboard/top-products'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { getDashboardMetrics, getSalesLast30Days } from '@/lib/queries/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { requireAdmin } from '@/lib/auth/roles'
import { tryQuery } from '@/lib/supabase/try-query'
import { OfflineBanner } from '@/components/offline/offline-banner'

const EMPTY_METRICS = {
  todayTotal: 0,
  monthTotal: 0,
  avgTicket: 0,
  lowStockCount: 0,
  todayCount: 0,
  monthCount: 0,
  recentSales: [] as Awaited<ReturnType<typeof getDashboardMetrics>>['recentSales'],
}

export default async function DashboardPage() {
  await requireAdmin()

  const [{ data: metrics, offline }, { data: chartData }] = await Promise.all([
    tryQuery(() => getDashboardMetrics(), EMPTY_METRICS),
    tryQuery(() => getSalesLast30Days(), []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Visão geral do seu negócio</p>
      </div>

      {offline && (
        <OfflineBanner message="Sem conexão — exibindo zeros. Os dados serão atualizados quando a internet retornar." />
      )}

      <KpiCards
        todayTotal={metrics.todayTotal}
        monthTotal={metrics.monthTotal}
        avgTicket={metrics.avgTicket}
        lowStockCount={metrics.lowStockCount}
        todayCount={metrics.todayCount}
        monthCount={metrics.monthCount}
      />

      <SalesChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[480px]">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <RecentSales sales={metrics.recentSales} />
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <TopProducts />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <LowStockAlert />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

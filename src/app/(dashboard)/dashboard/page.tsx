import { Suspense } from 'react'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { LowStockAlert } from '@/components/dashboard/low-stock-alert'
import { TopProducts } from '@/components/dashboard/top-products'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { getDashboardMetrics, getSalesLast30Days } from '@/lib/queries/dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default async function DashboardPage() {
  const [metrics, chartData] = await Promise.all([
    getDashboardMetrics(),
    getSalesLast30Days(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm">Visão geral do seu negócio</p>
      </div>

      <KpiCards
        todayTotal={metrics.todayTotal}
        monthTotal={metrics.monthTotal}
        avgTicket={metrics.avgTicket}
        lowStockCount={metrics.lowStockCount}
        todayCount={metrics.todayCount}
        monthCount={metrics.monthCount}
      />

      <SalesChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentSales sales={metrics.recentSales} />
        </div>
        <div className="space-y-4">
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

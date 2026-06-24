import Link from 'next/link'
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Percent } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/roles'
import { getDREReport, PERIOD_LABELS, type DREPeriod, type DREResult } from '@/lib/queries/dre'
import { formatCurrency } from '@/lib/utils/format'
import { PAYMENT_LABELS } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { tryQuery } from '@/lib/supabase/try-query'
import { OfflineBanner } from '@/components/offline/offline-banner'

export const metadata = { title: 'Relatório de lucro' }

const PERIODS: DREPeriod[] = ['this-month', 'last-month', 'last-30', 'last-90']

function isPeriod(value: unknown): value is DREPeriod {
  return typeof value === 'string' && PERIODS.includes(value as DREPeriod)
}

interface KpiCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent?: 'green' | 'red' | 'blue' | 'slate'
  sub?: string
}

function KpiCard({ label, value, icon: Icon, accent = 'slate', sub }: KpiCardProps) {
  const iconColor = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-500 dark:text-red-400',
    blue: 'text-primary',
    slate: 'text-slate-500 dark:text-slate-400',
  }[accent]

  const valueColor = {
    green: 'text-green-700 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-primary/80',
    slate: 'text-slate-900 dark:text-slate-100',
  }[accent]

  return (
    <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className={cn('text-2xl font-semibold mt-1 tabular-nums', valueColor)}>{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('shrink-0 mt-0.5', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const period: DREPeriod = isPeriod(sp.period) ? sp.period : 'this-month'

  const EMPTY_DRE: DREResult = {
    revenue: 0,
    cost: 0,
    grossProfit: 0,
    grossMargin: 0,
    salesCount: 0,
    byPayment: {},
    topProducts: [],
  }
  const { data: dre, offline } = await tryQuery(
    () => getDREReport(period),
    EMPTY_DRE,
  )

  const marginColor =
    dre.grossMargin >= 30 ? 'green' : dre.grossMargin >= 10 ? 'slate' : 'red'

  return (
    <div className="space-y-6">
      {offline && (
        <OfflineBanner message="Sem conexão — relatório indisponível offline." />
      )}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Relatório de lucro</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Receita, custo e margem bruta por período
        </p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/relatorios?period=${p}`}
            className={cn(
              'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors border',
              period === p
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Vendas" value={String(dre.salesCount)} icon={ShoppingCart} accent="blue" />
        <KpiCard label="Receita" value={formatCurrency(dre.revenue)} icon={DollarSign} accent="blue" />
        <KpiCard label="Custo" value={formatCurrency(dre.cost)} icon={TrendingDown} accent={dre.cost > 0 ? 'red' : 'slate'} sub="custo de produto (aprox.)" />
        <KpiCard label="Lucro bruto" value={formatCurrency(dre.grossProfit)} icon={TrendingUp} accent={dre.grossProfit >= 0 ? 'green' : 'red'} />
        <KpiCard label="Margem bruta" value={`${dre.grossMargin.toFixed(1)}%`} icon={Percent} accent={marginColor} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment method breakdown */}
        <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Por forma de pagamento</h2>
          {Object.keys(dre.byPayment).length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma venda no período.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(dre.byPayment)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([method, { revenue, count }]) => {
                  const pct = dre.revenue > 0 ? (revenue / dre.revenue) * 100 : 0
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {PAYMENT_LABELS[method] ?? method}
                        </span>
                        <span className="tabular-nums text-slate-900 dark:text-slate-100 font-semibold">
                          {formatCurrency(revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/90 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums w-16 text-right">
                          {count} venda{count !== 1 ? 's' : ''} · {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>

        {/* Top products */}
        <Card className="lg:col-span-2 border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Top produtos por receita
          </h2>
          {dre.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum produto vendido no período.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-2 pr-4">
                      Produto
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-2 pr-4">
                      Qtd
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-2 pr-4">
                      Receita
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-2 pr-4">
                      Lucro
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-2">
                      Margem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {dre.topProducts.map((p) => (
                    <tr key={p.name} className="hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors">
                      <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                        {p.name}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {p.quantity}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={p.profit >= 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                          {formatCurrency(p.profit)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        <span className={
                          p.margin >= 30
                            ? 'text-green-700 dark:text-green-400 font-medium'
                            : p.margin >= 10
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-red-600 dark:text-red-400 font-medium'
                        }>
                          {p.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {dre.cost === 0 && dre.salesCount > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded px-2 py-1.5 border border-amber-100 dark:border-amber-500/20">
              Custo zero detectado. Cadastre o custo dos produtos em Produtos → Editar para calcular a margem real.
            </p>
          )}
        </Card>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        * Custo calculado com base no preço de custo atual dos produtos (não histórico no momento da venda).
      </p>
    </div>
  )
}

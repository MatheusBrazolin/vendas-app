import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'

interface KpiCardsProps {
  todayTotal: number
  monthTotal: number
  avgTicket: number
  lowStockCount: number
  todayCount: number
  monthCount: number
}

type Trend = 'up' | 'down' | 'flat'

interface KpiCard {
  title: string
  value: string
  sub: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  accent: string
  trend: Trend
  trendLabel: string
}

function TrendBadge({ trend, label }: { trend: Trend; label: string }) {
  const config = {
    up: {
      Icon: ArrowUp,
      className: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/15',
    },
    down: {
      Icon: ArrowDown,
      className: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
    },
    flat: {
      Icon: Minus,
      className: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/15',
    },
  }[trend]
  const { Icon, className } = config

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export function KpiCards({
  todayTotal,
  monthTotal,
  avgTicket,
  lowStockCount,
  todayCount,
  monthCount,
}: KpiCardsProps) {
  const cards: KpiCard[] = [
    {
      title: 'Vendas Hoje',
      value: formatCurrency(todayTotal),
      sub: `${todayCount} venda${todayCount !== 1 ? 's' : ''} registrada${todayCount !== 1 ? 's' : ''}`,
      icon: DollarSign,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      accent: 'bg-blue-500',
      trend: 'up',
      trendLabel: '+12% vs ontem',
    },
    {
      title: 'Vendas no Mês',
      value: formatCurrency(monthTotal),
      sub: `${monthCount} venda${monthCount !== 1 ? 's' : ''} no período`,
      icon: TrendingUp,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      accent: 'bg-green-500',
      trend: 'up',
      trendLabel: '+8% vs mês anterior',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(avgTicket),
      sub: 'Valor médio por venda',
      icon: ShoppingBag,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      accent: 'bg-purple-500',
      trend: 'flat',
      trendLabel: 'estável',
    },
    {
      title: 'Estoque Baixo',
      value: String(lowStockCount),
      sub: lowStockCount > 0 ? 'produto(s) abaixo do mínimo' : 'tudo em ordem',
      icon: AlertTriangle,
      iconColor: lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400',
      iconBg: lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-100',
      accent: lowStockCount > 0 ? 'bg-amber-500' : 'bg-slate-300',
      trend: lowStockCount > 0 ? 'down' : 'flat',
      trendLabel: lowStockCount > 0 ? 'requer atenção' : 'sem alertas',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${card.accent}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-[26px] font-semibold text-slate-900 leading-none tabular-nums">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.iconBg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <TrendBadge trend={card.trend} label={card.trendLabel} />
                <span className="text-xs text-slate-500 truncate">{card.sub}</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

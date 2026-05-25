'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'

interface SalesChartProps {
  data: { date: string; total: number }[]
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ value?: number | string }>
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const value = Number(payload[0]?.value ?? 0)
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
        {formatCurrency(value)}
      </p>
    </div>
  )
}

export function SalesChart({ data }: SalesChartProps) {
  const total = data.reduce((sum, point) => sum + point.total, 0)

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base text-slate-900">Vendas — Últimos 30 dias</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Evolução diária do faturamento</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Acumulado
          </p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v) => `R$${v}`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#salesGradient)"
              activeDot={{
                r: 5,
                stroke: '#fff',
                strokeWidth: 2,
                fill: '#2563eb',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

import Link from 'next/link'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatRelative, PAYMENT_LABELS } from '@/lib/utils/format'
import type { Sale } from '@/types/database'
import type { PaymentMethod } from '@/types/database'

interface RecentSalesProps {
  sales: Sale[]
}

const PAYMENT_BADGE: Record<PaymentMethod, { badge: string; dot: string }> = {
  cash: { badge: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/15', dot: 'bg-green-500' },
  pix: { badge: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/15', dot: 'bg-purple-500' },
  credit: { badge: 'bg-primary/5 text-primary/80 ring-1 ring-inset ring-primary/20', dot: 'bg-primary/90' },
  debit: { badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15', dot: 'bg-orange-500' },
  fiado: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15', dot: 'bg-amber-500' },
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-slate-500" />
            Últimas Vendas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-slate-500 hover:text-slate-800 text-xs"
          >
            <Link href="/vendas" className="flex items-center gap-1">
              Ver todas
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sales.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-400">Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <div>
            {sales.map((sale, idx) => {
              const style = PAYMENT_BADGE[sale.payment_method as PaymentMethod] ?? PAYMENT_BADGE.cash
              return (
                <Link
                  key={sale.id}
                  href={`/vendas/${sale.id}`}
                  className={`flex items-center justify-between px-6 py-3 hover:bg-slate-50/80 transition-colors ${
                    idx !== sales.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-semibold text-slate-500 tabular-nums">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(sale.total_amount)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRelative(sale.created_at)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {PAYMENT_LABELS[sale.payment_method]}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

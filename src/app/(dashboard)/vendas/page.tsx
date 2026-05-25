import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSales } from '@/lib/queries/sales'
import { formatCurrency, formatDate, PAYMENT_LABELS } from '@/lib/utils/format'
import type { PaymentMethod } from '@/types/database'

type PaymentStyle = { badge: string; dot: string }

const PAYMENT_STYLES: Record<PaymentMethod, PaymentStyle> = {
  cash: {
    badge: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/15',
    dot: 'bg-green-500',
  },
  pix: {
    badge: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/15',
    dot: 'bg-purple-500',
  },
  credit: {
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15',
    dot: 'bg-blue-500',
  },
  debit: {
    badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15',
    dot: 'bg-orange-500',
  },
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const style = PAYMENT_STYLES[method] ?? PAYMENT_STYLES.cash
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {PAYMENT_LABELS[method]}
    </span>
  )
}

export default async function VendasPage() {
  const sales = await getSales(100)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Vendas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sales.length} {sales.length === 1 ? 'venda registrada' : 'vendas registradas'}
          </p>
        </div>
        <Button asChild className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
          <Link href="/vendas/nova">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Venda
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 h-11">
                  Data
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Total
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Pagamento
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Observações
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 mt-1">
                        Nenhuma venda registrada
                      </p>
                      <p className="text-xs text-slate-400">
                        Registre sua primeira venda clicando em Nova Venda.
                      </p>
                      <Button asChild size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                        <Link href="/vendas/nova">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Nova Venda
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale, idx) => (
                  <TableRow
                    key={sale.id}
                    className={`border-slate-100 hover:bg-slate-50/70 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <TableCell className="text-sm text-slate-600 tabular-nums">
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <PaymentBadge method={sale.payment_method as PaymentMethod} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 truncate max-w-xs">
                      {sale.notes || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Link href={`/vendas/${sale.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

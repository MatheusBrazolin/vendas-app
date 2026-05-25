import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CreditCard, FileText, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSaleById } from '@/lib/queries/sales'
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
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {PAYMENT_LABELS[method]}
    </span>
  )
}

export default async function VendaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sale = await getSaleById(id)

  if (!sale) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2"
        >
          <Link href="/vendas">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Detalhes da Venda</h1>
        <p className="text-sm text-slate-500 mt-1">{formatDate(sale.created_at)}</p>
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              Resumo
            </CardTitle>
            <PaymentBadge method={sale.payment_method as PaymentMethod} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Data</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {formatDate(sale.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Pagamento
                </p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {PAYMENT_LABELS[sale.payment_method]}
                </p>
              </div>
            </div>
            {sale.notes && (
              <div className="col-span-2 flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Observações
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{sale.notes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900">Itens da Venda</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 h-11 pl-6">
                  Produto
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">
                  Qtd
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Preço Unit.
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right pr-6">
                  Subtotal
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.sale_items.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className={`border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                >
                  <TableCell className="pl-6">
                    <p className="font-medium text-slate-900">{item.products.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{item.products.code}</p>
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-700 tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-slate-500 tabular-nums">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 tabular-nums pr-6">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t border-slate-100 mx-6 my-0" />
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Total da Venda</span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(sale.total_amount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

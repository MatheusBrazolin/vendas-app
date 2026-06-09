import Link from 'next/link'
import { Plus, Printer, ShoppingCart, Wallet } from 'lucide-react'
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
import { Pagination } from '@/components/ui/pagination'
import { SalesFilters } from '@/components/sales/sales-filters'
import { getSalesPaged } from '@/lib/queries/sales'
import { getCurrentUser } from '@/lib/auth/roles'
import { todayBRISO } from '@/lib/utils/datetime'
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

function parsePayment(value: string | undefined): PaymentMethod | undefined {
  if (value === 'cash' || value === 'pix' || value === 'credit' || value === 'debit') {
    return value
  }
  return undefined
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

interface VendasSearchParams {
  payment?: string
  day?: string
  page?: string
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<VendasSearchParams>
}) {
  const sp = await searchParams
  const payment = parsePayment(sp.payment)
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1

  // Funcionário só enxerga as vendas de HOJE — sem acesso ao histórico antigo.
  // A trava é no servidor: mesmo que ele force ?day=2026-01-01 na URL, aqui
  // sobrescrevemos para o dia de hoje (BRT). Admin vê o histórico completo.
  const user = await getCurrentUser()
  const isEmployee = user?.role !== 'admin'
  const day = isEmployee
    ? todayBRISO()
    : isIsoDate(sp.day)
      ? sp.day
      : undefined

  const { items: sales, total, totalPages, pageSize } = await getSalesPaged({
    payment,
    day,
    page,
  })

  // Para o funcionário, "hoje" é o estado normal, não um filtro que ele aplicou.
  const hasFilters = Boolean(payment || (!isEmployee && day))

  const paginationParams: Record<string, string | undefined> = {
    payment,
    day,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {isEmployee ? 'Vendas de hoje' : 'Vendas'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} {total === 1 ? 'venda registrada' : 'vendas registradas'}
            {isEmployee ? ' hoje' : hasFilters ? ' (com filtros aplicados)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Fechar caixa: funcionário usa todo final de dia, não é admin-only. */}
          <Button
            asChild
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Link href="/vendas/fechamento">
              <Wallet className="mr-1.5 h-4 w-4" />
              Fechar caixa
            </Link>
          </Button>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
            <Link href="/vendas/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova Venda
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <SalesFilters
          payment={payment ?? ''}
          day={day ?? ''}
          hasFilters={hasFilters}
          lockedDay={isEmployee}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 h-11">
                  Data
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Total
                </TableHead>
                {/* Pagamento e Observações somem em telas estreitas pra
                    deixar Data / Total / Ações respiráveis no iPhone. */}
                <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pagamento
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Observações
                </TableHead>
                <TableHead className="w-24 sm:w-32 text-right pr-3 sm:pr-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ações
                </TableHead>
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
                        {hasFilters ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {hasFilters
                          ? 'Tente ajustar os filtros.'
                          : 'Registre sua primeira venda clicando em Nova Venda.'}
                      </p>
                      {!hasFilters && (
                        <Button asChild size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                          <Link href="/vendas/nova">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Nova Venda
                          </Link>
                        </Button>
                      )}
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
                      <div>{formatDate(sale.created_at)}</div>
                      {/* Em mobile (onde Pagamento some), mostramos o badge
                          aqui embaixo da data pra não perder a informação. */}
                      <div className="sm:hidden mt-1">
                        <PaymentBadge method={sale.payment_method as PaymentMethod} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PaymentBadge method={sale.payment_method as PaymentMethod} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500 truncate max-w-xs">
                      {sale.notes || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right pr-3 sm:pr-6">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Ver detalhes"
                        >
                          <Link href={`/vendas/${sale.id}`}>Ver</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Imprimir recibo"
                        >
                          <Link href={`/vendas/${sale.id}/recibo`}>
                            <Printer className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          basePath="/vendas"
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          searchParams={paginationParams}
        />
      </Card>
    </div>
  )
}

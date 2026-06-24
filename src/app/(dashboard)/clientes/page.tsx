import Link from 'next/link'
import { UserRound, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { getCustomersWithDebt } from '@/lib/queries/customers'
import { formatCurrency } from '@/lib/utils/format'
import { OfflineBanner } from '@/components/offline/offline-banner'
import type { CustomerBalance } from '@/types/database'

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return differenceInCalendarDays(new Date(), new Date(dateStr))
}

function DebtBadge({ customer }: { customer: CustomerBalance }) {
  const debt = customer.current_debt

  if (debt <= 0) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Sem débito</span>
      </div>
    )
  }

  // When the customer has never paid, count days since the first fiado purchase
  // instead of showing a generic "Nunca pagou" — a brand-new customer just starting
  // on fiado shouldn't see that message right away.
  const referenceDate = customer.last_payment_at ?? customer.first_fiado_at
  const days = daysSince(referenceDate)

  let label: string
  if (customer.last_payment_at !== null) {
    label = days === 0 ? 'Pagou hoje' : `${days} ${days === 1 ? 'dia' : 'dias'} sem pagar`
  } else if (days !== null) {
    label = days === 0 ? 'Comprou hoje' : `${days} ${days === 1 ? 'dia' : 'dias'} em aberto`
  } else {
    label = 'Sem histórico'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-base font-bold tabular-nums">{formatCurrency(debt)}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

export default async function ClientesPage() {
  let customers: CustomerBalance[] = []
  let offline = false
  try {
    customers = await getCustomersWithDebt()
  } catch {
    offline = true
  }

  return (
    <div className="space-y-6">
      {offline && (
        <OfflineBanner message="Sem conexão — lista de clientes indisponível offline." />
      )}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Clientes / Fiado</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {customers.length} {customers.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400 dark:text-slate-500">
          <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
            <UserRound className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum cliente cadastrado</p>
          <p className="text-xs text-center max-w-xs">
            Clientes são criados automaticamente ao registrar uma venda fiada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-black/20 p-4 flex flex-col gap-3 hover:shadow-md dark:hover:shadow-black/30 transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{customer.full_name}</p>
                  {customer.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      {customer.phone}
                    </p>
                  )}
                </div>
                <DebtBadge customer={customer} />
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/5 rounded-lg p-2.5">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Total fiado</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                    {formatCurrency(customer.total_fiado)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Total pago</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                    {formatCurrency(customer.total_paid)}
                  </p>
                </div>
              </div>

              {/* Action */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <Link href={`/clientes/${customer.id}`}>Ver detalhes</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

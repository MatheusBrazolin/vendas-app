import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCashClose, todayLocalISO } from '@/lib/queries/cash-close'
import { CashCloseView } from '@/components/sales/cash-close-view'

export const metadata = {
  title: 'Fechamento de caixa',
}

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date } = await searchParams
  const localDate = isValidDate(date) ? date : todayLocalISO()
  const summary = await getCashClose(localDate)

  return <CashCloseView summary={summary} />
}

function isValidDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

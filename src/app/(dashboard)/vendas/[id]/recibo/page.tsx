import { notFound, redirect } from 'next/navigation'
import { getSaleById } from '@/lib/queries/sales'
import { ReceiptView } from '@/components/sales/receipt-view'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Recibo da venda',
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const sale = await getSaleById(id)
  if (!sale) notFound()

  return <ReceiptView sale={sale} />
}

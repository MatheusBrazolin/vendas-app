import { notFound } from 'next/navigation'
import { getPaymentReceipt } from '@/lib/queries/customers'
import { PaymentReceiptView } from '@/components/customers/payment-receipt-view'

interface Props {
  params: Promise<{ id: string; paymentId: string }>
}

export default async function ReciboPageamentoPage({ params }: Props) {
  const { id, paymentId } = await params
  const data = await getPaymentReceipt(id, paymentId)

  if (!data) notFound()

  return <PaymentReceiptView data={data} />
}

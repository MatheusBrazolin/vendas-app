import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { isElectron } from '@/lib/db/client'
import * as sqliteQueries from '@/lib/db/queries/customers'
import type { CustomerBalance, Customer, DebtPayment, Sale } from '@/types/database'

export interface PaymentReceiptData {
  payment: DebtPayment
  customer: Customer
  remainingDebt: number
}

export async function getCustomersWithDebt(): Promise<CustomerBalance[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customer_balances')
      .select('*')
      .order('current_debt', { ascending: false })
    if (error) throw error
    return data as CustomerBalance[]
  } catch {
    // Offline or timeout — serve SQLite cache in Electron so debt cards
    // remain visible without a connection.
    if (isElectron()) return sqliteQueries.getCustomersWithDebt()
    throw new Error('Supabase unreachable')
  }
}

export interface CustomerDetails {
  customer: Customer
  fiadoSales: (Sale & { sale_items: { quantity: number; unit_price: number; subtotal: number; products: { name: string } }[] })[]
  debtPayments: DebtPayment[]
  totalFiado: number
  totalPaid: number
  currentDebt: number
}

export async function getCustomerDetails(id: string): Promise<CustomerDetails | null> {
  try {
    const supabase = await createClient()

    const [customerRes, salesRes, paymentsRes, balanceRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase
        .from('sales')
        .select('*, sale_items(quantity, unit_price, subtotal, products(name))')
        .eq('customer_id', id)
        .eq('payment_method', 'fiado')
        .order('created_at', { ascending: false }),
      supabase
        .from('debt_payments')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_balances')
        .select('total_fiado, total_paid, current_debt')
        .eq('id', id)
        .single(),
    ])

    if (customerRes.error || !customerRes.data) {
      if (isElectron()) return sqliteQueries.getCustomerDetails(id)
      return null
    }

    const fiadoSales = (salesRes.data ?? []) as CustomerDetails['fiadoSales']
    const debtPayments = (paymentsRes.data ?? []) as DebtPayment[]

    const totalFiado = balanceRes.data?.total_fiado ?? fiadoSales.reduce((sum, s) => sum + s.total_amount, 0)
    const totalPaid = balanceRes.data?.total_paid ?? debtPayments.reduce((sum, p) => sum + p.amount, 0)
    const currentDebt = balanceRes.data?.current_debt ?? (totalFiado - totalPaid)

    return {
      customer: customerRes.data as Customer,
      fiadoSales,
      debtPayments,
      totalFiado,
      totalPaid,
      currentDebt,
    }
  } catch {
    if (isElectron()) return sqliteQueries.getCustomerDetails(id)
    return null
  }
}

export async function getPaymentReceipt(
  customerId: string,
  paymentId: string,
): Promise<PaymentReceiptData | null> {
  // Always use Supabase: the payment was just created online via RPC and
  // won't be in the local SQLite cache until the next sync cycle.
  const supabase = await createClient()

  const [paymentRes, customerRes, balanceRes] = await Promise.all([
    supabase.from('debt_payments').select('*').eq('id', paymentId).eq('customer_id', customerId).single(),
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('customer_balances').select('current_debt').eq('id', customerId).single(),
  ])

  if (paymentRes.error || !paymentRes.data) return null
  if (customerRes.error || !customerRes.data) return null

  return {
    payment: paymentRes.data as DebtPayment,
    customer: customerRes.data as Customer,
    remainingDebt: balanceRes.data?.current_debt ?? 0,
  }
}

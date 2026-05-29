'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  ShoppingCart,
  Search,
  Receipt,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ProductSearch } from '@/components/sales/product-search'
import { Cart } from '@/components/sales/cart'
import { createSale } from '../actions'
import { formatCurrency } from '@/lib/utils/format'
import type { CartItem, PaymentMethod } from '@/types/database'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit', label: 'Cartão de Crédito' },
  { value: 'debit', label: 'Cartão de Débito' },
]

export function PDV() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Track whether the user has tried to confirm the sale at least once.
  // Used to show validation feedback (red border, error message) only AFTER
  // the first attempt, so a fresh form doesn't look like it's already in error.
  const [triedSubmit, setTriedSubmit] = useState(false)
  // Free-text input bound to the "valor recebido" field. We keep it as string
  // so the user can type "12,50" or partial numbers without React fighting them.
  const [cashReceivedRaw, setCashReceivedRaw] = useState('')
  const paymentMissing = !paymentMethod

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.sale_price * item.quantity,
    0
  )
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Parse the "valor recebido" string into a number. Accept both "12,50"
  // (pt-BR) and "12.50" so the cashier can type whichever feels natural.
  // Returns NaN when the field is empty or unparseable, which we treat as
  // "not entered yet" for UI purposes.
  const cashReceived = cashReceivedRaw.trim()
    ? parseFloat(cashReceivedRaw.replace(',', '.'))
    : NaN
  const hasCashEntered = !Number.isNaN(cashReceived)
  const change = hasCashEntered ? cashReceived - total : 0
  const cashShort = hasCashEntered && cashReceived < total

  function handleAddItem(item: CartItem) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === item.product.id)
      if (existing) {
        const maxQty = existing.product.stock_quantity
        return prev.map((i) =>
          i.product.id === item.product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, maxQty) }
            : i
        )
      }
      return [...prev, item]
    })
  }

  function handleUpdateQty(productId: string, qty: number) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    )
  }

  function handleRemove(productId: string) {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  async function handleSubmit() {
    setTriedSubmit(true)

    if (cartItems.length === 0) {
      toast.error('Adicione pelo menos um produto')
      return
    }
    if (!paymentMethod) {
      toast.error('Selecione o método de pagamento')
      return
    }
    // Cash sales: block if the entered amount is less than the total. The
    // cashier might still confirm a cash sale without typing anything in
    // (e.g. they already calculated the change in their head) — only when
    // they DID type something AND it's short do we refuse.
    if (paymentMethod === 'cash' && hasCashEntered && cashShort) {
      toast.error('Valor recebido é menor que o total da venda')
      return
    }

    setIsSubmitting(true)

    const result = await createSale({
      payment_method: paymentMethod,
      notes,
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
    })

    setIsSubmitting(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Venda registrada com sucesso!')
    router.push(`/vendas/${result.saleId}`)
  }

  // Keep the button clickable when the payment method is missing so the user
  // gets explicit feedback (toast + red border on the dropdown) instead of a
  // silent disabled button that doesn't explain why nothing happens.
  const canSubmit = !isSubmitting && cartItems.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-500" />
              Buscar produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearch onAdd={handleAddItem} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-slate-500" />
              Carrinho
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </CardHeader>
          <CardContent>
            <Cart
              items={cartItems}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-24 border-slate-200/80 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              Finalizar venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                Método de pagamento <span className="text-red-500">*</span>
              </Label>
              <Select
                value={paymentMethod}
                // Base UI uses `items` to map raw values → labels in
                // <SelectValue>. Without it the trigger renders "debit"
                // instead of "Cartão de Débito".
                items={PAYMENT_OPTIONS}
                onValueChange={(v) => {
                  const next = v as PaymentMethod
                  setPaymentMethod(next)
                  // Reset the cash-received field when switching away from
                  // cash so a stale value doesn't follow the user around.
                  if (next !== 'cash') setCashReceivedRaw('')
                }}
              >
                <SelectTrigger
                  aria-invalid={triedSubmit && paymentMissing}
                  className={
                    triedSubmit && paymentMissing
                      ? 'h-10 border-red-500 ring-2 ring-red-100'
                      : 'h-10 border-slate-200'
                  }
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {triedSubmit && paymentMissing && (
                <p className="text-red-500 text-xs">
                  Selecione o método de pagamento para finalizar.
                </p>
              )}
            </div>

            {paymentMethod === 'cash' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cash-received"
                    className="text-xs font-medium text-emerald-900 flex items-center gap-1.5"
                  >
                    <Banknote className="h-3.5 w-3.5 text-emerald-700" />
                    Valor recebido
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                      R$
                    </span>
                    <Input
                      id="cash-received"
                      type="text"
                      inputMode="decimal"
                      value={cashReceivedRaw}
                      onChange={(e) => {
                        // Only accept digits and a single comma/period — keeps
                        // the field tidy without fighting the user mid-typing.
                        const cleaned = e.target.value.replace(/[^\d,.]/g, '')
                        setCashReceivedRaw(cleaned)
                      }}
                      placeholder="0,00"
                      autoComplete="off"
                      className="h-10 pl-9 bg-white border-emerald-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-200"
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[total, 50, 100, 200].map((preset, idx) => (
                      <button
                        key={`${preset}-${idx}`}
                        type="button"
                        onClick={() => setCashReceivedRaw(preset.toFixed(2).replace('.', ','))}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        {idx === 0 ? 'Valor exato' : formatCurrency(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                {hasCashEntered && (
                  <div
                    className={
                      cashShort
                        ? 'rounded-md bg-red-50 border border-red-200 px-3 py-2'
                        : 'rounded-md bg-emerald-100/60 border border-emerald-300 px-3 py-2'
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={
                          cashShort
                            ? 'text-xs font-medium text-red-700'
                            : 'text-xs font-medium text-emerald-900'
                        }
                      >
                        {cashShort ? 'Falta receber' : 'Troco'}
                      </span>
                      <span
                        className={
                          cashShort
                            ? 'text-lg font-bold tabular-nums text-red-700'
                            : 'text-lg font-bold tabular-nums text-emerald-900'
                        }
                      >
                        {formatCurrency(Math.abs(change))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-slate-700">
                Observações
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações opcionais..."
                rows={2}
                className="border-slate-200 text-sm resize-none"
              />
            </div>

            <div className="rounded-lg bg-slate-900 text-white p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm text-slate-300 font-medium">Total</span>
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-base shadow-sm shadow-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Confirmar venda
                </>
              )}
            </Button>

            {cartItems.length === 0 && (
              <p className="text-xs text-slate-500 text-center">
                Adicione produtos ao carrinho para finalizar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

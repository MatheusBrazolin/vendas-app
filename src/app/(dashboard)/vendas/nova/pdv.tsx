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
  CloudOff,
  Printer,
  X,
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
import { queueSale } from '@/lib/offline/sales-repo'
import { formatCurrency } from '@/lib/utils/format'
import { printReceipt } from '@/lib/utils/print-receipt'
import type { CartItem, PaymentMethod } from '@/types/database'

/** Snapshot of a sale saved offline, for the provisional confirmation banner. */
interface OfflineSaleConfirmation {
  items: { name: string; quantity: number; unit_price: number }[]
  total: number
  paymentLabel: string
}

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
  // Set after a sale is saved offline — drives the provisional receipt banner.
  const [offlineSale, setOfflineSale] = useState<OfflineSaleConfirmation | null>(null)
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

    // One UUID per sale: used as the server's idempotency key so a queued sale
    // flushed after a flaky reconnect is never inserted twice.
    const clientUuid = crypto.randomUUID()
    const rpcItems = cartItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }))

    // `finally` guarantees the button is re-enabled no matter which path (or
    // unexpected throw) we take, so a sale can never lock the PDV.
    try {
      // Offline → straight to the local queue, no server round-trip.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveOffline(clientUuid)
        return
      }

      // Online → try the server. A network failure mid-request (action throws)
      // falls back to the queue; a business rejection (e.g. stock) is shown as-is.
      try {
        const result = await createSale({
          payment_method: paymentMethod,
          notes,
          items: rpcItems,
          client_uuid: clientUuid,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Venda registrada com sucesso!')
        router.push(`/vendas/${result.saleId}`)
      } catch {
        // Lost connection while submitting — don't drop the sale, queue it.
        await saveOffline(clientUuid)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Persist the current cart as an offline sale and show the confirmation. */
  async function saveOffline(clientUuid: string) {
    if (!paymentMethod) return
    try {
      await queueSale({
        client_uuid: clientUuid,
        payment_method: paymentMethod,
        notes,
        total,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          name: item.product.name,
          unit_price: item.product.sale_price,
        })),
      })
    } catch {
      toast.error('Não foi possível salvar a venda offline.')
      return
    }

    const confirmation: OfflineSaleConfirmation = {
      total,
      paymentLabel:
        PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label ?? paymentMethod,
      items: cartItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
      })),
    }

    resetForm()
    setOfflineSale(confirmation)
    toast.success('Venda salva offline — será enviada ao reconectar.')
  }

  /** Print the provisional 80mm receipt for the offline sale on screen. */
  function handlePrintOffline() {
    if (!offlineSale) return
    const ok = printReceipt({
      items: offlineSale.items,
      total: offlineSale.total,
      paymentLabel: offlineSale.paymentLabel,
      provisional: true,
    })
    if (!ok) {
      toast.error('Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups.')
    }
  }

  /** Clear the form for the next sale. */
  function resetForm() {
    setCartItems([])
    setPaymentMethod('')
    setNotes('')
    setCashReceivedRaw('')
    setTriedSubmit(false)
  }

  // Keep the button clickable when the payment method is missing so the user
  // gets explicit feedback (toast + red border on the dropdown) instead of a
  // silent disabled button that doesn't explain why nothing happens.
  const canSubmit = !isSubmitting && cartItems.length > 0

  return (
    // pb-24 no mobile: garante que o conteúdo final do scroll não fique
    // escondido atrás da barra sticky de checkout (que mede ~80px).
    <div className="space-y-4 pb-24 lg:pb-0">
      {offlineSale && (
        <div className="relative rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setOfflineSale(null)}
            aria-label="Fechar"
            className="absolute right-3 top-3 text-amber-500 hover:text-amber-700"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-amber-900">
            <CloudOff className="h-5 w-5" />
            <p className="font-semibold">Venda salva offline</p>
          </div>
          <p className="mt-1 text-sm text-amber-800">
            Recibo provisório — será enviada ao servidor automaticamente quando a
            conexão voltar.
          </p>
          <div className="mt-3 rounded-lg bg-white/70 border border-amber-200 divide-y divide-amber-100 text-sm">
            {offlineSale.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-slate-700">
                  {item.quantity}× {item.name}
                </span>
                <span className="tabular-nums text-slate-600">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 font-semibold text-slate-900">
              <span>Total · {offlineSale.paymentLabel}</span>
              <span className="tabular-nums">{formatCurrency(offlineSale.total)}</span>
            </div>
          </div>
          <Button
            onClick={handlePrintOffline}
            variant="outline"
            className="mt-3 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimir recibo
          </Button>
        </div>
      )}

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
                  // Destaque grande do troco — o dono da loja pediu pra ser
                  // bem visível porque o operador precisa bater o olho e ver
                  // imediatamente quanto devolver. Fundo cheio (não translúcido)
                  // com cor vívida, valor em 4xl, label em caixa alta acima.
                  <div
                    className={
                      cashShort
                        ? 'rounded-xl bg-red-600 px-4 py-4 shadow-md shadow-red-900/10 text-white'
                        : 'rounded-xl bg-emerald-600 px-4 py-4 shadow-md shadow-emerald-900/10 text-white'
                    }
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                      {cashShort ? 'Falta receber' : 'Troco a devolver'}
                    </p>
                    <p className="text-4xl font-bold tabular-nums leading-tight mt-1">
                      {formatCurrency(Math.abs(change))}
                    </p>
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

      {/* Barra fixa de checkout (mobile only).
          O painel "Finalizar venda" do lado direito vira sticky no desktop
          (lg:sticky), mas no mobile fica longe — operador precisa scrollar
          muito pra confirmar. Esta barra mostra Total + Confirmar sempre
          visível embaixo. Reusa o mesmo handleSubmit, então toda a
          validação (carrinho vazio, método faltando, cash short) continua
          valendo e os toasts/erros aparecem normalmente. */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 py-3 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 leading-tight">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </p>
              <p className="text-lg font-bold tabular-nums text-slate-900 leading-tight">
                {formatCurrency(total)}
              </p>
            </div>
            <Button
              className="h-12 px-6 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shadow-sm disabled:opacity-50 transition-colors"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

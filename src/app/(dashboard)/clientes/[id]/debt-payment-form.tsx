'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { recordDebtPayment } from '../actions'

interface DebtPaymentFormProps {
  customerId: string
  customerName: string
  totalDebt: number
}

export function DebtPaymentForm({ customerId, customerName, totalDebt }: DebtPaymentFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amountRaw, setAmountRaw] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amount = amountRaw.trim() ? parseFloat(amountRaw.replace(',', '.')) : NaN
  const exceedsDebt = !Number.isNaN(amount) && amount > totalDebt
  const isValid = !Number.isNaN(amount) && amount > 0 && !exceedsDebt

  async function handleSubmit() {
    if (!isValid) {
      toast.error('Informe um valor válido.')
      return
    }
    setIsSubmitting(true)
    const result = await recordDebtPayment({ customerId, amount, notes: notes || undefined })
    setIsSubmitting(false)

    if (result.error) {
      toast.error('Erro ao registrar pagamento: ' + result.error)
      return
    }

    setOpen(false)
    setAmountRaw('')
    setNotes('')

    if (result.paymentId) {
      router.push(`/clientes/${customerId}/recibo-pagamento/${result.paymentId}`)
    } else {
      toast.success('Pagamento registrado!')
      router.refresh()
    }
  }

  return (
    <>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <DollarSign className="mr-1.5 h-4 w-4" />
        Registrar pagamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <div className="-mt-2 flex items-center justify-between">
          <p className="text-sm text-slate-500">{customerName}</p>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Débito: R$ {totalDebt.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="debt-amount" className="text-sm font-medium">
              Valor recebido <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                R$
              </span>
              <Input
                id="debt-amount"
                type="text"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value.replace(/[^\d,.]/g, ''))}
                placeholder="0,00"
                className={`pl-9 ${exceedsDebt ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoFocus
              />
            </div>
            {exceedsDebt && (
              <p className="text-xs text-red-500">
                Valor maior que o débito (R$ {totalDebt.toFixed(2).replace('.', ',')})
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="debt-notes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="debt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
              rows={2}
              className="resize-none"
            />
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Confirmar pagamento'
            )}
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}

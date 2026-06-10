'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendReportNow } from './actions'

/**
 * One-click button that emails the report of everything sold so far today to
 * all active recipients. Mirrors the daily cron but on demand (partial report).
 */
export function SendReportNow() {
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendReportNow()
      if (result.error) {
        toast.error(result.error)
        return
      }
      const sales = result.sales ?? 0
      const sentTo = result.sentTo ?? 0
      toast.success(
        `Relatório enviado para ${sentTo} ${sentTo === 1 ? 'destinatário' : 'destinatários'} · ${sales} ${sales === 1 ? 'venda' : 'vendas'} hoje.`,
      )
    })
  }

  return (
    <Button
      onClick={handleSend}
      disabled={isPending}
      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Send className="mr-1.5 h-4 w-4" />
      )}
      {isPending ? 'Enviando…' : 'Enviar agora'}
    </Button>
  )
}

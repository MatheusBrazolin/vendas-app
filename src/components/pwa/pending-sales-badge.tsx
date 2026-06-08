'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { getPendingCount, flushPendingSales } from '@/lib/offline/sales-repo'

/**
 * Header chip summarising the offline sales queue. Hidden when the queue is
 * empty. Shows how many sales are waiting to sync and how many were rejected
 * by the server (e.g. stock sold out elsewhere) and need manual review.
 *
 * Clicking it triggers an immediate flush — handy when the user knows they're
 * back online and doesn't want to wait for the next automatic trigger.
 *
 * Keeps itself fresh by listening for the `pendingsaleschange` event (emitted
 * when a sale is queued or the queue is flushed) plus the `online` event.
 */
export function PendingSalesBadge() {
  const [counts, setCounts] = useState({ pending: 0, failed: 0 })
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(() => {
    getPendingCount()
      .then(setCounts)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener('pendingsaleschange', onChange)
    window.addEventListener('online', onChange)
    return () => {
      window.removeEventListener('pendingsaleschange', onChange)
      window.removeEventListener('online', onChange)
    }
  }, [refresh])

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      const { synced, failed } = await flushPendingSales()
      if (synced > 0) {
        toast.success(
          `${synced} ${synced === 1 ? 'venda enviada' : 'vendas enviadas'} ao servidor.`,
        )
      }
      if (failed > 0) {
        toast.error(
          `${failed} ${failed === 1 ? 'venda rejeitada' : 'vendas rejeitadas'} (ex.: estoque). Revise em Vendas.`,
        )
      }
      if (synced === 0 && failed === 0 && navigator.onLine) {
        toast.info('Nada para sincronizar no momento.')
      }
      window.dispatchEvent(new Event('pendingsaleschange'))
    } finally {
      setSyncing(false)
      refresh()
    }
  }

  const { pending, failed } = counts
  if (pending === 0 && failed === 0) return null

  const hasFailed = failed > 0
  const label = hasFailed
    ? `${failed} ${failed === 1 ? 'rejeitada' : 'rejeitadas'}`
    : `${pending} ${pending === 1 ? 'pendente' : 'pendentes'}`

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      title="Vendas offline aguardando envio — clique para sincronizar agora"
      className={
        hasFailed
          ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60'
          : 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-60'
      }
    >
      {syncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : hasFailed ? (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      )}
      <span>{label}</span>
      {/* When there are both, surface the secondary count too. */}
      {hasFailed && pending > 0 && (
        <span className="text-red-500">· {pending} na fila</span>
      )}
    </button>
  )
}

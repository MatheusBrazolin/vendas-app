'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { getLastSync } from '@/lib/offline/sync'

interface SyncStatusProps {
  /** Which sync entity to display. Defaults to products (the PDV's main concern). */
  entity?: 'products' | 'categories'
}

interface State {
  lastSyncAt: string | null
  count: number
}

/**
 * Compact heads-up showing how fresh the local product cache is. Mounted
 * near the PDV search input so the cashier can tell if they're working
 * with very stale data.
 *
 * Re-checks Dexie every 60s — sync writes happen elsewhere (SyncProvider),
 * but polling is the simplest way to react to them across components
 * without wiring an event bus.
 */
export function SyncStatus({ entity = 'products' }: SyncStatusProps) {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const meta = await getLastSync(entity)
        if (!alive) return
        setState({ lastSyncAt: meta?.lastSyncAt ?? null, count: meta?.count ?? 0 })
      } catch {
        if (alive) setState({ lastSyncAt: null, count: 0 })
      }
    }
    void tick()
    const id = window.setInterval(tick, 60_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [entity])

  if (!state) return null

  const { lastSyncAt, count } = state

  // Never synced — first load with no network, or fresh install.
  if (!lastSyncAt) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
        <AlertCircle className="h-3 w-3" aria-hidden />
        <span>Cache vazio — conecte-se para sincronizar</span>
      </div>
    )
  }

  const ageMs = Date.now() - new Date(lastSyncAt).getTime()
  const fresh = ageMs < 5 * 60_000 // under 5 minutes

  return (
    <div
      className={
        fresh
          ? 'inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1'
          : 'inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1'
      }
      title={`Última sincronização: ${new Date(lastSyncAt).toLocaleString('pt-BR')}`}
    >
      {fresh ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
      ) : (
        <RefreshCw className="h-3 w-3 text-slate-500" aria-hidden />
      )}
      <span>
        {count} produtos · atualizado {formatRelative(ageMs)}
      </span>
    </div>
  )
}

/** Render a coarse "há X minutos / horas / dias" — keeps the chip terse. */
function formatRelative(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

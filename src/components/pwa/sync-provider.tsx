'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { syncAll } from '@/lib/offline/sync'
import { flushPendingSales } from '@/lib/offline/sales-repo'

/**
 * Background sync orchestrator. Mounted once in the dashboard layout — only
 * runs for authenticated users (the auth layout doesn't mount it) since the
 * Supabase queries would 401 anyway without a session.
 *
 * On each trigger it (1) refreshes the read cache (products/categories) and
 * (2) flushes any sales queued offline back to the server.
 *
 * Triggers:
 *   - On mount, if the browser is online.
 *   - On the `online` event, when the user transitions from offline → online.
 *   - On `visibilitychange`, when the user refocuses the tab/PWA after it
 *     was in the background (cheap way to keep long-running PWAs fresh).
 *   - On a periodic interval, so the Electron desktop shell (which keeps a
 *     single window focused for hours) still picks up stock changes made
 *     from other devices/sessions.
 *
 * All failures are swallowed and logged — sync is best-effort and the app
 * must keep working when it can't talk to Supabase.
 */
const PERIODIC_SYNC_MS = 60_000
export function SyncProvider() {
  useEffect(() => {
    // Refresh the read cache FIRST, then drain the write queue. Ordering
    // matters: syncAll rewrites local stock from the server, so running it
    // after a flush (instead of before) could clobber the authoritative
    // values the flush just pulled. flushPendingSales re-syncs internally too.
    const run = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return

      try {
        const result = await syncAll()
        if ('error' in result.products || 'error' in result.categories || 'error' in result.customers) {
          console.warn('[sync] partial failure', result)
        }
      } catch (err) {
        console.error('[sync] failed', err)
      }

      try {
        const { synced, failed } = await flushPendingSales()
        if (synced > 0) {
          toast.success(
            `${synced} ${synced === 1 ? 'venda enviada' : 'vendas enviadas'} ao servidor.`,
          )
        }
        if (failed > 0) {
          toast.error(
            `${failed} ${failed === 1 ? 'venda offline foi rejeitada' : 'vendas offline foram rejeitadas'} (ex.: estoque). Revise em Vendas.`,
          )
        }
        if (synced > 0 || failed > 0) {
          window.dispatchEvent(new Event('pendingsaleschange'))
        }
      } catch (err) {
        console.error('[sync] flush failed', err)
      }
    }

    run()

    const onOnline = () => run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(run, PERIODIC_SYNC_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [])

  return null
}

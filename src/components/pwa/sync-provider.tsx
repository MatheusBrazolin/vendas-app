'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { syncAll } from '@/lib/offline/sync'
import { flushPendingSales } from '@/lib/offline/sales-repo'

/**
 * Background sync orchestrator. Mounted once in the dashboard layout — only
 * runs for authenticated users (the auth layout doesn't mount it) since the
 * Supabase queries would 401 anyway without a session.
 *
 * On each trigger it:
 *   1. Calls POST /api/sync to pull Supabase → SQLite (Electron server-side cache).
 *   2. Refreshes the IndexedDB read cache (products/categories/customers).
 *   3. Flushes any sales queued offline back to the server.
 *   4. Calls router.refresh() when transitioning from offline → online so
 *      server-rendered pages pick up fresh data from SQLite/Supabase.
 *
 * Triggers:
 *   - On mount, if the browser is online.
 *   - On the `online` event (offline → online transition).
 *   - On `visibilitychange`, when the user refocuses the tab/PWA.
 *   - On a periodic interval (Electron keeps a single window open for hours).
 *
 * All failures are swallowed — sync is best-effort and the app must keep
 * working when it can't talk to Supabase.
 */
const PERIODIC_SYNC_MS = 60_000

/**
 * Calls the server-side SQLite sync endpoint (Electron only).
 * Returns true if the server pulled fresh data from Supabase.
 */
async function runServerSync(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', { method: 'POST' })
    if (res.status === 404) return false // not Electron, skip silently
    const body = await res.json() as { pulled?: boolean; error?: string }
    if (body.error) console.warn('[server-sync] error:', body.error)
    return body.pulled === true
  } catch (err) {
    console.error('[server-sync] fetch failed', err)
    return false
  }
}

export function SyncProvider() {
  const router = useRouter()
  // Tracks whether the previous run was offline so we know when the
  // connection is restored and should refresh server-rendered pages.
  const wasOfflineRef = useRef(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )

  useEffect(() => {
    const run = async (triggeredByOnlineEvent = false) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        wasOfflineRef.current = true
        return
      }

      const comingBackOnline = wasOfflineRef.current || triggeredByOnlineEvent
      wasOfflineRef.current = false

      // When coming back online, wait 1s for the network to stabilise before
      // hitting Supabase — avoids a race where the OS reports "online" but DNS
      // resolution / TLS handshake hasn't completed yet.
      if (comingBackOnline) {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }

      // 1. Server-side SQLite sync (Electron: populates offline cache).
      //    Run in parallel with the IndexedDB sync for speed.
      const [serverPulled] = await Promise.all([
        runServerSync(),
        syncAll().catch((err: unknown) => {
          console.error('[sync] IndexedDB sync failed', err)
          return null
        }),
      ])

      // 2. Refresh server-rendered pages so they re-query Supabase with
      //    fresh data (or the newly-populated SQLite cache when offline).
      if (comingBackOnline || serverPulled) {
        router.refresh()
        if (comingBackOnline) {
          toast.success('Conexão restaurada. Dados atualizados.')
        }
      }

      // 3. Flush offline sales queue → Supabase.
      try {
        const { synced, failed } = await flushPendingSales()
        if (synced > 0) {
          toast.success(
            `${synced} ${synced === 1 ? 'venda offline enviada' : 'vendas offline enviadas'} ao servidor.`,
          )
          router.refresh()
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

    const onOnline = () => run(true)
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
  }, [router])

  return null
}

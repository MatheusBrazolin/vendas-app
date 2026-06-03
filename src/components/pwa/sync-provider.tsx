'use client'

import { useEffect } from 'react'
import { syncAll } from '@/lib/offline/sync'

/**
 * Background sync orchestrator. Mounted once in the dashboard layout — only
 * runs for authenticated users (the auth layout doesn't mount it) since the
 * Supabase queries would 401 anyway without a session.
 *
 * Triggers:
 *   - On mount, if the browser is online.
 *   - On the `online` event, when the user transitions from offline → online.
 *   - On `visibilitychange`, when the user refocuses the tab/PWA after it
 *     was in the background (cheap way to keep long-running PWAs fresh).
 *
 * All failures are swallowed and logged — sync is best-effort and the app
 * must keep working when it can't talk to Supabase.
 */
export function SyncProvider() {
  useEffect(() => {
    const run = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      syncAll()
        .then((result) => {
          // Surface partial failures in dev so they don't fail silently;
          // production users see no console noise unless they look.
          if ('error' in result.products || 'error' in result.categories) {
            console.warn('[sync] partial failure', result)
          }
        })
        .catch((err) => {
          console.error('[sync] failed', err)
        })
    }

    run()

    const onOnline = () => run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}

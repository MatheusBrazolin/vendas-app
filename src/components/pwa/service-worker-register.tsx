'use client'

import { useEffect } from 'react'

/**
 * Registers `/sw.js` on the client when the browser supports Service Workers.
 *
 * Rendered once at the root layout. Idempotent — calling `register` again
 * with the same script URL is a no-op if the SW is already controlling
 * the page.
 *
 * `updateViaCache: 'none'` tells the browser to fetch the SW script
 * itself without using the HTTP cache, so a new deploy of `sw.js` is
 * picked up on the next page load instead of after the cache expires.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // The SW must NOT run in development: it caches chunks/RSC payloads, and
    // Turbopack/HMR serve fresh-but-same-URL assets constantly — a cached copy
    // corrupts the React Server Components stream (e.g. "enqueueModel is not a
    // function", "Connection closed"). Unregister any leftover SW and drop our
    // caches so a dev session is always clean.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
      if (window.caches) {
        caches.keys().then((keys) =>
          keys.forEach((k) => {
            if (k.startsWith('vendasapp-')) caches.delete(k)
          }),
        )
      }
      return
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => {
          // Don't surface to the user — install prompt simply won't appear.
          // Logging makes the failure debuggable in the console.
          console.error('Service worker registration failed:', err)
        })
    }

    // Defer until after first paint so the SW install doesn't compete with
    // the main thread during the critical initial render.
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}

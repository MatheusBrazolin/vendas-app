/**
 * VendasApp service worker — Phase 2 (shell cache).
 *
 * Caches the static assets that make up the app shell so the PWA can boot
 * even with no network. Combined with the IndexedDB layer in
 * src/lib/offline/*, this lets an installed copy open offline and read
 * the last-synced products/categories.
 *
 * Strategy:
 *   - `/_next/static/*` and same-origin static files (icons, manifest):
 *     cache-first. Next.js fingerprints these so they're safe to keep
 *     forever; new deploys produce new URLs.
 *   - HTML/navigation requests (mode === 'navigate'): network-first with
 *     cache fallback. Falling back to the last cached HTML keeps the app
 *     loadable offline; when online we always serve the fresh page.
 *   - Anything cross-origin (Supabase, Vercel analytics): pass through
 *     without touching the cache — those responses are user-scoped and
 *     / or rate-limited and we don't want to second-guess them.
 *   - Non-GET requests (POST/PATCH/DELETE): pass through. Caching writes
 *     would obviously break things.
 *
 * Bump SW_VERSION whenever this file changes meaningfully so existing
 * installs activate a fresh cache and drop the previous version.
 */

const SW_VERSION = 'v2-2026-05-29'
const SHELL_CACHE = `vendasapp-shell-${SW_VERSION}`

self.addEventListener('install', (event) => {
  // Activate this SW immediately instead of waiting for all old tabs to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every cache that isn't the current version. Prevents old
      // shells from lingering after a deploy and silently shadowing the
      // fresh assets.
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('vendasapp-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Cross-origin — never touch. Supabase auth/data and any analytics calls
  // must hit the network with their own credentials and headers.
  if (url.origin !== self.location.origin) return

  // Static assets: cache-first. These are content-hashed by Next.js (or
  // versioned in their filenames for our PWA icons) so stale-forever is safe.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation requests (HTML): network-first with cache fallback so the
  // user gets fresh server-rendered content when online and the last-seen
  // HTML when offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Other same-origin GETs (manifest, robots.txt, etc.): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request))
})

function isStaticAsset(pathname) {
  if (pathname.startsWith('/_next/static/')) return true
  // PWA icons + manifest + any image we ship in /public.
  return /\.(?:png|svg|webp|ico|jpg|jpeg|webmanifest|woff2?|ttf)$/.test(pathname)
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    // Last resort — bubble the error so the browser shows its usual offline UI.
    throw err
  }
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    // Only cache successful, basic (same-origin) responses. Skip redirects
    // and opaque responses — caching them confuses subsequent navigations.
    if (response.ok && response.type === 'basic') {
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)
  return cached || networkPromise
}

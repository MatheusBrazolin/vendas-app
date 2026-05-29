/**
 * VendasApp service worker — Phase 2 (shell cache + offline fallback).
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
 *     cache fallback. If both fail (offline AND never visited the route
 *     before), serve the precached `/offline.html` so the user gets a
 *     branded "you're offline" page instead of Chrome's ERR_FAILED.
 *   - Anything cross-origin (Supabase, Vercel analytics): pass through
 *     without touching the cache — those responses are user-scoped and
 *     / or rate-limited and we don't want to second-guess them.
 *   - Non-GET requests (POST/PATCH/DELETE): pass through. Caching writes
 *     would obviously break things.
 *
 * Bump SW_VERSION whenever this file changes meaningfully so existing
 * installs activate a fresh cache and drop the previous version.
 */

const SW_VERSION = 'v3-2026-05-29'
const SHELL_CACHE = `vendasapp-shell-${SW_VERSION}`

/**
 * URLs that must be cached at install time so they're always available
 * offline, even before the user has navigated to them. Kept minimal —
 * just the offline fallback page and the brand icons used inside it.
 */
const PRECACHE_URLS = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // `addAll` is atomic — if any URL fails, the whole install fails and
      // we won't activate a half-broken SW. Use `Promise.all` of individual
      // adds to make the offline fallback resilient even if an icon 404s.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: 'reload' }))
            .catch((err) => console.warn(`[sw] precache failed for ${url}`, err)),
        ),
      )
      // Activate this SW immediately instead of waiting for all old tabs to close.
      await self.skipWaiting()
    })(),
  )
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
  // HTML when offline. Last-resort fallback is the branded offline page.
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
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
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/**
 * Navigation handler — tries network first, falls back to the page's own
 * cache entry, then to /offline.html. The offline.html fallback is the
 * crucial layer that prevents ERR_FAILED on routes the user hasn't visited
 * before going offline.
 */
async function navigationHandler(request) {
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
    const offline = await cache.match('/offline.html')
    if (offline) return offline
    // Truly nothing to serve — bubble up so Chrome shows its default error.
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

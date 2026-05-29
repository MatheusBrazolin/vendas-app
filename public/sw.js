/**
 * VendasApp service worker — Phase 1.
 *
 * The minimum required for Chrome/Edge to surface the "Install" prompt is
 * a registered SW with a `fetch` handler. This SW intentionally does NOT
 * cache anything yet — that's the job of Phase 2 (offline reads). All it
 * does today is install/activate cleanly and pass fetches through.
 *
 * `skipWaiting` + `clients.claim` make a fresh SW take over open tabs on
 * the next reload, so users on an old version don't get stuck.
 */

self.addEventListener('install', (event) => {
  // Activate this SW as soon as it's installed, replacing any older one.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  // Take control of all open clients (tabs) immediately.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Pass-through: Chrome requires a `fetch` listener to be registered for
  // the install prompt, but we intentionally don't intercept anything yet.
})

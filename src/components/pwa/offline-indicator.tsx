'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Small floating chip that appears in the bottom-right corner whenever the
 * browser reports `navigator.onLine === false`. Hidden entirely when online
 * so it doesn't take up space in the happy path.
 *
 * `navigator.onLine` is a coarse signal — it flips when the OS loses its
 * network interface, but a misconfigured DNS or a captive portal can still
 * say "online" while requests fail. Good enough for a heads-up indicator
 * though, and far cheaper than a periodic health ping.
 */
export function OfflineIndicator() {
  // Default to `true` to avoid a flash of the chip during SSR/hydration.
  // The first effect tick corrects it from `navigator.onLine`.
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-orange-600 text-white px-3 py-1.5 text-xs font-medium shadow-lg shadow-orange-900/20 ring-1 ring-orange-700/30"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      <span>Você está offline — usando dados em cache.</span>
    </div>
  )
}

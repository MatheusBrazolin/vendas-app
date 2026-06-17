'use client'

import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  message?: string
}

export function OfflineBanner({
  message = 'Você está offline. Dados podem estar desatualizados.',
}: OfflineBannerProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

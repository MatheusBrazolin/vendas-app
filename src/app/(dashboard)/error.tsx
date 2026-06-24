'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Algo deu errado
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ocorreu um erro inesperado nesta página.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  )
}

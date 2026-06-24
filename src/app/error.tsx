'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Algo deu errado
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
          </p>
        </div>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-5">
        <p className="text-8xl font-extrabold text-primary/20 select-none">404</p>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Página não encontrada
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O endereço que você acessou não existe ou foi movido.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  )
}

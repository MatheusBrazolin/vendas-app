import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Espelha produtos/page.tsx: cabeçalho + barra de filtros + tabela paginada.
export default function ProdutosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <Skeleton className="h-10 sm:col-span-5" />
          <Skeleton className="h-10 sm:col-span-3" />
          <Skeleton className="h-10 sm:col-span-2" />
          <Skeleton className="h-10 sm:col-span-2" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}

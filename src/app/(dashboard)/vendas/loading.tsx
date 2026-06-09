import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Espelha vendas/page.tsx: cabeçalho + botões + tabela paginada.
export default function VendasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  )
}

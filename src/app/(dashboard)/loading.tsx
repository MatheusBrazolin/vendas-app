import { Skeleton } from '@/components/ui/skeleton'

// Fallback genérico de navegação para qualquer rota do dashboard que não tenha
// um loading.tsx próprio (detalhe de venda, configurações, etc). O Next mostra
// isso instantaneamente ao clicar num link, enquanto o Server Component da rota
// busca os dados — a tela nunca fica "congelada" esperando o servidor.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

interface SalesFiltersProps {
  payment: string
  from: string
  to: string
  hasFilters: boolean
}

/**
 * Filtros da página de Vendas — aplicam direto no onChange (sem botão
 * "Filtrar"). Cada mudança escreve na URL via router.push e o server
 * component pai re-renderiza com os novos searchParams. Usa useTransition
 * pra mostrar um spinner discreto enquanto a página recarrega, sem travar
 * o input.
 */
export function SalesFilters({ payment, from, to, hasFilters }: SalesFiltersProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function update(key: 'payment' | 'from' | 'to', value: string) {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    // Trocar qualquer filtro reseta a paginação — senão a página atual
    // pode ficar vazia (ex: filtro reduz de 10 páginas pra 2 e estávamos na 5).
    next.delete('page')
    startTransition(() => router.push(`/vendas?${next.toString()}`))
  }

  return (
    <div className="p-4 border-b border-slate-100 relative">
      {/* Grid em 12 colunas mantém os 3 campos do mesmo tamanho (col-span-4)
          e o botão de limpar pequeno na ponta. Cada campo tem label acima
          pra ficar visualmente alinhado e claro. */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Pagamento
          </label>
          <select
            value={payment}
            onChange={(e) => update('payment', e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 disabled:opacity-60"
            aria-label="Método de pagamento"
          >
            <option value="">Todos</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="credit">Crédito</option>
            <option value="debit">Débito</option>
          </select>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => update('from', e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 disabled:opacity-60"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => update('to', e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 disabled:opacity-60"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{isPending ? 'Aplicando...' : 'Filtros ativos'}</span>
          <Link
            href="/vendas"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Link>
        </div>
      )}

      {/* Spinner discreto no canto durante a transição — mostra que algo
          tá acontecendo sem deslocar layout. */}
      {isPending && !hasFilters && (
        <Loader2 className="absolute right-4 top-4 h-4 w-4 animate-spin text-slate-400" />
      )}
    </div>
  )
}

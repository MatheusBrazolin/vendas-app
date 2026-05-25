'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Search, Plus, ScanBarcode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/format'
import { useDebounce } from '@/lib/utils/use-debounce'
import type { Product, CartItem } from '@/types/database'

interface ProductSearchProps {
  onAdd: (item: CartItem) => void
}

export function ProductSearch({ onAdd }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Auto-focus the input on mount so the USB scanner can write directly into it
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fuzzy search for manual typing (does NOT auto-add — just shows the dropdown)
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .or(`name.ilike.%${debouncedQuery}%,code.ilike.%${debouncedQuery}%`)
      .limit(10)
      .then(({ data }) => {
        setResults(data ?? [])
        setLoading(false)
      })
  }, [debouncedQuery])

  function handleAdd(product: Product) {
    onAdd({ product, quantity: 1 })
    setQuery('')
    setResults([])
    // Return focus to the input so the next scan/search keeps flowing
    inputRef.current?.focus()
  }

  // Scanner workflow: USB readers type the code + Enter.
  // On Enter, we try an EXACT code match and auto-add to the cart.
  async function handleScanLookup(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return

    setScanning(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('code', trimmed)
      .eq('is_active', true)
      .maybeSingle()
    setScanning(false)

    if (error) {
      toast.error('Erro ao buscar produto. Tente novamente.')
      return
    }

    if (!data) {
      toast.error(`Produto não encontrado: ${trimmed}`)
      // Keep the value so the user can correct it
      inputRef.current?.select()
      return
    }

    if (data.stock_quantity <= 0) {
      toast.error(`Sem estoque: ${data.name}`)
      inputRef.current?.select()
      return
    }

    handleAdd(data)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Read directly from the input — avoids any state lag from fast scanners
      void handleScanLookup(e.currentTarget.value)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aponte o leitor ou digite o nome / código..."
          className="pl-9 pr-10 h-11 text-sm"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      <p className="text-[11px] text-slate-400 px-1">
        Pressione <kbd className="px-1 py-0.5 border border-slate-200 rounded text-[10px] bg-slate-50">Enter</kbd> para
        adicionar pelo código exato (scanner) ou clique em um resultado da lista.
      </p>

      {(loading || scanning) && (
        <p className="text-xs text-slate-400 px-1">
          {scanning ? 'Lendo código...' : 'Buscando...'}
        </p>
      )}

      {results.length > 0 && (
        <div className="border rounded-lg divide-y bg-white shadow-sm">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-slate-500">
                  Cód: {product.code} · Estoque: {product.stock_quantity} ·{' '}
                  {formatCurrency(product.sale_price)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-3 shrink-0"
                onClick={() => handleAdd(product)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
          ))}
        </div>
      )}

      {!loading && !scanning && query && results.length === 0 && (
        <p className="text-sm text-slate-400 px-1">Nenhum produto encontrado em estoque.</p>
      )}
    </div>
  )
}

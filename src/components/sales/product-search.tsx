'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Minus, ScanBarcode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import { useDebounce } from '@/hooks/use-debounce'
import {
  searchProducts,
  getByCode,
  ensureProductsCached,
} from '@/lib/offline/products-repo'
import type { Product, CartItem } from '@/types/database'

interface ProductSearchProps {
  onAdd: (item: CartItem) => void
}

export function ProductSearch({ onAdd }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  /** Quantity chosen per product before clicking "Adicionar". */
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Auto-focus the input on mount so the USB scanner can write directly into it.
  // Also warm the local cache so the PDV isn't blank on a fresh first load.
  useEffect(() => {
    inputRef.current?.focus()
    void ensureProductsCached()
  }, [])

  // Fuzzy search for manual typing (does NOT auto-add — just shows the dropdown).
  // Reads from the offline cache so it works identically online and offline.
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    searchProducts(debouncedQuery)
      .then((data) => {
        if (cancelled) return
        setResults(data)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  function getQuantity(product: Product): number {
    return quantities[product.id] ?? 1
  }

  function setQuantity(product: Product, value: number) {
    const clamped = Math.max(1, Math.min(product.stock_quantity, Math.floor(value) || 1))
    setQuantities((prev) => ({ ...prev, [product.id]: clamped }))
  }

  function handleAdd(product: Product, quantity: number) {
    if (quantity > product.stock_quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${product.stock_quantity}`)
      return
    }
    onAdd({ product, quantity })
    setQuery('')
    setResults([])
    setQuantities({})
    // Return focus to the input so the next scan/search keeps flowing
    inputRef.current?.focus()
  }

  /**
   * Scanner workflow: USB readers type the code + Enter.
   * On Enter we try an EXACT code match and auto-add ONE unit to the cart.
   *
   * Only called when the input looks like a numeric barcode — searching by
   * name does NOT route through here, so the user never sees a misleading
   * "produto não encontrado" toast when typing a product name.
   */
  async function handleBarcodeLookup(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return

    setScanning(true)
    let data: Product | null = null
    try {
      data = await getByCode(trimmed)
    } catch {
      setScanning(false)
      toast.error('Erro ao buscar produto. Tente novamente.')
      return
    }
    setScanning(false)

    if (!data) {
      toast.error(`Código não encontrado: ${trimmed}`)
      inputRef.current?.select()
      return
    }

    if (data.stock_quantity <= 0) {
      toast.error(`Sem estoque: ${data.name}`)
      inputRef.current?.select()
      return
    }

    handleAdd(data, 1)
  }

  /** A pure-digit string of 4+ chars is treated as a barcode/SKU. */
  function looksNumeric(value: string): boolean {
    return /^\d{4,}$/.test(value.trim())
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = e.currentTarget.value.trim()
    if (!value) return

    // Barcode-shaped input: scanner flow → exact match + auto-add 1
    if (looksNumeric(value)) {
      void handleBarcodeLookup(value)
      return
    }

    // Name-shaped input: if the dropdown narrowed to a single product, add it.
    // Otherwise just let the user pick from the list — never show "not found".
    if (results.length === 1) {
      const product = results[0]
      handleAdd(product, getQuantity(product))
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
          placeholder="Bipe o código de barras OU digite o nome do produto..."
          className="pl-9 pr-10 h-11 text-sm"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      <div className="px-1 space-y-1 text-[11px] text-slate-400">
        <p>
          <ScanBarcode className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-400" />
          <strong className="text-slate-600">Com código:</strong> bipe o leitor — adiciona 1 unidade no carrinho.
        </p>
        <p>
          <Search className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-400" />
          <strong className="text-slate-600">Sem código:</strong> digite o nome, ajuste a quantidade e clique em <strong>Adicionar</strong>.
        </p>
      </div>

      {(loading || scanning) && (
        <p className="text-xs text-slate-400 px-1">
          {scanning ? 'Lendo código...' : 'Buscando...'}
        </p>
      )}

      {results.length > 0 && (
        <div className="border rounded-lg divide-y bg-white shadow-sm">
          {results.map((product) => {
            const qty = getQuantity(product)
            return (
              <div
                key={product.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    Cód: {product.code} · Estoque: {product.stock_quantity} ·{' '}
                    {formatCurrency(product.sale_price)}
                  </p>
                </div>

                {/* No mobile o bloco vira coluna do pai (flex-col) e os
                    controles ocupam toda a largura do card — botão "Adicionar"
                    grande, fácil de tocar. No desktop fica compacto na lateral. */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <div className="inline-flex items-center rounded-md border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(product, qty - 1)}
                      disabled={qty <= 1}
                      className="h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.stock_quantity}
                      value={qty}
                      onChange={(e) =>
                        setQuantity(product, parseInt(e.target.value, 10) || 1)
                      }
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-12 h-9 text-center text-sm font-medium tabular-nums bg-white border-x border-slate-200 focus:outline-none focus:bg-blue-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Quantidade"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(product, qty + 1)}
                      disabled={qty >= product.stock_quantity}
                      className="h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    className="flex-1 sm:flex-initial h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    onClick={() => handleAdd(product, qty)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !scanning && query && results.length === 0 && (
        <p className="text-sm text-slate-400 px-1">Nenhum produto encontrado em estoque.</p>
      )}
    </div>
  )
}

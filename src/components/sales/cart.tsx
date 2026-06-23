'use client'

import { useState, useRef } from 'react'
import { Minus, Plus, Trash2, ShoppingCart, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/format'
import type { CartItem } from '@/types/database'

interface CartProps {
  items: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onUpdatePrice: (productId: string, price: number) => void
  onRemove: (productId: string) => void
}

export function Cart({ items, onUpdateQty, onUpdatePrice, onRemove }: CartProps) {
  const total = items.reduce(
    (sum, item) => sum + (item.customPrice ?? item.product.sale_price) * item.quantity,
    0,
  )

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRaw, setEditRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(item: CartItem) {
    setEditingId(item.product.id)
    setEditRaw(
      (item.customPrice ?? item.product.sale_price).toFixed(2).replace('.', ','),
    )
    setTimeout(() => inputRef.current?.select(), 30)
  }

  function commitEdit(productId: string) {
    const parsed = parseFloat(editRaw.replace(',', '.'))
    if (!isNaN(parsed) && parsed > 0) {
      onUpdatePrice(productId, parsed)
    }
    setEditingId(null)
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum produto adicionado</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const effectivePrice = item.customPrice ?? item.product.sale_price
        const isPriceOverridden =
          item.customPrice !== undefined &&
          item.customPrice !== item.product.sale_price
        const isEditing = editingId === item.product.id

        return (
          <div
            key={item.product.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-white/8 bg-white dark:bg-slate-800/60"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{item.product.name}</p>

              <div className="flex items-center gap-1 mt-0.5">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">R$</span>
                    <Input
                      ref={inputRef}
                      type="text"
                      inputMode="decimal"
                      value={editRaw}
                      onChange={(e) =>
                        setEditRaw(e.target.value.replace(/[^\d,.]/g, ''))
                      }
                      onBlur={() => commitEdit(item.product.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(item.product.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="h-6 w-24 text-xs px-1.5 py-0 border-primary/60 focus-visible:ring-1 focus-visible:ring-blue-400"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        commitEdit(item.product.id)
                      }}
                      className="text-primary hover:text-primary/80"
                      aria-label="Confirmar preço"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs ${isPriceOverridden ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}
                    >
                      {formatCurrency(effectivePrice)}
                      {isPriceOverridden && (
                        <span className="ml-1 line-through text-slate-400 font-normal">
                          {formatCurrency(item.product.sale_price)}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-slate-300 hover:text-primary/80 transition-colors"
                      aria-label={`Editar preço de ${item.product.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {!isEditing && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    · subtotal:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(effectivePrice * item.quantity)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9"
                onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 sm:h-9 sm:w-9"
                onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                disabled={item.quantity >= item.product.stock_quantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-9 sm:w-9 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
              onClick={() => onRemove(item.product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-white/8">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

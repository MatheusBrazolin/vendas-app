'use client'

import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import type { CartItem } from '@/types/database'

interface CartProps {
  items: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
}

export function Cart({ items, onUpdateQty, onRemove }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.sale_price * item.quantity, 0)

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
      {items.map((item) => (
        <div
          key={item.product.id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-white"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.product.name}</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(item.product.sale_price)} · subtotal:{' '}
              <span className="font-medium text-slate-700">
                {formatCurrency(item.product.sale_price * item.quantity)}
              </span>
            </p>
          </div>

          {/* h-9 (36px) é o mínimo pra toque confortável em dedo de iPhone
              sem virar gigante no desktop. Antes (h-7 = 28px) era difícil
              de acertar com o polegar. */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
              disabled={item.quantity >= item.product.stock_quantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={() => onRemove(item.product.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-3 mt-3 border-t">
        <span className="font-semibold text-slate-700">Total</span>
        <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

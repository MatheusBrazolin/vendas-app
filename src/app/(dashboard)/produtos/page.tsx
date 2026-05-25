import Link from 'next/link'
import { Plus, Package, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductActions } from '@/components/products/product-actions'
import { getProducts } from '@/lib/queries/products'
import { formatCurrency } from '@/lib/utils/format'

type StockStatus = 'out' | 'low' | 'ok'

function getStockStatus(stock: number, min: number): StockStatus {
  if (stock <= 0) return 'out'
  if (stock <= min) return 'low'
  return 'ok'
}

function StockBadge({ status, quantity, min }: { status: StockStatus; quantity: number; min: number }) {
  const styles: Record<StockStatus, string> = {
    out: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
    low: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    ok: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/15',
  }
  const dotStyles: Record<StockStatus, string> = {
    out: 'bg-red-500',
    low: 'bg-amber-500',
    ok: 'bg-green-500',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${styles[status]}`}
      title={`Estoque mínimo: ${min}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {quantity} {quantity === 1 ? 'un' : 'un'}
    </span>
  )
}

function computeMargin(sale: number, cost: number): { pct: number; absolute: number } | null {
  if (!sale || sale <= 0) return null
  const absolute = sale - cost
  const pct = (absolute / sale) * 100
  return { pct, absolute }
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const products = await getProducts(q)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
            {q ? ` para "${q}"` : ''}
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Link href="/produtos/novo">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <form className="flex-1">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nome ou código..."
                className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-md text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-colors"
              />
            </div>
          </form>
          <Button
            variant="outline"
            type="button"
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 h-11">
                  Código
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Produto
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Categoria
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Custo
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Venda
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">
                  Margem
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">
                  Estoque
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 mt-1">
                        Nenhum produto encontrado
                      </p>
                      <p className="text-xs text-slate-400">
                        {q
                          ? 'Tente ajustar a busca ou cadastre um novo produto.'
                          : 'Comece cadastrando seu primeiro produto.'}
                      </p>
                      <Button asChild size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700">
                        <Link href="/produtos/novo">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Cadastrar produto
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, idx) => {
                  const status = getStockStatus(product.stock_quantity, product.min_stock)
                  const margin = computeMargin(product.sale_price, product.cost_price)

                  return (
                    <TableRow
                      key={product.id}
                      className={`border-slate-100 hover:bg-slate-50/70 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : ''
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-slate-500">
                        {product.code}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {product.categories ? (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-normal"
                          >
                            {product.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-500 tabular-nums">
                        {formatCurrency(product.cost_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                        {formatCurrency(product.sale_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {margin ? (
                          <span
                            className={
                              margin.pct >= 30
                                ? 'text-green-700 font-medium'
                                : margin.pct >= 10
                                  ? 'text-slate-700'
                                  : 'text-red-600 font-medium'
                            }
                          >
                            {margin.pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <StockBadge
                          status={status}
                          quantity={product.stock_quantity}
                          min={product.min_stock}
                        />
                      </TableCell>
                      <TableCell>
                        <ProductActions
                          productId={product.id}
                          productName={product.name}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

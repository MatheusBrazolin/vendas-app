import Link from 'next/link'
import { AlertTriangle, ArrowRight, PackageCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getLowStock } from '@/lib/queries/products'

export async function LowStockAlert() {
  const products = await getLowStock()

  if (products.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <PackageCheck className="h-4 w-4 text-green-600" />
            Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-md bg-green-50/60 border border-green-100 px-3 py-2.5">
            <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <PackageCheck className="h-3.5 w-3.5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Tudo em ordem</p>
              <p className="text-xs text-green-700/80">
                Nenhum produto abaixo do estoque mínimo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Estoque baixo
          </span>
          <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-amber-500 px-2 text-xs font-semibold text-white">
            {products.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {products.slice(0, 5).map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-amber-100/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{product.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-medium text-amber-700">{product.stock_quantity}</span>
                <span className="text-slate-400"> / mín. {product.min_stock}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            >
              <Link href={`/produtos/${product.id}`} aria-label={`Ver ${product.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
        {products.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
            asChild
          >
            <Link href="/produtos">Ver todos os {products.length} produtos</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

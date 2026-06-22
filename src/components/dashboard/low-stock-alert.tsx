import Link from 'next/link'
import { AlertTriangle, ArrowRight, PackageCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getLowStock } from '@/lib/queries/products'
import { tryQuery } from '@/lib/supabase/try-query'

export async function LowStockAlert() {
  const { data: products } = await tryQuery(() => getLowStock(), [])

  if (products.length === 0) {
    return (
      <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <PackageCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
            Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-md bg-green-50/60 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-3 py-2.5">
            <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
              <PackageCheck className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-300">Tudo em ordem</p>
              <p className="text-xs text-green-700/80 dark:text-green-400/80">
                Nenhum produto abaixo do estoque mínimo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200/80 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/8 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between text-amber-900 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Estoque baixo
          </span>
          <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-amber-500 px-2 text-xs font-semibold text-white">
            {products.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-y-auto max-h-48 px-6 pb-4 pt-1 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-amber-100/40 dark:hover:bg-amber-500/10 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{product.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-medium text-amber-700 dark:text-amber-400">{product.stock_quantity}</span>
                <span className="text-slate-400 dark:text-slate-500"> / mín. {product.min_stock}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              <Link href={`/produtos/${product.id}`} aria-label={`Ver ${product.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
        </div>
      </CardContent>
    </Card>
  )
}

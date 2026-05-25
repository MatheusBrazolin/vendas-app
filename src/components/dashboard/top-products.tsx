import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTopProducts } from '@/lib/queries/sales'
import { TrendingUp } from 'lucide-react'

const RANK_COLORS = [
  'bg-amber-400',
  'bg-slate-300',
  'bg-orange-300',
  'bg-slate-200',
  'bg-slate-200',
]

export async function TopProducts() {
  const products = await getTopProducts(5)

  if (products.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-4">Sem dados de vendas ainda.</p>
        </CardContent>
      </Card>
    )
  }

  const max = products[0].total

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map((product, index) => {
          const pct = max > 0 ? (product.total / max) * 100 : 0
          return (
            <div key={product.id} className="flex items-center gap-3">
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                  RANK_COLORS[index] ?? 'bg-slate-200'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <span className="text-xs font-semibold text-slate-700 shrink-0 tabular-nums">
                    {product.total} un.
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

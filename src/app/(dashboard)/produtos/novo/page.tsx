import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/products/product-form'
import { createProduct } from '../actions'
import { requireAdmin } from '@/lib/auth/roles'

export default async function NovoProdutoPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Novo Produto</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha os dados do produto</p>
      </div>

      <ProductForm categories={categories ?? []} onSubmit={createProduct} />
    </div>
  )
}

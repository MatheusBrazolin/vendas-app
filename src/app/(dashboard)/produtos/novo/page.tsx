import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/products/product-form'
import { createProduct } from '../actions'

export default async function NovoProdutoPage() {
  const supabase = await createClient()
  const [{ data: { user } }, { data: categories }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('categories').select('*').order('name'),
  ])

  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Novo Produto</h1>
        <p className="text-sm text-slate-500 mt-1">Preencha os dados do produto</p>
      </div>

      <ProductForm categories={categories ?? []} onSubmit={createProduct} />
    </div>
  )
}

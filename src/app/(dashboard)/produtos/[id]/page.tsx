import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/products/product-form'
import { updateProduct } from '../actions'

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: product }, { data: categories }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('categories').select('*').order('name'),
  ])

  if (!user) redirect('/login')
  if (!product) notFound()

  const action = updateProduct.bind(null, id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Editar Produto</h1>
        <p className="text-sm text-slate-500 mt-1">{product.name}</p>
      </div>

      <ProductForm product={product} categories={categories ?? []} onSubmit={action} />
    </div>
  )
}

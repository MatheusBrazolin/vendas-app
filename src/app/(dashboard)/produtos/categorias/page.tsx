import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoryManager } from './category-manager'

export default async function CategoriasPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: categories }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('categories').select('*').order('name'),
  ])

  if (!user) redirect('/login')

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Categorias</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie as categorias de produtos</p>
      </div>

      <CategoryManager initialCategories={categories ?? []} />
    </div>
  )
}

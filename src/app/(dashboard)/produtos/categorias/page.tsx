import { createClient } from '@/lib/supabase/server'
import { CategoryManager } from './category-manager'
import { requireAdmin } from '@/lib/auth/roles'

export default async function CategoriasPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Categorias</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie as categorias de produtos</p>
      </div>

      <CategoryManager initialCategories={categories ?? []} />
    </div>
  )
}

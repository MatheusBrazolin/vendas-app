import { createClient } from '@/lib/supabase/server'
import type { ProductWithCategory } from '@/types/database'

export async function getProducts(search?: string): Promise<ProductWithCategory[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*, categories(id, name)')
    .eq('is_active', true)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductWithCategory[]
}

export async function getProductById(id: string): Promise<ProductWithCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as ProductWithCategory
}

export async function getLowStock(): Promise<ProductWithCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name)')
    .eq('is_active', true)
    .order('stock_quantity')
    .limit(50)

  if (error) throw new Error(error.message)

  return ((data ?? []) as ProductWithCategory[]).filter(
    (p) => p.stock_quantity <= p.min_stock
  )
}

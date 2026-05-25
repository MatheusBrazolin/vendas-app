'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validations/category.schema'

export async function createCategory(name: string) {
  const parsed = categorySchema.safeParse({ name })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ name: parsed.data.name })

  if (error) {
    if (error.code === '23505') return { error: 'Categoria já existe.' }
    return { error: error.message }
  }

  revalidatePath('/produtos/categorias')
  revalidatePath('/produtos')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/produtos/categorias')
  return { success: true }
}

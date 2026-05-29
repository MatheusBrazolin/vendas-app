'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createCategory, deleteCategory } from './actions'
import { callServerAction } from '@/lib/utils/server-action'
import type { Category } from '@/types/database'

interface CategoryManagerProps {
  initialCategories: Category[]
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)

    const call = await callServerAction(() => createCategory(newName.trim()), {
      offlineMessage: 'Você está offline. Conecte-se para criar a categoria.',
    })
    setIsAdding(false)

    if (!call.ok) {
      toast.error(call.error)
      return
    }
    if (call.data?.error) {
      toast.error(call.data.error)
      return
    }
    toast.success('Categoria criada')
    setNewName('')
    // Optimistic — page will revalidate
  }

  async function handleDelete(id: string, name: string) {
    const call = await callServerAction(() => deleteCategory(id), {
      offlineMessage: 'Você está offline. Conecte-se para excluir a categoria.',
    })
    if (!call.ok) {
      toast.error(call.error)
      return
    }
    if (call.data?.error) {
      toast.error(call.data.error)
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== id))
    toast.success(`Categoria "${name}" removida`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da categoria"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {categories.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Tags className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhuma categoria cadastrada
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(cat.id, cat.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

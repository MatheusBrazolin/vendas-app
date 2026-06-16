import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PDV } from './pdv'

export default async function NovaVendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Nova Venda</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Selecione os produtos e finalize a venda</p>
      </div>
      <PDV />
    </div>
  )
}

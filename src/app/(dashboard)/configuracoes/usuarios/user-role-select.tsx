'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, User as UserIcon } from 'lucide-react'
import { setUserRole } from './actions'
import { callServerAction } from '@/lib/utils/server-action'
import type { UserRole } from '@/types/database'

interface UserRoleSelectProps {
  userId: string
  role: UserRole
  /** True if this row represents the currently logged-in admin. */
  isSelf: boolean
}

/**
 * Inline role toggle. Optimistically dispatches the role change via a Server
 * Action and shows a toast for success/failure.
 *
 * Self-demotion is blocked client-side AND server-side (in the SQL function)
 * so the system never gets locked out of admins.
 */
export function UserRoleSelect({ userId, role, isSelf }: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition()

  function handleChange(next: UserRole) {
    if (next === role) return

    if (isSelf && next !== 'admin') {
      toast.error('Você não pode remover o próprio acesso de administrador.')
      return
    }

    startTransition(async () => {
      const call = await callServerAction(() => setUserRole(userId, next), {
        offlineMessage: 'Você está offline. Conecte-se para alterar o papel.',
      })
      if (!call.ok) {
        toast.error(call.error)
        return
      }
      const result = call.data
      if (result.success) {
        toast.success(
          next === 'admin' ? 'Usuário promovido a admin.' : 'Usuário definido como funcionário.',
        )
      } else {
        toast.error(result.error ?? 'Não foi possível alterar o papel.')
      }
    })
  }

  const isAdmin = role === 'admin'

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5"
      role="radiogroup"
      aria-label="Papel do usuário"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isAdmin}
        onClick={() => handleChange('employee')}
        disabled={isPending || isSelf}
        className={
          'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ' +
          (!isAdmin
            ? 'bg-slate-100 text-slate-800'
            : 'text-slate-500 hover:bg-slate-50 disabled:opacity-50')
        }
        title={isSelf ? 'Você não pode rebaixar a si mesmo' : 'Definir como Funcionário'}
      >
        <UserIcon className="h-3.5 w-3.5" />
        Funcionário
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isAdmin}
        onClick={() => handleChange('admin')}
        disabled={isPending}
        className={
          'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ' +
          (isAdmin
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 disabled:opacity-50')
        }
        title="Definir como Administrador"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Admin
      </button>
    </div>
  )
}

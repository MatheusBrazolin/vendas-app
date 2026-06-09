'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Power, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { setReportRecipientActive, deleteReportRecipient } from './actions'

interface RecipientActionsProps {
  id: string
  email: string
  active: boolean
}

export function RecipientActions({ id, email, active }: RecipientActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await setReportRecipientActive(id, !active)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(active ? `${email} desativado.` : `${email} ativado.`)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteReportRecipient(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${email} removido da lista.`)
      setDeleteOpen(false)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
        className={
          active
            ? 'text-slate-500 hover:text-amber-700'
            : 'text-slate-500 hover:text-emerald-700'
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Power className="h-4 w-4" />
        )}
        <span className="ml-1.5">{active ? 'Desativar' : 'Ativar'}</span>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDeleteOpen(true)}
        disabled={isPending}
        className="text-slate-500 hover:text-red-700"
        aria-label={`Remover ${email}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle>Remover destinatário?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-slate-700">{email}</strong> deixará de
              receber o relatório diário. Você pode adicioná-lo novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

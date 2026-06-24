'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  MoreVertical,
  KeyRound,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resetEmployeePassword, deleteEmployee } from './actions'

interface UserActionsProps {
  userId: string
  userName: string
  isSelf: boolean
}

export function UserActions({ userId, userName, isSelf }: UserActionsProps) {
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openReset() {
    setPassword('')
    setError(null)
    setResetOpen(true)
  }

  function handleReset() {
    if (password.length < 6) {
      setError('Mínimo 6 caracteres')
      return
    }
    startTransition(async () => {
      const result = await resetEmployeePassword(userId, password)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Senha de ${userName} redefinida.`)
      setResetOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmployee(userId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${userName} foi removido.`)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-slate-500 hover:text-slate-900"
              aria-label={`Ações para ${userName}`}
            />
          }
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={openReset}>
            <KeyRound className="h-4 w-4" />
            Redefinir senha
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onClick={() => !isSelf && setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-slate-500">
              Defina uma nova senha para <strong className="text-slate-700">{userName}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                Nova senha
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleReset()
                    }
                  }}
                  className="h-10 border-slate-200 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="text-red-600 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setResetOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleReset}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Salvar senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle>Excluir {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O usuário perde o acesso ao sistema
              imediatamente. O histórico de vendas já registrado é preservado.
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
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

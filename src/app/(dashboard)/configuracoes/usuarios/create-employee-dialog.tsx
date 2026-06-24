'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserPlus, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createEmployeeSchema, type CreateEmployeeFormData } from '@/lib/validations/auth.schema'
import { createEmployee } from './actions'

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    setOpen(next)
  }

  function onSubmit(data: CreateEmployeeFormData) {
    startTransition(async () => {
      const result = await createEmployee(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Funcionário "${data.username}" criado com sucesso.`)
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button className="bg-primary hover:bg-primary/90 text-white shadow-sm" />}
      >
        <UserPlus className="mr-1.5 h-4 w-4" />
        Novo Funcionário
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Funcionário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="João"
                autoCapitalize="words"
                className="h-10 border-slate-200"
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-red-600 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                Sobrenome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Silva"
                autoCapitalize="words"
                className="h-10 border-slate-200"
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-red-600 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium text-slate-700">
              Usuário <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              placeholder="joana"
              autoCapitalize="none"
              spellCheck={false}
              className="h-10 border-slate-200"
              {...register('username')}
            />
            <p className="text-[11px] text-slate-400">
              Letras, números, ponto, underscore ou hífen. Ex: joana, maria.silva
            </p>
            {errors.username && (
              <p className="text-red-600 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-password" className="text-sm font-medium text-slate-700">
              Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="emp-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="h-10 border-slate-200 pr-10"
                {...register('password')}
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
            {errors.password && (
              <p className="text-red-600 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Criar funcionário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

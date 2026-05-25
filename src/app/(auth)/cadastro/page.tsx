'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth.schema'
import { signUp } from '../login/actions'

export default function CadastroPage() {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpFormData) {
    setServerError(null)
    const result = await signUp(data.email, data.password)
    if (result?.error) setServerError(result.error)
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile brand */}
      <div className="flex lg:hidden items-center gap-2 mb-10">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <ShoppingCart className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900">VendasApp</span>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Criar conta
        </h2>
        <p className="mt-2 text-slate-500">
          Preencha os dados abaixo para se cadastrar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            className="h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            className="h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 text-sm font-medium">
            Confirmar senha
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            autoComplete="new-password"
            className="h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Entrar
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-slate-400">
        Protegido por autenticação Supabase
      </p>
    </div>
  )
}

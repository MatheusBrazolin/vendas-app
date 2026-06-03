'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingCart, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth.schema'
import { signIn } from './actions'

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const result = await signIn(data.username, data.password)
    if (result?.error) setServerError(result.error)
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile brand (visible only on small screens) */}
      <div className="flex lg:hidden items-center gap-2 mb-10">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <ShoppingCart className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900">VendasApp</span>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Bem-vindo de volta
        </h2>
        <p className="mt-2 text-slate-500">
          Entre com suas credenciais para acessar o painel.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-slate-700 text-sm font-medium">
            Usuário
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="joana ou admin@loja.com"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600"
            {...register('username')}
          />
          {errors.username && (
            <p className="text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
              Senha
            </Label>
            <Link
              href="/esqueceu-senha"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Esqueceu?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 pr-10"
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
            <p className="text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {errors.password.message}
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
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Protegido por autenticação Supabase
      </p>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addReportRecipient } from './actions'

export function AddRecipientForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addReportRecipient({ email })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(`${email.trim().toLowerCase()} adicionado à lista.`)
      setEmail('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          className="h-10 border-slate-200 sm:flex-1"
          aria-label="Email do destinatário"
        />
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          Adicionar
        </Button>
      </div>
      {error && (
        <p className="text-red-600 text-xs flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </form>
  )
}

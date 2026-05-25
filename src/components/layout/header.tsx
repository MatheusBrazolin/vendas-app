import Link from 'next/link'
import { LogOut, LogIn, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/breadcrumb'

function getInitials(email: string | null | undefined): string {
  if (!email) return '??'
  const namePart = email.split('@')[0] ?? ''
  const parts = namePart.split(/[._-]/).filter(Boolean)
  if (parts.length === 0) return email.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const initials = getInitials(user?.email)
  const displayName = user?.email?.split('@')[0] ?? ''

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-20">
      <Breadcrumb />

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[160px]">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[160px]">
                  {user.email}
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white"
                aria-label={`Avatar de ${displayName}`}
              >
                {initials}
              </div>
            </div>

            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sair
              </Button>
            </form>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-1.5" />
                Entrar
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Link href="/cadastro">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Cadastrar-se
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

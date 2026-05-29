import Link from 'next/link'
import { LogOut, LogIn, UserPlus } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/roles'
import { signOut } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MobileSidebar } from '@/components/layout/sidebar'

export async function Header() {
  const user = await getCurrentUser()

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {user && <MobileSidebar role={user.role} />}
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {user ? (
          <>
            <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                  {user.displayName}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[180px]">
                  {user.email}
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white"
                aria-label={`Avatar de ${user.displayName}`}
              >
                {user.initials}
              </div>
            </div>

            {/* Mobile-only compact avatar */}
            <div
              className="sm:hidden h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white shrink-0"
              aria-label={`Avatar de ${user.displayName}`}
            >
              {user.initials}
            </div>

            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sair</span>
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

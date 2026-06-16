import { LogOut } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/roles'
import { signOut } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MobileSidebar } from '@/components/layout/sidebar'
import { InstallButton } from '@/components/pwa/install-button'
import { PendingSalesBadge } from '@/components/pwa/pending-sales-badge'

export async function Header() {
  // The Header only renders inside the authenticated dashboard layout, which
  // already redirects unauthenticated users to /login — so a user is always present.
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <MobileSidebar role={user.role} />
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <PendingSalesBadge />
        <InstallButton />

        <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200 dark:border-slate-700">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
              {user.displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
              {user.email}
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white"
            aria-label={`Avatar de ${user.displayName}`}
          >
            {user.initials}
          </div>
        </div>

        {/* Mobile-only compact avatar */}
        <div
          className="sm:hidden h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white shrink-0"
          aria-label={`Avatar de ${user.displayName}`}
        >
          {user.initials}
        </div>

        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8"
          >
            <LogOut className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  )
}

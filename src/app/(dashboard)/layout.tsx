import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { SyncProvider } from '@/components/pwa/sync-provider'
import { getCurrentUser } from '@/lib/auth/roles'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Centralize the auth check at the layout level so every page below
  // (dashboard, produtos, vendas, etc.) has a guaranteed session.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Gradient blobs — give glassmorphism cards something to blur against */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
        <div className="absolute top-28 left-[22%] h-[280px] w-[280px] sm:h-[560px] sm:w-[560px] rounded-full blur-[140px] bg-primary/8 dark:bg-primary/20" />
        <div className="absolute bottom-20 right-[18%] h-96 w-96 rounded-full blur-[110px] bg-emerald-500/6 dark:bg-emerald-500/15" />
        <div className="absolute top-[50%] right-[38%] h-72 w-72 rounded-full blur-[90px] bg-cyan-500/5 dark:bg-cyan-500/12" />
      </div>
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">{children}</main>
      </div>
      {/* Offline plumbing — only mounted for authenticated users since the
          sync calls would 401 without a session and the offline banner only
          makes sense once you're inside the app. */}
      <SyncProvider />
      <OfflineIndicator />
    </div>
  )
}

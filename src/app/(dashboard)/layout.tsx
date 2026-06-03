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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">{children}</main>
      </div>
      {/* Offline plumbing — only mounted for authenticated users since the
          sync calls would 401 without a session and the offline banner only
          makes sense once you're inside the app. */}
      <SyncProvider />
      <OfflineIndicator />
    </div>
  )
}

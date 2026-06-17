import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { displayName, initials } from '@/lib/utils/user-display'
import { OFFLINE_COOKIE_NAME, readOfflineSession } from '@/lib/supabase/offline-cookie'
import type { UserRole } from '@/types/database'

export interface CurrentUser {
  id: string
  email: string | null
  role: UserRole
  firstName: string | null
  lastName: string | null
  /** Pretty name for UI (falls back to email username). */
  displayName: string
  /** Two-letter initials for avatars. */
  initials: string
}

/**
 * Returns the current authenticated user with their role + profile.
 * Returns null when there is no session.
 *
 * Memoized per-request via React `cache` so multiple components/layouts
 * in the same render hit Supabase only once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()

  const AUTH_TIMEOUT_MS = 5_000
  const { data: { user } } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: null }), AUTH_TIMEOUT_MS),
    ),
  ])

  if (user) {
    // Fetch role + profile in parallel — both are tiny single-row lookups.
    const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const role: UserRole = roleRow?.role ?? 'employee'
    const firstName = profileRow?.first_name ?? null
    const lastName = profileRow?.last_name ?? null
    const email = user.email ?? null

    return {
      id: user.id,
      email,
      role,
      firstName,
      lastName,
      displayName: displayName({ firstName, lastName, email }),
      initials: initials({ firstName, lastName, email }),
    }
  }

  // No live Supabase session — check for an offline session cookie (set after
  // an offline login). This lets server components work while the app is offline.
  const cookieStore = await cookies()
  const offlineCookie = cookieStore.get(OFFLINE_COOKIE_NAME)
  if (offlineCookie) {
    const session = readOfflineSession(offlineCookie.value)
    if (session) {
      const email = session.email
      return {
        id: session.userId,
        email,
        role: (['admin', 'employee'] as UserRole[]).includes(session.role as UserRole)
          ? (session.role as UserRole)
          : 'employee',
        firstName: null,
        lastName: null,
        displayName: displayName({ firstName: null, lastName: null, email }),
        initials: initials({ firstName: null, lastName: null, email }),
      }
    }
  }

  return null
})

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Server-side guard for admin-only pages. Redirects non-admins to /vendas/nova
 * (their effective home) and unauthenticated users to /login.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/vendas/nova')
  return user
}

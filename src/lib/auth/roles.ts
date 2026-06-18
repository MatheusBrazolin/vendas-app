import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { displayName, initials } from '@/lib/utils/user-display'
import { OFFLINE_COOKIE_NAME, readOfflineSession } from '@/lib/supabase/offline-cookie'
import type { Database, UserRole } from '@/types/database'

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
  const cookieStore = await cookies()

  // AbortController gives us a hard 3s ceiling — avoids the hanging-promise
  // accumulation that causes blank screens in Electron when the app is offline.
  const AUTH_TIMEOUT_MS = 3_000
  const controller = new AbortController()
  const abortTimer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  const supabaseWithTimeout = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Do NOT clearTimeout inside this wrapper — Supabase auth.getUser() may
        // issue multiple sequential fetches (e.g. token refresh then user check).
        // Clearing the timer after the first fetch would leave the second without
        // a deadline, causing 10-second hangs when offline. The outer finally{}
        // block handles cleanup once the whole getUser() call settles.
        fetch: (url: RequestInfo | URL, init?: RequestInit) =>
          fetch(url, { ...init, signal: controller.signal }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component context — cookies set by middleware
          }
        },
      },
    },
  )

  let user: Awaited<ReturnType<typeof supabaseWithTimeout.auth.getUser>>['data']['user'] = null
  try {
    const { data } = await supabaseWithTimeout.auth.getUser()
    user = data.user
  } catch {
    // AbortError (timeout) or network failure — fall through to offline cookie
  } finally {
    clearTimeout(abortTimer)
  }

  if (user) {
    // Fetch role + profile in parallel using the regular client (already online if we got here).
    const supabase = await createClient()
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

  // No live Supabase session — check for an offline session cookie.
  // Set after an offline login OR after every successful online login,
  // so the app keeps working when the connection drops mid-session.
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

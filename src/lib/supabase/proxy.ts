import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { getUserFromSessionCookie, getUserFromOfflineCookie } from './decode-session'

const PROTECTED_PATHS = ['/dashboard', '/vendas', '/produtos', '/configuracoes', '/relatorios']
const AUTH_PATHS = ['/login', '/cadastro', '/esqueceu-senha', '/redefinir-senha']

/**
 * Milliseconds before we give up waiting for Supabase and fall back to the
 * local session cookie. Kept short so that every page navigation while
 * offline resolves quickly instead of hanging the middleware indefinitely.
 */
const AUTH_TIMEOUT_MS = 3_000

/** True when the error indicates the server was unreachable (not an auth failure). */
function isNetworkError(error: unknown): boolean {
  if (!error) return false
  const name = error instanceof Error ? error.constructor.name : ''
  const msg = error instanceof Error ? error.message : String(error)
  return (
    name === 'AuthRetryableFetchError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('network') ||
    msg.includes('abort') ||
    // AuthApiError (HTTP response errors) always has a numeric status field.
    // Network errors have no HTTP status, so check for its absence.
    (error instanceof Error && 'status' in error === false)
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Abort the underlying fetch if Supabase takes longer than AUTH_TIMEOUT_MS.
  // Without this, every navigation while offline queues a hanging promise that
  // never resolves — enough of them will exhaust the Node.js event loop and
  // produce the blank screen the user sees after multiple offline navigations.
  const controller = new AbortController()
  const abortTimer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, init) =>
          fetch(url, { ...init, signal: controller.signal }).finally(() =>
            clearTimeout(abortTimer),
          ),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  let user: { id: string } | null = null

  try {
    const { data, error } = await supabase.auth.getUser()

    if (data.user) {
      user = data.user
    } else {
      // No Supabase user — fall back to local session cookies.
      // This covers: network errors, expired tokens, AND fresh offline logins
      // where no Supabase auth cookie exists (getUser returns null/null).
      user =
        getUserFromSessionCookie(request) ??
        (await getUserFromOfflineCookie(request))
    }
  } catch {
    // AbortError from the timeout, or any unexpected throw
    user =
      getUserFromSessionCookie(request) ??
      (await getUserFromOfflineCookie(request))
  } finally {
    clearTimeout(abortTimer)
  }

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated user trying to access a protected route → login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user hitting an auth page → app home
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/vendas/nova'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

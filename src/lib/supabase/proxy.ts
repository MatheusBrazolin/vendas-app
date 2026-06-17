import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { getUserFromSessionCookie, getUserFromOfflineCookie } from './decode-session'

const PROTECTED_PATHS = ['/dashboard', '/vendas', '/produtos', '/configuracoes', '/relatorios']
const AUTH_PATHS = ['/login', '/cadastro', '/esqueceu-senha', '/redefinir-senha']

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
    // AuthApiError (HTTP response errors) always has a numeric status field.
    // Network errors have no HTTP status, so check for its absence.
    (error instanceof Error && 'status' in error === false)
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: { id: string } | null = null

  try {
    const { data, error } = await supabase.auth.getUser()

    if (data.user) {
      user = data.user
    } else if (error && isNetworkError(error)) {
      // Supabase unreachable — trust local session data
      user =
        getUserFromSessionCookie(request) ??
        (await getUserFromOfflineCookie(request))
    }
    // auth errors (wrong token, expired, etc.) leave user as null → redirect to login
  } catch {
    // Unexpected throw (e.g. hard timeout that bypassed the error return)
    user =
      getUserFromSessionCookie(request) ??
      (await getUserFromOfflineCookie(request))
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

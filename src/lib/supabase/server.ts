import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Must be lower than tryQuery's default (5000ms) so the SQLite offline fallback
// in each query function has time to run before tryQuery gives up entirely.
const QUERY_TIMEOUT_MS = 3_000

// Longer timeout for the sync operation: it runs 5+ parallel Supabase fetches
// and must complete before the 3s page-level timeout fires.
const SYNC_TIMEOUT_MS = 30_000

/**
 * Creates a Supabase server client whose fetch calls are automatically aborted
 * after QUERY_TIMEOUT_MS. This prevents offline/unreachable-Supabase scenarios
 * from accumulating hanging connections in the Node.js event loop (which causes
 * the blank-screen crash in Electron after multiple offline navigations).
 *
 * The AbortError propagates out of query functions → caught by tryQuery() → returns fallback.
 */
export async function createSyncClient() {
  return _makeClient(SYNC_TIMEOUT_MS)
}

export async function createClient() {
  return _makeClient(QUERY_TIMEOUT_MS)
}

async function _makeClient(timeoutMs: number) {
  const cookieStore = await cookies()
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
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
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookies set by middleware
          }
        },
      },
    }
  )
}


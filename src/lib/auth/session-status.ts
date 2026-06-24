'use server'

import { cookies } from 'next/headers'
import { OFFLINE_COOKIE_NAME, readOfflineSession } from '@/lib/supabase/offline-cookie'

/**
 * Returns the Unix epoch expiry timestamp of the current offline session
 * cookie, or null if no valid offline session exists.
 *
 * Exposed as a Server Action so Client Components (SyncProvider) can check
 * session expiry without accessing the httpOnly cookie directly.
 */
export async function getOfflineSessionExpiry(): Promise<number | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(OFFLINE_COOKIE_NAME)?.value
  if (!raw) return null
  const session = readOfflineSession(raw)
  return session?.exp ?? null
}

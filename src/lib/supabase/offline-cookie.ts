'server-only'

/**
 * Creates the `nx-offline-session` cookie that keeps a user logged in after
 * an offline login (when no real Supabase session exists).
 *
 * The middleware validates this cookie without Node.js crypto (Edge-compatible)
 * by only checking the expiry from the decoded payload.  For a local/intranet
 * POS deployment that's acceptable — the cookie is HttpOnly so it can only
 * be set here, server-side.
 */

import { createHmac, timingSafeEqual } from 'crypto'

export const OFFLINE_COOKIE_NAME = 'nx-offline-session'

/** 24 hours — re-login required each day when the store opens offline. */
const MAX_AGE_SECONDS = 24 * 60 * 60

const SECRET = process.env.OFFLINE_SESSION_SECRET
if (!SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OFFLINE_SESSION_SECRET env var must be set in production')
  }
  console.warn('[offline-cookie] OFFLINE_SESSION_SECRET not set — using insecure dev fallback. Set it before going to production.')
}
const EFFECTIVE_SECRET = SECRET ?? 'nexsales-offline-dev-only-fallback'

interface OfflineSessionPayload {
  userId: string
  email: string
  role: string
  exp: number
}

function sign(data: string): string {
  return createHmac('sha256', EFFECTIVE_SECRET).update(data).digest('base64url')
}

export function createOfflineSessionCookie(
  userId: string,
  email: string,
  role: string,
): { value: string; maxAge: number } {
  const payload: OfflineSessionPayload = {
    userId,
    email,
    role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = sign(data)
  return { value: `${data}.${sig}`, maxAge: MAX_AGE_SECONDS }
}

/**
 * Parses and verifies a `nx-offline-session` cookie value.
 * Returns null on any failure (bad signature, expired, malformed).
 */
export function readOfflineSession(cookieValue: string): OfflineSessionPayload | null {
  try {
    const dot = cookieValue.lastIndexOf('.')
    if (dot === -1) return null
    const data = cookieValue.slice(0, dot)
    const sig = cookieValue.slice(dot + 1)
    const expected = Buffer.from(sign(data))
    const received = Buffer.from(sig)
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
    const payload: OfflineSessionPayload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    )
    if (Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Reads a Supabase session from request cookies without making a network call.
 *
 * Used as an offline fallback in middleware when Supabase is unreachable.
 * The cookie was set by our own server (HttpOnly), so decoding it without
 * re-validating the signature is acceptable for a local/intranet deployment.
 *
 * Compatible with Edge runtime (no Node.js-only APIs).
 */

import type { NextRequest } from 'next/server'

/** Days after token expiry that we still trust the cached session offline. */
const OFFLINE_GRACE_DAYS = 7

export interface OfflineUser {
  id: string
  email?: string
}

interface SessionPayload {
  access_token?: string
  expires_at?: number
  user?: { id: string; email?: string }
}

function base64UrlToString(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return atob(b64 + pad)
}

function collectCookieChunks(request: NextRequest, name: string): string {
  const single = request.cookies.get(name)?.value
  if (single) return single

  // @supabase/ssr splits large sessions into numbered chunks: name.0, name.1, …
  const chunks: string[] = []
  for (let i = 0; i < 20; i++) {
    const chunk = request.cookies.get(`${name}.${i}`)?.value
    if (chunk === undefined) break
    chunks.push(chunk)
  }
  return chunks.join('')
}

function tryParseSession(raw: string): SessionPayload | null {
  const decoders: Array<() => SessionPayload> = [
    () => JSON.parse(raw),
    () => JSON.parse(base64UrlToString(raw)),
    () => JSON.parse(decodeURIComponent(raw)),
  ]
  for (const decode of decoders) {
    try {
      return decode()
    } catch {
      // try next
    }
  }
  return null
}

/**
 * Decodes the Supabase session stored in cookies.
 * Returns null when no session exists or when it's too stale to trust offline.
 */
export function getUserFromSessionCookie(request: NextRequest): OfflineUser | null {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const projectRef = supabaseUrl.replace(/https?:\/\//, '').split('.')[0]
    if (!projectRef) return null

    const raw = collectCookieChunks(request, `sb-${projectRef}-auth-token`)
    if (!raw) return null

    const session = tryParseSession(raw)
    if (!session?.user?.id) return null

    const now = Math.floor(Date.now() / 1000)
    const gracePeriodSecs = OFFLINE_GRACE_DAYS * 86400

    if (
      typeof session.expires_at === 'number' &&
      session.expires_at > 0 &&
      session.expires_at < now - gracePeriodSecs
    ) {
      return null
    }

    return { id: session.user.id, email: session.user.email }
  } catch {
    return null
  }
}

/**
 * Verifies and decodes the custom offline session cookie.
 * Uses Web Crypto API for HMAC verification (Edge-compatible).
 */
export async function getUserFromOfflineCookie(request: NextRequest): Promise<OfflineUser | null> {
  const raw = request.cookies.get('nx-offline-session')?.value
  if (!raw) return null
  try {
    const dot = raw.lastIndexOf('.')
    if (dot === -1) return null
    const data = raw.slice(0, dot)
    const sig = raw.slice(dot + 1)

    const secret = process.env.OFFLINE_SESSION_SECRET
    if (!secret) {
      // Secret missing — refuse to trust an unverified cookie.
      // Set OFFLINE_SESSION_SECRET in .env.local (dev) or Vercel env vars (prod).
      return null
    }

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const b64 = sig.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const sigBytes = Uint8Array.from(atob(b64 + pad), (c) => c.charCodeAt(0))
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data))
    if (!isValid) return null

    const payload = JSON.parse(base64UrlToString(data))
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!payload?.userId) return null
    return { id: payload.userId, email: payload.email }
  } catch {
    return null
  }
}

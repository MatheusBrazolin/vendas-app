'server-only'

/**
 * Stores a scrypt hash of the user's credentials in a local JSON file so the
 * app can authenticate without reaching Supabase when the network is down.
 *
 * The file lives at <cwd>/.offline-credentials.json (gitignored).
 * Only called from server actions — never imported on the client.
 */

import { scryptSync, timingSafeEqual, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'

// In Electron, OFFLINE_CREDS_PATH is set to app.getPath('userData') so the file
// lands in a writable directory even when the app is installed in Program Files.
// In dev/web, falls back to cwd (project root).
const CREDS_FILE = process.env.OFFLINE_CREDS_PATH
  ? join(process.env.OFFLINE_CREDS_PATH, '.offline-credentials.json')
  : join(process.cwd(), '.offline-credentials.json')
const DEBUG_LOG = process.env.OFFLINE_CREDS_PATH
  ? join(process.env.OFFLINE_CREDS_PATH, '.offline-auth-debug.log')
  : join(process.cwd(), '.offline-auth-debug.log')
const KEY_LEN = 64

function debugLog(msg: string): void {
  try {
    const line = `[${new Date().toISOString()}] ${msg}\n`
    appendFileSync(DEBUG_LOG, line, 'utf8')
  } catch {
    // ignore logging failures
  }
}

interface StoredCredential {
  hash: string
  salt: string
  userId: string
  email: string
  role: string
  savedAt: string
}

type Store = Record<string, StoredCredential>

function readStore(): Store {
  if (!existsSync(CREDS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CREDS_FILE, 'utf8')) as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  mkdirSync(dirname(CREDS_FILE), { recursive: true })
  writeFileSync(CREDS_FILE, JSON.stringify(store, null, 2), 'utf8')
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, KEY_LEN).toString('hex')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

/**
 * Saves (or updates) a hashed credential entry after a successful online login.
 * Silently ignores filesystem errors so it never breaks the login flow.
 */
export function saveOfflineCredentials(
  email: string,
  password: string,
  userId: string,
  role: string,
): void {
  try {
    const store = readStore()
    const salt = randomBytes(16).toString('hex')
    store[email] = {
      hash: hashPassword(password, salt),
      salt,
      userId,
      email,
      role,
      savedAt: new Date().toISOString(),
    }
    writeStore(store)
  } catch {
    // Non-critical — offline caching must never break online login
  }
}

/**
 * Verifies credentials against the local hash file.
 * Returns user info on match, null on mismatch, throws with diagnostic on error.
 */
export function verifyOfflineCredentials(
  email: string,
  password: string,
): { userId: string; email: string; role: string } | null {
  const fileExists = existsSync(CREDS_FILE)
  if (!fileExists) {
    throw new Error(`OFFLINE_AUTH_DIAG: file not found at "${CREDS_FILE}"`)
  }

  const store = readStore()
  const keys = Object.keys(store)

  const cred = store[email]
  if (!cred) {
    throw new Error(
      `OFFLINE_AUTH_DIAG: email "${email}" not in store. Keys: ${JSON.stringify(keys)}`,
    )
  }

  const hash = hashPassword(password, cred.salt)
  if (!safeEqual(hash, cred.hash)) {
    return null  // wrong password — do NOT expose details
  }

  return { userId: cred.userId, email: cred.email, role: cred.role }
}

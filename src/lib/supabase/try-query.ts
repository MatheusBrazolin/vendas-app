'server-only'

/**
 * Wraps a Supabase query (or any async function) with a timeout so server
 * components fail fast when the database is unreachable, instead of hanging
 * for the OS-level TCP timeout (up to 75 seconds on some systems).
 *
 * Returns `{ data, offline: false }` on success and
 *         `{ data: fallback, offline: true }` on timeout or error.
 */
export async function tryQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs = 3000,
): Promise<{ data: T; offline: boolean }> {
  const attempt = fn()
    .then((data) => ({ data, offline: false as const }))
    .catch(() => ({ data: fallback, offline: true as const }))

  const timer = new Promise<{ data: T; offline: true }>((resolve) =>
    setTimeout(() => resolve({ data: fallback, offline: true }), timeoutMs),
  )

  return Promise.race([attempt, timer])
}

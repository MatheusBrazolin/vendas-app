/**
 * Unified wrapper for invoking Server Actions from the client with proper
 * offline + error handling.
 *
 * Why it exists: without this, every place that calls a server action has
 * to remember to (a) check `navigator.onLine`, (b) wrap in try/catch,
 * (c) inspect the error message to detect "Failed to fetch" cases, and
 * (d) reset its own loading spinner in `finally`. Forgetting any one of
 * these — which happened in the PDV's `handleSubmit` — leaves the user
 * staring at a button labelled "Processando..." forever after going offline.
 *
 * Returns a uniform `{ data | error }` shape so callers can decide whether
 * to show a toast, surface a field error, or anything else — the helper
 * deliberately doesn't toast on its own to keep that decision local.
 *
 * Server Actions that already return `{ error?: string }` work cleanly:
 * the action's own error string is preserved as `data.error` and the
 * caller can hoist it into `error` if it wants.
 */

const DEFAULT_OFFLINE_MESSAGE =
  'Você está offline. Conecte-se à internet para concluir esta ação.'

const DEFAULT_NETWORK_FAILURE_MESSAGE =
  'Falha de conexão com o servidor. Verifique sua internet e tente novamente.'

const DEFAULT_UNKNOWN_FAILURE_MESSAGE =
  'Ocorreu um erro inesperado. Tente novamente.'

export interface CallServerActionOptions {
  /** Override the message shown when `navigator.onLine === false`. */
  offlineMessage?: string
  /** Override the message shown when the network call itself throws. */
  networkFailureMessage?: string
  /** Override the message shown for non-network errors. */
  unknownFailureMessage?: string
}

export type CallServerActionResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data?: undefined; error: string }

/**
 * Run a server action with offline + error guards.
 *
 * @example
 *   const call = await callServerAction(() => createSale(input))
 *   if (!call.ok) {
 *     toast.error(call.error)
 *     return
 *   }
 *   // ... use call.data (narrowed to the action's return type)
 */
export async function callServerAction<T>(
  action: () => Promise<T>,
  options: CallServerActionOptions = {},
): Promise<CallServerActionResult<T>> {
  // Pre-flight: if the browser itself reports offline, short-circuit before
  // wasting time on a fetch we know will fail. `navigator.onLine === false`
  // is the cheap, reliable signal here; the captive-portal edge case still
  // falls through to the catch below.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: options.offlineMessage ?? DEFAULT_OFFLINE_MESSAGE }
  }

  try {
    const data = await action()
    return { ok: true, data }
  } catch (err) {
    if (isNetworkFailure(err)) {
      return {
        ok: false,
        error: options.networkFailureMessage ?? DEFAULT_NETWORK_FAILURE_MESSAGE,
      }
    }
    const message = err instanceof Error ? err.message : ''
    return {
      ok: false,
      error: message || options.unknownFailureMessage || DEFAULT_UNKNOWN_FAILURE_MESSAGE,
    }
  }
}

/**
 * Heuristic match against the error messages browsers produce when a fetch
 * fails for connectivity reasons (vs an HTTP error response, which never
 * throws). The exact strings vary by engine; the regex covers Chromium,
 * Firefox and Safari shapes.
 */
function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return /failed to fetch|networkerror|load failed|ERR_INTERNET_DISCONNECTED|ERR_NETWORK/i.test(
    err.message,
  )
}

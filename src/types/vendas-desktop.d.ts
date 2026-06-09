/**
 * Surface exposed by `electron/preload.cjs` when the app runs inside the
 * VendasApp desktop shell. Absent in the web build — always guard with
 * `if (typeof window !== 'undefined' && window.vendasDesktop)` before use.
 */
interface VendasDesktopBridge {
  print(): Promise<
    | { ok: true }
    | { ok: false; reason: 'canceled' | 'error'; error?: string }
  >
  savePdf(opts?: { suggestedName?: string }): Promise<
    | { ok: true; path: string }
    | { ok: false; reason: 'canceled' | 'error'; error?: string }
  >
}

interface Window {
  vendasDesktop?: VendasDesktopBridge
}

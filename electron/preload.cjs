/**
 * Preload — runs in an isolated world before the renderer's JS, with Node
 * available. We use it to expose a tiny, hand-picked surface (`window.vendasDesktop`)
 * so renderer code can ask Electron's main process to print or save a PDF
 * using native Windows dialogs.
 *
 * Renderer stays sandboxed: no Node, no IPC raw access, only the two methods
 * below. Web (non-Electron) builds simply won't see `window.vendasDesktop`,
 * and the UI falls back to `window.print()`.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vendasDesktop', {
  /** Opens the native Windows print dialog (printer list, copies, etc.). */
  print: () => ipcRenderer.invoke('desktop:print'),
  /**
   * Generates a PDF of the current page and prompts the user to save it.
   * @param {{ suggestedName?: string }} [opts]
   * @returns {Promise<{ ok: true, path: string } | { ok: false, reason: 'canceled' | 'error', error?: string }>}
   */
  savePdf: (opts) => ipcRenderer.invoke('desktop:save-pdf', opts ?? {}),
})

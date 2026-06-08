/**
 * VendasApp — Electron desktop shell (Windows).
 *
 * This wraps the deployed PWA in a dedicated, installable desktop window.
 * It loads the hosted app (same backend/Supabase as the web and mobile),
 * so sales made on the desktop show up everywhere instantly.
 *
 * Offline behaviour: Electron embeds Chromium, so the service worker and
 * IndexedDB layer the app already ships work exactly as they do in Chrome.
 * After the first online launch (needed to log in and cache the shell), the
 * app keeps working if the connection drops mid-use — and even on a cold
 * start while offline the service worker serves the cached shell, with sales
 * queued locally until the network returns.
 *
 * Point it elsewhere for local testing:
 *   set VENDAS_APP_URL=http://localhost:3000 && npm run desktop
 */

const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

const APP_URL = process.env.VENDAS_APP_URL || 'https://vendas-app-topaz.vercel.app'
const APP_ORIGIN = new URL(APP_URL).origin

// A single instance only — a POS terminal shouldn't open the app twice.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

/** @type {BrowserWindow | null} */
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'VendasApp',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      // Lock down the renderer — we load remote content, so no Node access.
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(APP_URL)

  // In-app links to our own origin open in-window; anything external (e.g. a
  // payment provider, docs) opens in the user's real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Keep the renderer pinned to our origin. If anything tries to navigate the
  // window elsewhere (a redirect, an injected link), send it to the external
  // browser instead — the desktop shell only ever shows the VendasApp app.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Focus the existing window if a second launch is attempted.
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/**
 * NexSales — Electron desktop shell (Windows).
 *
 * Architecture: spawns a local Next.js server so all page rendering and
 * data queries happen entirely on this machine. SQLite is used as the local
 * database when ELECTRON_APP=true, making the app fully offline-capable after
 * the first online sync.
 *
 * First launch requires internet (to log in and sync data from Supabase).
 * After that the app works without any network connection.
 */

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')
const http = require('node:http')

const NEXT_PORT = 3099
const APP_URL = `http://localhost:${NEXT_PORT}`
const APP_ORIGIN = APP_URL

// A single instance only — a POS terminal shouldn't open the app twice.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {import('node:child_process').ChildProcess | null} */
let nextProcess = null

// ─────────────────────────────────────────────
//  Next.js server management
// ─────────────────────────────────────────────

function getProjectRoot() {
  // app.isPackaged is true when running from an installed .exe
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..')
}

function getNextBin() {
  const root = getProjectRoot()
  const bin = path.join(root, 'node_modules', '.bin', 'next')
  // On Windows, spawn needs the .cmd wrapper; shell:true handles this.
  return bin
}

/** Poll until the local server responds with a non-5xx status. */
function waitForServer(maxMs = 90_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs
    function check() {
      const req = http.get(APP_URL, (res) => {
        res.resume()
        if (res.statusCode < 500) return resolve(undefined)
        if (Date.now() < deadline) return setTimeout(check, 800)
        reject(new Error('Server did not respond in time'))
      })
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(check, 800)
        else reject(new Error('Server did not start — connection refused after timeout'))
      })
      req.setTimeout(1500, () => req.destroy())
    }
    setTimeout(check, 600) // give the process a moment before first check
  })
}

async function startNextServer() {
  const root = getProjectRoot()
  const dbPath = path.join(app.getPath('userData'), 'nexsales.db')
  const args = app.isPackaged
    ? ['start', '--port', String(NEXT_PORT)]
    : ['dev', '--port', String(NEXT_PORT), '--turbopack']

  nextProcess = spawn(getNextBin(), args, {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_APP: 'true',
      DB_PATH: dbPath,
      PORT: String(NEXT_PORT),
    },
    stdio: 'inherit',
    // shell: true lets Windows resolve the .cmd shim without an explicit extension.
    shell: process.platform === 'win32',
  })

  nextProcess.on('error', (err) => {
    console.error('[Electron] Failed to start Next.js server:', err.message)
  })

  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Electron] Next.js server exited with code ${code}`)
    }
    nextProcess = null
  })

  await waitForServer()
}

// ─────────────────────────────────────────────
//  Window
// ─────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'NexSales',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.loadURL(APP_URL)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Trigger initial data sync once the page is loaded and the user is authenticated.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      fetch('/api/sync', { method: 'POST' }).catch(() => {})
    `).catch(() => {})
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─────────────────────────────────────────────
//  App lifecycle
// ─────────────────────────────────────────────

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  try {
    await startNextServer()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    dialog.showErrorBox(
      'Falha ao iniciar NexSales',
      `Não foi possível iniciar o servidor local.\n\n${msg}\n\nVerifique se o Node.js está instalado e tente novamente.`,
    )
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill()
    nextProcess = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─────────────────────────────────────────────
//  Native print + PDF bridge
// ─────────────────────────────────────────────

ipcMain.handle('desktop:print', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { ok: false, reason: 'error', error: 'no-window' }
  return await new Promise((resolve) => {
    win.webContents.print({ silent: false, printBackground: true }, (success, failure) => {
      if (success) resolve({ ok: true })
      else resolve({ ok: false, reason: failure === 'cancelled' ? 'canceled' : 'error', error: failure })
    })
  })
})

ipcMain.handle('desktop:save-pdf', async (event, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { ok: false, reason: 'error', error: 'no-window' }

  const suggested = (opts && opts.suggestedName) || 'fechamento.pdf'
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar PDF',
    defaultPath: suggested,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { ok: false, reason: 'canceled' }

  try {
    const buffer = await win.webContents.printToPDF({ printBackground: true })
    await fs.writeFile(filePath, buffer)
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) }
  }
})

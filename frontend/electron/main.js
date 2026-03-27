// ── Indium Assessment — Electron Main Process ────────────────────────────────
// Do NOT enable nodeIntegration. Use preload.js to expose only what React needs.
const { app, BrowserWindow, globalShortcut, ipcMain, powerSaveBlocker, session } = require('electron')
const path = require('path')

let mainWindow
let blocker = -1

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen:      true,
    kiosk:           true,      // native lockdown — hides taskbar / dock
    alwaysOnTop:     true,
    autoHideMenuBar: true,
    frame:           false,
    backgroundColor: '#0F172A',
    show:            false,     // don't flash white before load
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      devTools:         false,  // block devtools entirely in production
      preload:          path.join(__dirname, 'preload.js'),
    },
  })

  // Auto-grant device permissions (camera/mic)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true)
    callback(true) // grant other non-destructive permissions
  })
  session.defaultSession.setDevicePermissionHandler(() => true)

  // Load the Vite build output (dist/index.html)
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // ── Block window from being un-focused by OS (best-effort) ──
  mainWindow.on('blur', () => {
    mainWindow.focus()
    mainWindow.webContents.send('electron:focus-lost')
  })

  // Prevent close unless the renderer explicitly sends 'test-complete'
  mainWindow.on('close', (e) => {
    if (!mainWindow.isTestComplete) {
      e.preventDefault()
    }
  })
}

app.whenReady().then(() => {
  // Prevent display sleep during test
  blocker = powerSaveBlocker.start('prevent-display-sleep')

  createWindow()

  // ── Block dangerous keyboard shortcuts ──────────────────────
  const blocked = [
    'Alt+F4', 'Alt+Tab', 'Super', 'Meta',
    'CommandOrControl+W', 'CommandOrControl+Q',
    'CommandOrControl+R', 'CommandOrControl+Shift+I',  // devtools
    'F5', 'F11', 'F12',
    'Escape',
  ]
  for (const shortcut of blocked) {
    globalShortcut.register(shortcut, () => {})  // no-op
  }

  // Emergency kill switch
  globalShortcut.register('CommandOrControl+Shift+Esc', () => {
    if (mainWindow) mainWindow.isTestComplete = true
    app.quit()
  })
})

// ── IPC: renderer tells us the test is done → allow close ────────────────────
ipcMain.on('test-complete', () => {
  if (mainWindow) mainWindow.isTestComplete = true
  app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (blocker !== -1) powerSaveBlocker.stop(blocker)
})

// macOS: re-open window if dock icon clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── Indium Assessment — Electron Preload ─────────────────────────────────────
// This is the ONLY file allowed to talk to Node from the renderer.
// contextBridge keeps the renderer sandboxed — no full Node access.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronBridge', {
  /** true when the app is running inside Electron */
  isElectron: true,

  /** Call when candidate finishes the final round — closes the window gracefully */
  notifyTestComplete: () => ipcRenderer.send('test-complete'),

  /** Listen for focus-loss events fired by main.js */
  onFocusLost: (callback) => {
    ipcRenderer.on('electron:focus-lost', (_event) => callback())
  },

  /** Remove focus-loss listener (cleanup) */
  offFocusLost: () => {
    ipcRenderer.removeAllListeners('electron:focus-lost')
  },
})

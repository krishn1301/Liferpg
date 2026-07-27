import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getStoreData, setStoreData, resetStore } from './store'
import { exportToExcel, importFromExcel } from './excel'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC Handlers ──

// Store operations
ipcMain.handle('store:get', () => {
  return getStoreData()
})

ipcMain.handle('store:set', (_event, key, value) => {
  setStoreData(key, value)
  return { success: true }
})

ipcMain.handle('store:reset', () => {
  resetStore()
  return { success: true }
})

// Excel operations
ipcMain.handle('excel:export', async (_event, habits, xp) => {
  try {
    return await exportToExcel(habits, xp)
  } catch (err) {
    return { success: false, reason: err.message }
  }
})

ipcMain.handle('excel:import', async () => {
  try {
    return await importFromExcel()
  } catch (err) {
    return { success: false, reason: err.message }
  }
})

// ── App Lifecycle ──

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.liferpg.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

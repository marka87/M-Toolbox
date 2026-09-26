import { app, BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { registerIpcHandlers } from './ipc'
import { DatabaseService } from './services/database.service'
import { DashboardService } from './services/dashboard.service'
import { WidgetService } from './services/widget.service'
import { SettingsService } from './services/settings.service'
import { TrayService } from './services/tray.service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Prevent unhandled EPIPE and stream errors from crashing Electron or creating popup alerts
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE' || err?.message?.includes('EPIPE')) {
    console.warn('[Process] Safely ignored stream EPIPE:', err.message)
    return
  }
  console.error('[Process] Uncaught Exception:', err)
})

process.stdout?.on('error', (err: any) => {
  if (err?.code === 'EPIPE') return
})

process.stderr?.on('error', (err: any) => {
  if (err?.code === 'EPIPE') return
})

// The built directory structure
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ └─┬ preload
// │   └── index.js
// ├─┬ dist
// │ └── index.html

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
  TrayService.getInstance().setQuitting(true)
})

function createWindow() {
  nativeTheme.themeSource = 'dark'

  const preloadJs = path.join(__dirname, '../preload/index.js')
  const preloadMjs = path.join(__dirname, '../preload/index.mjs')
  const preloadPath = fs.existsSync(preloadMjs) ? preloadMjs : preloadJs

  mainWindow = new BrowserWindow({
    title: 'M-Toolbox',
    width: 1280,
    height: 860,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0f141c',
    frame: false, // Frameless for modern Windows 11 Fluent look
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Load Error] ${errorCode}: ${errorDescription} (${validatedURL})`)
  })

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [Level ${level}] ${message} (${sourceId}:${line})`)
  })

  // Register all typed IPC handlers
  registerIpcHandlers(mainWindow)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Intercept window close when minimizeToTray setting is active
  mainWindow.on('close', (event) => {
    const settings = SettingsService.getInstance().getSettings()
    if (!isQuitting && settings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
      return
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    try {
      WidgetService.getInstance().destroy()
    } catch {
      // ignore
    }
    DashboardService.getInstance().stopMetricsStream()
  })
}

// Hardware acceleration control (must be applied BEFORE app.whenReady)
try {
  const initialSettings = SettingsService.getInstance().getSettings()
  if (initialSettings.hardwareAcceleration === false) {
    console.log('[App] Disabling GPU hardware acceleration per user settings')
    app.disableHardwareAcceleration()
  }
} catch (err) {
  console.warn('[App] Failed to check hardware acceleration setting:', err)
}

app.whenReady().then(() => {
  // Initialize Database
  DatabaseService.getInstance()

  createWindow()

  if (mainWindow) {
    TrayService.getInstance().init(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      if (mainWindow) {
        TrayService.getInstance().init(mainWindow)
      }
    } else if (mainWindow) {
      TrayService.getInstance().showMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  DashboardService.getInstance().stopMetricsStream()
  DatabaseService.getInstance().close()
  TrayService.getInstance().destroy()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

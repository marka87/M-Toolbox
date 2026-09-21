import { ipcMain, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/channels'
import { DashboardService } from '../services/dashboard.service'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const dashboardService = DashboardService.getInstance()

  // Dashboard IPC: Get full system information
  ipcMain.handle(IPC_CHANNELS.DASHBOARD.GET_SYSTEM_INFO, async (_, forceRefresh?: boolean) => {
    return await dashboardService.getSystemInfo(forceRefresh)
  })

  // Dashboard IPC: Start metrics stream
  ipcMain.handle(IPC_CHANNELS.DASHBOARD.START_METRICS_STREAM, () => {
    dashboardService.startMetricsStream((metrics) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, metrics)
      }
    })
    return true
  })

  // Dashboard IPC: Stop metrics stream
  ipcMain.handle(IPC_CHANNELS.DASHBOARD.STOP_METRICS_STREAM, () => {
    dashboardService.stopMetricsStream()
    return true
  })

  // Window Controls IPC
  ipcMain.handle(IPC_CHANNELS.SYSTEM.MINIMIZE_WINDOW, () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.MAXIMIZE_WINDOW, () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.CLOSE_WINDOW, () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, async (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      await shell.openExternal(url)
    }
  })
}


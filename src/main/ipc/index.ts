import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/channels'
import { DashboardService } from '../services/dashboard.service'
import { SoftwareService } from '../services/software.service'
import { BackupService } from '../services/backup.service'
import { driverService } from '../services/driver.service'
import { cleanupService } from '../services/cleanup.service'

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

  // Software Center IPC
  const softwareService = SoftwareService.getInstance()

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.GET_CATALOG, async () => {
    return await softwareService.getCatalog()
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.GET_INSTALLED, async () => {
    return await softwareService.getInstalledPackages()
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.GET_UPDATES, async () => {
    return await softwareService.getAvailableUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.INSTALL, async (_, packageId: string) => {
    return await softwareService.installPackage(packageId, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, event)
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.UNINSTALL, async (_, packageId: string) => {
    return await softwareService.uninstallPackage(packageId, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, event)
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.UPGRADE, async (_, packageId: string) => {
    return await softwareService.upgradePackage(packageId, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, event)
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.SOFTWARE.UPGRADE_ALL, async () => {
    return await softwareService.upgradeAll((event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, event)
      }
    })
  })

  // Backup & Restore IPC
  const backupService = BackupService.getInstance()

  ipcMain.handle(IPC_CHANNELS.BACKUP.CREATE_BACKUP, async (_, customFilePath?: string) => {
    return await backupService.createBackup(customFilePath, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.BACKUP.PROGRESS_EVENT, event)
      }
    })
  })

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.RESTORE_BACKUP,
    async (_, filePathOrPayload: any, selection: any) => {
      return await backupService.restoreBackup(filePathOrPayload, selection, (event) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.BACKUP.PROGRESS_EVENT, event)
        }
      })
    }
  )

  ipcMain.handle(IPC_CHANNELS.BACKUP.PREVIEW_BACKUP, async (_, filePath: string) => {
    return await backupService.previewBackup(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.BACKUP.LIST_LOCAL_BACKUPS, async () => {
    return await backupService.listLocalBackups()
  })

  ipcMain.handle(IPC_CHANNELS.BACKUP.SELECT_BACKUP_FILE, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'M-Toolbox Backup-Datei auswählen',
      properties: ['openFile'],
      filters: [{ name: 'M-Toolbox Backup (*.json)', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.BACKUP.SAVE_BACKUP_DIALOG, async () => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'M-Toolbox Backup speichern unter',
      defaultPath: `M-Toolbox-Backup-${dateStr}.json`,
      filters: [{ name: 'M-Toolbox Backup (*.json)', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) {
      return null
    }
    return result.filePath
  })

  // Driver Center IPC
  ipcMain.handle(IPC_CHANNELS.DRIVER.GET_DATA, async () => {
    return await driverService.getDevicesAndDrivers()
  })

  ipcMain.handle(
    IPC_CHANNELS.DRIVER.EXPORT_DRIVERS,
    async (_, targetDir: string, infName?: string) => {
      return await driverService.exportDrivers(targetDir, infName, (log) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.DRIVER.PROGRESS_EVENT, log)
        }
      })
    }
  )

  ipcMain.handle(IPC_CHANNELS.DRIVER.SELECT_EXPORT_DIR, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Zielordner für Treiber-Export auswählen',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.SCAN_HARDWARE, async () => {
    return await driverService.scanHardware()
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.OPEN_DEVICE_MANAGER, async () => {
    driverService.openDeviceManager()
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.RESTART_DEVICE, async (_, instanceId: string) => {
    return await driverService.restartDevice(instanceId)
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.GET_GPU_INFO, async () => {
    return await driverService.getGpuInfo()
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.CHECK_WINDOWS_UPDATE, async () => {
    return await driverService.checkWindowsUpdateDrivers()
  })

  ipcMain.handle(IPC_CHANNELS.DRIVER.SEARCH_ONLINE, async (_, query: string) => {
    const url = driverService.getDriverSearchUrl(query)
    await shell.openExternal(url)
    return url
  })

  // Cleanup Center IPC
  ipcMain.handle(IPC_CHANNELS.CLEANUP.SCAN, async () => {
    return await cleanupService.scan()
  })

  ipcMain.handle(IPC_CHANNELS.CLEANUP.CLEAN, async (_, categoryIds: string[]) => {
    return await cleanupService.clean(categoryIds, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.CLEANUP.PROGRESS_EVENT, event)
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.CLEANUP.OPEN_STORAGE_SENSE, async () => {
    cleanupService.openStorageSense()
  })
}


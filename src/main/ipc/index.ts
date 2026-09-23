import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/channels'
import { DashboardService } from '../services/dashboard.service'
import { SoftwareService } from '../services/software.service'
import { BackupService } from '../services/backup.service'
import { driverService } from '../services/driver.service'
import { cleanupService } from '../services/cleanup.service'
import { repairService, REPAIR_ACTIONS } from '../services/repair.service'
import { tweakService } from '../services/tweak.service'
import { networkService } from '../services/network.service'
import { advancedService } from '../services/advanced.service'
import { settingsService } from '../services/settings.service'
import { reinstallService } from '../services/reinstall.service'
import { ramService } from '../services/ram.service'
import { databaseService } from '../services/database.service'
import { batteryService } from '../services/battery.service'
import { WidgetService } from '../services/widget.service'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const dashboardService = DashboardService.getInstance()
  const widgetService = WidgetService.getInstance()
  widgetService.setMainWindow(mainWindow)

  // Dashboard IPC: Get full system information
  ipcMain.handle(IPC_CHANNELS.DASHBOARD.GET_SYSTEM_INFO, async (_, forceRefresh?: boolean) => {
    return await dashboardService.getSystemInfo(forceRefresh)
  })

  // Dashboard IPC: Start metrics stream
  ipcMain.handle(IPC_CHANNELS.DASHBOARD.START_METRICS_STREAM, () => {
    dashboardService.startMetricsStream((metrics) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, metrics)
        }
      })
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

  ipcMain.handle(IPC_CHANNELS.REINSTALL.DISCOVER, async () =>
    reinstallService.discover((event) => {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.REINSTALL.PROGRESS_EVENT, event)
    })
  )
  ipcMain.handle(IPC_CHANNELS.REINSTALL.CREATE, async (_, filePath: string, options) =>
    reinstallService.createArchive(filePath, options, (event) => {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.REINSTALL.PROGRESS_EVENT, event)
    })
  )
  ipcMain.handle(IPC_CHANNELS.REINSTALL.PREVIEW, async (_, filePath: string) => reinstallService.preview(filePath))
  ipcMain.handle(IPC_CHANNELS.REINSTALL.RESTORE, async (_, filePath: string, options?: ReinstallRestoreOptions) =>
    reinstallService.restore(filePath, options, (event) => {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.REINSTALL.PROGRESS_EVENT, event)
    })
  )
  ipcMain.handle(IPC_CHANNELS.REINSTALL.HISTORY, () => reinstallService.getHistory())
  ipcMain.handle(IPC_CHANNELS.REINSTALL.SELECT_FILE, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'M-Toolbox Reinstall-Archiv auswählen',
      properties: ['openFile'],
      filters: [{ name: 'M-Toolbox Archiv (*.mtoolbox)', extensions: ['mtoolbox'] }]
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  ipcMain.handle(IPC_CHANNELS.REINSTALL.SAVE_DIALOG, async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'M-Toolbox Reinstall-Archiv speichern',
      defaultPath: `M-Toolbox-Reinstall-${new Date().toISOString().slice(0, 10)}.mtoolbox`,
      filters: [{ name: 'M-Toolbox Archiv (*.mtoolbox)', extensions: ['mtoolbox'] }]
    })
    return result.canceled ? null : result.filePath ?? null
  })

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
      title: 'M-Toolbox Sicherungsdatei auswählen',
      properties: ['openFile'],
      filters: [
        { name: 'Alle M-Toolbox Sicherungen (*.json, *.mtoolbox)', extensions: ['json', 'mtoolbox', 'zip'] },
        { name: 'Schnell-Backup (*.json)', extensions: ['json'] },
        { name: 'Reinstall-Bundle (*.mtoolbox)', extensions: ['mtoolbox', 'zip'] }
      ]
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

  // Repair Center IPC
  ipcMain.handle(IPC_CHANNELS.REPAIR.GET_HEALTH, async () => {
    const health = await repairService.getSystemHealth()
    return {
      health,
      actions: REPAIR_ACTIONS
    }
  })

  ipcMain.handle(IPC_CHANNELS.REPAIR.RUN_ACTION, async (_, actionId: string) => {
    return await repairService.runAction(actionId, (event) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.REPAIR.PROGRESS_EVENT, event)
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.REPAIR.RESTART_AS_ADMIN, async () => {
    await repairService.restartAsAdmin()
  })

  // Tweaks IPC
  ipcMain.handle(IPC_CHANNELS.TWEAKS.GET_ALL, async () => {
    return await tweakService.getAllTweaks()
  })

  ipcMain.handle(IPC_CHANNELS.TWEAKS.SET_TWEAK, async (_, tweakId: string, value: boolean) => {
    return await tweakService.setTweak(tweakId, value)
  })

  ipcMain.handle(IPC_CHANNELS.TWEAKS.APPLY_RECOMMENDED, async () => {
    return await tweakService.applyRecommended()
  })

  ipcMain.handle(IPC_CHANNELS.TWEAKS.RESTART_EXPLORER, async () => {
    return await tweakService.restartExplorer()
  })

  // Network Toolkit IPC
  ipcMain.handle(IPC_CHANNELS.NETWORK.GET_DIAGNOSTICS, async () => {
    return await networkService.getDiagnostics()
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.GET_WAN_IP, async () => {
    return await networkService.getWanIp()
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.PING_TARGETS, async (_, customHost?: string) => {
    return await networkService.pingTargets(customHost)
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.BENCHMARK_DNS, async (_, domain?: string) => {
    return await networkService.benchmarkDns(domain)
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.SCAN_PORTS, async (_, target: string, ports: number[]) => {
    return await networkService.scanPorts(target, ports)
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.FLUSH_DNS, async () => {
    return await networkService.flushDns()
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.RENEW_IP, async () => {
    return await networkService.renewIp()
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK.OPEN_NETWORK_CONNECTIONS, async () => {
    await networkService.openNetworkConnections()
  })

  // Advanced Tools IPC
  ipcMain.handle(IPC_CHANNELS.ADVANCED.GET_TOOLS, async () => {
    return advancedService.getTools()
  })

  ipcMain.handle(IPC_CHANNELS.ADVANCED.LAUNCH_TOOL, async (_, toolId: string) => {
    return await advancedService.launchTool(toolId)
  })

  ipcMain.handle(IPC_CHANNELS.ADVANCED.GET_STARTUP_ITEMS, async () => {
    return await advancedService.getStartupItems()
  })

  ipcMain.handle(IPC_CHANNELS.ADVANCED.DELETE_STARTUP_ITEM, async (_, itemId: string) => {
    return await advancedService.deleteStartupItem(itemId)
  })

  ipcMain.handle(IPC_CHANNELS.ADVANCED.GET_HOSTS_FILE, async () => {
    return await advancedService.getHostsFile()
  })

  ipcMain.handle(IPC_CHANNELS.ADVANCED.SAVE_HOSTS_FILE, async (_, entries: any) => {
    return await advancedService.saveHostsFile(entries)
  })

  // Settings IPC
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_SETTINGS, async () => {
    return await settingsService.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SAVE_SETTINGS, async (_, partialSettings: Partial<AppSettings>) => {
    return await settingsService.saveSettings(partialSettings)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.CHECK_UPDATES, async () => {
    return await settingsService.checkUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_APP_INFO, async () => {
    return await settingsService.getAppInfo()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.OPEN_USER_DATA_FOLDER, async () => {
    await settingsService.openUserDataFolder()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.CLEAR_CACHE, async () => {
    return await settingsService.clearCache()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS.RESET_SETTINGS, async () => {
    return await settingsService.resetSettings()
  })

  // RAM Guardian IPC
  ipcMain.handle(IPC_CHANNELS.RAM.GET_STATS, async () => {
    return await ramService.getLiveStats()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.GET_TOP_PROCESSES, async () => {
    return await ramService.getTopProcesses()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.GET_HYGIENE, async () => {
    return await ramService.getAppHygiene()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.GET_RECOMMENDATIONS, async () => {
    return await ramService.getRecommendations()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.GET_HEALTH_SCORE, async () => {
    return await ramService.getHealthScore()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.GET_HISTORY_24H, async () => {
    return databaseService.getRamHistory24h()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.CLEAN_WINDOWS, async () => {
    return await ramService.cleanWindows()
  })

  ipcMain.handle(IPC_CHANNELS.RAM.DISABLE_STARTUP, async (_, itemId: string) => {
    return await ramService.disableStartupItem(itemId)
  })

  // Battery Manager IPC
  ipcMain.handle(IPC_CHANNELS.BATTERY.GET_INFO, async (_, includeDrainProcesses?: boolean) => {
    return await batteryService.getBatteryInfo(includeDrainProcesses ?? true)
  })

  ipcMain.handle(IPC_CHANNELS.BATTERY.SET_POWER_PLAN, async (_, guid: string) => {
    return await batteryService.setPowerPlan(guid)
  })

  ipcMain.handle(IPC_CHANNELS.BATTERY.GENERATE_REPORT, async () => {
    return await batteryService.generateHtmlReport()
  })

  ipcMain.handle(IPC_CHANNELS.BATTERY.KILL_PROCESS, async (_, pid: number) => {
    return await batteryService.killProcess(pid)
  })

  // Desktop Widget IPC
  ipcMain.handle(IPC_CHANNELS.WIDGET.TOGGLE, () => {
    return widgetService.toggle()
  })

  ipcMain.handle(IPC_CHANNELS.WIDGET.GET_STATE, () => {
    return widgetService.getState()
  })

  ipcMain.handle(IPC_CHANNELS.WIDGET.SET_ALWAYS_ON_TOP, (_, alwaysOnTop: boolean) => {
    widgetService.setAlwaysOnTop(alwaysOnTop)
  })

  ipcMain.handle(IPC_CHANNELS.WIDGET.RESTORE_MAIN, () => {
    widgetService.restoreMainWindow()
  })

  ipcMain.handle(IPC_CHANNELS.WIDGET.CLOSE, () => {
    widgetService.closeWidget()
  })
}


import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/channels'
import type {
  SystemInfo,
  LiveMetrics,
  SoftwarePackage,
  InstalledPackage,
  PackageUpdate,
  OperationLogEvent,
  BackupPayload,
  BackupSummary,
  RestoreSelection,
  DeviceItem,
  DriverPackage,
  DriverStats,
  DriverExportResult,
  DriverOperationResult
} from '../shared/types'

export interface MToolboxAPI {
  dashboard: {
    getSystemInfo: (forceRefresh?: boolean) => Promise<SystemInfo>
    startMetricsStream: () => Promise<boolean>
    stopMetricsStream: () => Promise<boolean>
    onLiveMetrics: (callback: (metrics: LiveMetrics) => void) => () => void
  }
  software: {
    getCatalog: () => Promise<SoftwarePackage[]>
    getInstalled: () => Promise<InstalledPackage[]>
    getUpdates: () => Promise<PackageUpdate[]>
    install: (packageId: string) => Promise<{ success: boolean; error?: string }>
    uninstall: (packageId: string) => Promise<{ success: boolean; error?: string }>
    upgrade: (packageId: string) => Promise<{ success: boolean; error?: string }>
    upgradeAll: () => Promise<{ success: boolean; error?: string }>
    onProgress: (callback: (event: OperationLogEvent) => void) => () => void
  }
  backup: {
    createBackup: (customFilePath?: string) => Promise<{ success: boolean; filePath: string; payload: BackupPayload; error?: string }>
    restoreBackup: (filePathOrPayload: string | BackupPayload, selection: RestoreSelection) => Promise<{ success: boolean; error?: string }>
    previewBackup: (filePath: string) => Promise<BackupSummary>
    listLocalBackups: () => Promise<BackupSummary[]>
    selectBackupFile: () => Promise<string | null>
    saveBackupDialog: () => Promise<string | null>
    onProgress: (callback: (event: OperationLogEvent) => void) => () => void
  }
  driver: {
    getData: () => Promise<{ devices: DeviceItem[]; packages: DriverPackage[]; stats: DriverStats }>
    exportDrivers: (targetDir: string, infName?: string) => Promise<DriverExportResult>
    selectExportDir: () => Promise<string | null>
    scanHardware: () => Promise<DriverOperationResult>
    openDeviceManager: () => Promise<void>
    restartDevice: (instanceId: string) => Promise<DriverOperationResult>
    onProgress: (callback: (log: string) => void) => () => void
  }
  system: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
}

const api: MToolboxAPI = {
  dashboard: {
    getSystemInfo: (forceRefresh) => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_SYSTEM_INFO, forceRefresh)
    },
    startMetricsStream: () => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.START_METRICS_STREAM)
    },
    stopMetricsStream: () => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.STOP_METRICS_STREAM)
    },
    onLiveMetrics: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, metrics: LiveMetrics) => {
        callback(metrics)
      }
      ipcRenderer.on(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, listener)
      }
    }
  },
  software: {
    getCatalog: () => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.GET_CATALOG),
    getInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.GET_INSTALLED),
    getUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.GET_UPDATES),
    install: (packageId: string) => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.INSTALL, packageId),
    uninstall: (packageId: string) => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.UNINSTALL, packageId),
    upgrade: (packageId: string) => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.UPGRADE, packageId),
    upgradeAll: () => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.UPGRADE_ALL),
    onProgress: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: OperationLogEvent) => {
        callback(event)
      }
      ipcRenderer.on(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.SOFTWARE.OPERATION_PROGRESS, listener)
      }
    }
  },
  backup: {
    createBackup: (customFilePath?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.CREATE_BACKUP, customFilePath),
    restoreBackup: (filePathOrPayload: any, selection: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.RESTORE_BACKUP, filePathOrPayload, selection),
    previewBackup: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.PREVIEW_BACKUP, filePath),
    listLocalBackups: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.LIST_LOCAL_BACKUPS),
    selectBackupFile: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.SELECT_BACKUP_FILE),
    saveBackupDialog: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.SAVE_BACKUP_DIALOG),
    onProgress: (callback: (event: OperationLogEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: OperationLogEvent) => {
        callback(event)
      }
      ipcRenderer.on(IPC_CHANNELS.BACKUP.PROGRESS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.BACKUP.PROGRESS_EVENT, listener)
      }
    }
  },
  driver: {
    getData: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.GET_DATA),
    exportDrivers: (targetDir: string, infName?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DRIVER.EXPORT_DRIVERS, targetDir, infName),
    selectExportDir: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.SELECT_EXPORT_DIR),
    scanHardware: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.SCAN_HARDWARE),
    openDeviceManager: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.OPEN_DEVICE_MANAGER),
    restartDevice: (instanceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DRIVER.RESTART_DEVICE, instanceId),
    onProgress: (callback: (log: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, log: string) => {
        callback(log)
      }
      ipcRenderer.on(IPC_CHANNELS.DRIVER.PROGRESS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DRIVER.PROGRESS_EVENT, listener)
      }
    }
  },
  system: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MINIMIZE_WINDOW),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MAXIMIZE_WINDOW),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.CLOSE_WINDOW),
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, url),
  }
}

contextBridge.exposeInMainWorld('mToolbox', api)

declare global {
  interface Window {
    mToolbox: MToolboxAPI
  }
}


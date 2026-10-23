import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/channels'
import type {
  SystemInfo,
  LiveMetrics,
  TelemetryMetric,
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
  CleanupScanResult,
  CleanupProgressEvent,
  CleanupResult,
  SystemHealthStatus,
  RepairActionItem,
  RepairLogEvent,
  RepairResult,
  TweakItem,
  TweakApplyResult,
  BatchTweakResult,
  StartupItem,
  HostsEntry,
  HostsFileContent,
  AppSettings,
  UpdateCheckResult,
  AppVersionInfo,
  WidgetState,
  BloatwareApp,
  BloatwareRemovalResult,
  BloatwareBatchProgress
} from '../shared/types'
import type {
  ReinstallArchiveSummary,
  ReinstallCreateOptions,
  ReinstallProgress,
  ReinstallRestoreOptions,
  ReinstallResult
} from '../shared/reinstall.types'
import type { BatteryInfo, BatteryReportResult } from '../shared/battery.types'

export interface MToolboxAPI {
  dashboard: {
    getSystemInfo: (forceRefresh?: boolean) => Promise<SystemInfo>
    startMetricsStream: (options?: { metrics?: TelemetryMetric[] }) => Promise<boolean>
    stopMetricsStream: () => Promise<boolean>
    onLiveMetrics: (callback: (metrics: LiveMetrics) => void) => () => void
  }
  software: {
    getCatalog: () => Promise<SoftwarePackage[]>
    getInstalled: () => Promise<InstalledPackage[]>
    getUpdates: () => Promise<PackageUpdate[]>
    search: (query: string) => Promise<SoftwarePackage[]>
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
    deleteBackup: (filePath: string) => Promise<boolean>
    openBackupsFolder: () => Promise<void>
    selectBackupFile: () => Promise<string | null>
    saveBackupDialog: () => Promise<string | null>
    onProgress: (callback: (event: OperationLogEvent) => void) => () => void
  }
  reinstall: {
    discover: () => Promise<{ apps: InstalledPackage[]; drivers: { devices: DeviceItem[]; packages: DriverPackage[]; stats: DriverStats }; system: Record<string, unknown> }>
    create: (filePath: string, options?: ReinstallCreateOptions) => Promise<ReinstallResult>
    preview: (filePath: string) => Promise<ReinstallArchiveSummary>
    restore: (filePath: string, options?: ReinstallRestoreOptions) => Promise<ReinstallResult>
    selectFile: () => Promise<string | null>
    saveDialog: () => Promise<string | null>
    history: () => Promise<Array<{ createdAt: string; status: string; details?: string }>>
    onProgress: (callback: (event: ReinstallProgress) => void) => () => void
  }
  cleanup: {
    scan: () => Promise<CleanupScanResult>
    clean: (categoryIds: string[]) => Promise<CleanupResult>
    openStorageSense: () => Promise<void>
    onProgress: (callback: (event: CleanupProgressEvent) => void) => () => void
  }
  repair: {
    getHealth: () => Promise<{ health: SystemHealthStatus; actions: RepairActionItem[] }>
    runAction: (actionId: string) => Promise<RepairResult>
    restartAsAdmin: () => Promise<void>
    onProgress: (callback: (event: RepairLogEvent) => void) => () => void
  }
  tweaks: {
    getAll: () => Promise<TweakItem[]>
    setTweak: (tweakId: string, value: boolean) => Promise<TweakApplyResult>
    applyRecommended: () => Promise<BatchTweakResult>
    restartExplorer: () => Promise<{ success: boolean; message: string }>
  }
  advanced: {
    getStartupItems: () => Promise<StartupItem[]>
    deleteStartupItem: (itemId: string) => Promise<{ success: boolean; message: string }>
    setStartupItemEnabled: (
      itemId: string,
      enabled: boolean
    ) => Promise<{ success: boolean; message: string }>
    getHostsFile: () => Promise<HostsFileContent>
    saveHostsFile: (entries: HostsEntry[]) => Promise<{ success: boolean; message: string }>
  }
  settings: {
    getSettings: () => Promise<AppSettings>
    saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
    checkUpdates: () => Promise<UpdateCheckResult>
    getAppInfo: () => Promise<AppVersionInfo>
    openUserDataFolder: () => Promise<void>
    clearCache: () => Promise<{ success: boolean; message: string }>
    resetSettings: () => Promise<AppSettings>
  }
  battery: {
    getInfo: () => Promise<BatteryInfo>
    setPowerPlan: (guid: string) => Promise<{ success: boolean; message: string }>
    generateReport: () => Promise<BatteryReportResult>
  }
  bloatware: {
    scan: () => Promise<BloatwareApp[]>
    uninstall: (appId: string) => Promise<BloatwareRemovalResult>
    batchUninstall: (appIds: string[]) => Promise<{ succeeded: string[]; failed: string[] }>
    onProgress: (callback: (event: BloatwareBatchProgress) => void) => () => void
  }
  system: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    relaunch: () => Promise<void>
    restartAsAdmin: () => Promise<void>
    openExternal: (url: string) => Promise<void>
    onVisibilityChange: (callback: (visible: boolean) => void) => () => void
  }
  widget: {
    toggle: () => Promise<boolean>
    getState: () => Promise<WidgetState>
    setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
    setClickThrough: (clickThrough: boolean) => Promise<void>
    setOpacity: (opacity: number) => Promise<void>
    restoreMainWindow: () => Promise<void>
    close: () => Promise<void>
    setHeight: (height: number) => Promise<void>
  }
}

const api: MToolboxAPI = {
  dashboard: {
    getSystemInfo: (forceRefresh) => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_SYSTEM_INFO, forceRefresh)
    },
    startMetricsStream: (options?: { metrics?: TelemetryMetric[] }) => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.START_METRICS_STREAM, options)
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
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.SOFTWARE.SEARCH, query),
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
    deleteBackup: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.DELETE_BACKUP, filePath),
    openBackupsFolder: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP.OPEN_BACKUPS_FOLDER),
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
  reinstall: {
    discover: () => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.DISCOVER),
    create: (filePath, options) => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.CREATE, filePath, options),
    preview: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.PREVIEW, filePath),
    restore: (filePath, options) => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.RESTORE, filePath, options),
    selectFile: () => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.SELECT_FILE),
    saveDialog: () => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.SAVE_DIALOG),
    history: () => ipcRenderer.invoke(IPC_CHANNELS.REINSTALL.HISTORY),
    onProgress: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ReinstallProgress) => callback(event)
      ipcRenderer.on(IPC_CHANNELS.REINSTALL.PROGRESS_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.REINSTALL.PROGRESS_EVENT, listener)
    }
  },
  cleanup: {
    scan: () => ipcRenderer.invoke(IPC_CHANNELS.CLEANUP.SCAN),
    clean: (categoryIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.CLEANUP.CLEAN, categoryIds),
    openStorageSense: () => ipcRenderer.invoke(IPC_CHANNELS.CLEANUP.OPEN_STORAGE_SENSE),
    onProgress: (callback: (event: CleanupProgressEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: CleanupProgressEvent) => {
        callback(event)
      }
      ipcRenderer.on(IPC_CHANNELS.CLEANUP.PROGRESS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.CLEANUP.PROGRESS_EVENT, listener)
      }
    }
  },
  repair: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR.GET_HEALTH),
    runAction: (actionId: string) => ipcRenderer.invoke(IPC_CHANNELS.REPAIR.RUN_ACTION, actionId),
    restartAsAdmin: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR.RESTART_AS_ADMIN),
    onProgress: (callback: (event: RepairLogEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: RepairLogEvent) => {
        callback(event)
      }
      ipcRenderer.on(IPC_CHANNELS.REPAIR.PROGRESS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.REPAIR.PROGRESS_EVENT, listener)
      }
    }
  },
  tweaks: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TWEAKS.GET_ALL),
    setTweak: (tweakId: string, value: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.TWEAKS.SET_TWEAK, tweakId, value),
    applyRecommended: () => ipcRenderer.invoke(IPC_CHANNELS.TWEAKS.APPLY_RECOMMENDED),
    restartExplorer: () => ipcRenderer.invoke(IPC_CHANNELS.TWEAKS.RESTART_EXPLORER)
  },
  advanced: {
    getStartupItems: () => ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.GET_STARTUP_ITEMS),
    deleteStartupItem: (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.DELETE_STARTUP_ITEM, itemId),
    setStartupItemEnabled: (itemId: string, enabled: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.TOGGLE_STARTUP_ITEM, itemId, enabled),
    getHostsFile: () => ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.GET_HOSTS_FILE),
    saveHostsFile: (entries: HostsEntry[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.SAVE_HOSTS_FILE, entries)
  },
  settings: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_SETTINGS),
    saveSettings: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SAVE_SETTINGS, settings),
    checkUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.CHECK_UPDATES),
    getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_APP_INFO),
    openUserDataFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.OPEN_USER_DATA_FOLDER),
    clearCache: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.CLEAR_CACHE),
    resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.RESET_SETTINGS)
  },
  battery: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.BATTERY.GET_INFO),
    setPowerPlan: (guid: string) => ipcRenderer.invoke(IPC_CHANNELS.BATTERY.SET_POWER_PLAN, guid),
    generateReport: () => ipcRenderer.invoke(IPC_CHANNELS.BATTERY.GENERATE_REPORT)
  },
  bloatware: {
    scan: () => ipcRenderer.invoke(IPC_CHANNELS.BLOATWARE.SCAN),
    uninstall: (appId: string) => ipcRenderer.invoke(IPC_CHANNELS.BLOATWARE.UNINSTALL, appId),
    batchUninstall: (appIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.BLOATWARE.BATCH_UNINSTALL, appIds),
    onProgress: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: BloatwareBatchProgress) => {
        callback(event)
      }
      ipcRenderer.on(IPC_CHANNELS.BLOATWARE.PROGRESS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.BLOATWARE.PROGRESS_EVENT, listener)
      }
    }
  },
  system: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MINIMIZE_WINDOW),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MAXIMIZE_WINDOW),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.CLOSE_WINDOW),
    relaunch: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.RELAUNCH_APP),
    restartAsAdmin: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.RESTART_AS_ADMIN),
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, url),
    onVisibilityChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, visible: boolean) => {
        callback(visible)
      }
      ipcRenderer.on(IPC_CHANNELS.SYSTEM.WINDOW_VISIBILITY_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM.WINDOW_VISIBILITY_EVENT, listener)
      }
    }
  },
  widget: {
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.TOGGLE),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.GET_STATE),
    setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.SET_ALWAYS_ON_TOP, alwaysOnTop),
    setClickThrough: (clickThrough: boolean) => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.SET_CLICK_THROUGH, clickThrough),
    setOpacity: (opacity: number) => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.SET_OPACITY, opacity),
    restoreMainWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.RESTORE_MAIN),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.CLOSE),
    setHeight: (height: number) => ipcRenderer.invoke(IPC_CHANNELS.WIDGET.SET_HEIGHT, height)
  }
}

contextBridge.exposeInMainWorld('mToolbox', api)

declare global {
  interface Window {
    mToolbox: MToolboxAPI
  }
}

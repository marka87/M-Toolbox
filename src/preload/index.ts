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
  DriverOperationResult,
  GpuInfo,
  WindowsUpdateDriver,
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
  NetworkDiagnosticsData,
  WanIpInfo,
  PingResultItem,
  DnsBenchmarkItem,
  PortScanReport,
  AdvancedToolItem,
  StartupItem,
  HostsEntry,
  HostsFileContent
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
    getGpuInfo: () => Promise<GpuInfo | null>
    checkWindowsUpdate: () => Promise<WindowsUpdateDriver[]>
    searchOnline: (query: string) => Promise<string>
    onProgress: (callback: (log: string) => void) => () => void
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
  network: {
    getDiagnostics: () => Promise<NetworkDiagnosticsData>
    getWanIp: () => Promise<WanIpInfo>
    pingTargets: (customHost?: string) => Promise<PingResultItem[]>
    benchmarkDns: (domain?: string) => Promise<DnsBenchmarkItem[]>
    scanPorts: (target: string, ports: number[]) => Promise<PortScanReport>
    flushDns: () => Promise<{ success: boolean; message: string }>
    renewIp: () => Promise<{ success: boolean; message: string }>
    openNetworkConnections: () => Promise<void>
  }
  advanced: {
    getTools: () => Promise<AdvancedToolItem[]>
    launchTool: (toolId: string) => Promise<{ success: boolean; message: string }>
    getStartupItems: () => Promise<StartupItem[]>
    deleteStartupItem: (itemId: string) => Promise<{ success: boolean; message: string }>
    getHostsFile: () => Promise<HostsFileContent>
    saveHostsFile: (entries: HostsEntry[]) => Promise<{ success: boolean; message: string }>
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
    getGpuInfo: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.GET_GPU_INFO),
    checkWindowsUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.CHECK_WINDOWS_UPDATE),
    searchOnline: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.DRIVER.SEARCH_ONLINE, query),
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
  network: {
    getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK.GET_DIAGNOSTICS),
    getWanIp: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK.GET_WAN_IP),
    pingTargets: (customHost?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK.PING_TARGETS, customHost),
    benchmarkDns: (domain?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK.BENCHMARK_DNS, domain),
    scanPorts: (target: string, ports: number[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK.SCAN_PORTS, target, ports),
    flushDns: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK.FLUSH_DNS),
    renewIp: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK.RENEW_IP),
    openNetworkConnections: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK.OPEN_NETWORK_CONNECTIONS)
  },
  advanced: {
    getTools: () => ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.GET_TOOLS),
    launchTool: (toolId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.LAUNCH_TOOL, toolId),
    getStartupItems: () => ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.GET_STARTUP_ITEMS),
    deleteStartupItem: (itemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.DELETE_STARTUP_ITEM, itemId),
    getHostsFile: () => ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.GET_HOSTS_FILE),
    saveHostsFile: (entries: HostsEntry[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADVANCED.SAVE_HOSTS_FILE, entries)
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


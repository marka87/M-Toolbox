export interface ReinstallManifest {
  format: 'mtoolbox-reinstall'
  formatVersion: '2.0'
  createdBy: string
  createdAt: string
  computerName: string
  windowsVersion?: string
  build?: string
  backupId: string
  appCount: number
  driverCount: number
  tweakCount?: number
  hasPhysicalDrivers?: boolean
  sections: Array<'apps' | 'drivers' | 'tweaks' | 'system' | 'wifi'>
}

export interface ReinstallProgress {
  phase: 'discover' | 'archive' | 'restore' | 'drivers' | 'tweaks' | 'apps'
  percent: number
  message: string
}

export interface ReinstallArchiveSummary {
  filePath: string
  manifest: ReinstallManifest
  appCount: number
  driverCount: number
  tweakCount: number
  hasPhysicalDrivers: boolean
  systemInfo?: Record<string, unknown>
  apps?: Array<{ id: string; name: string; version?: string }>
  tweaks?: string[]
}

export interface ReinstallRestoreOptions {
  apps?: boolean
  drivers?: boolean
  tweaks?: boolean
  selectedAppIds?: string[]
}

export interface ReinstallCreateOptions {
  selectedAppIds?: string[]
  includeDrivers?: boolean
  includeTweaks?: boolean
  includeWifi?: boolean
}

export interface ReinstallResult {
  success: boolean
  filePath?: string
  error?: string
  installedApps?: number
  installedDrivers?: number
  appliedTweaks?: number
}

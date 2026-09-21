export interface OSInfo {
  name: string
  edition: string
  version: string
  buildNumber: string
  installDate: string
  arch: string
  uptimeSeconds: number
}

export interface ActivationInfo {
  isActivated: boolean
  statusText: string
  licenseType: string
}

export interface ComputerInfo {
  name: string
  workgroupOrDomain: string
  isDomainJoined: boolean
}

export interface CPUInfo {
  name: string
  manufacturer: string
  cores: number
  logicalProcessors: number
  maxClockSpeedMHz: number
}

export interface GPUInfo {
  name: string
  driverVersion: string
  adapterRAMMB: number
  status: string
}

export interface RAMInfo {
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usagePercent: number
  speedMHz: number
  type: string
  slotsUsed: number
  totalSlots: number
}

export interface DiskVolume {
  driveLetter: string
  label: string
  fileSystem: string
  sizeBytes: number
  freeBytes: number
  usedBytes: number
  usagePercent: number
  isSystemDrive: boolean
}

export interface PhysicalDisk {
  friendlyName: string
  mediaType: string // SSD, NVMe, HDD, Unspecified
  healthStatus: 'Healthy' | 'Warning' | 'Unhealthy' | 'Unknown'
  sizeBytes: number
  busType: string
}

export interface BIOSInfo {
  manufacturer: string
  version: string
  releaseDate: string
  serialNumber: string
}

export interface SecurityInfo {
  tpmPresent: boolean
  tpmEnabled: boolean
  tpmVersion: string
  secureBootEnabled: boolean
}

export interface SystemInfo {
  os: OSInfo
  activation: ActivationInfo
  computer: ComputerInfo
  cpu: CPUInfo
  gpus: GPUInfo[]
  ram: RAMInfo
  disks: PhysicalDisk[]
  volumes: DiskVolume[]
  bios: BIOSInfo
  security: SecurityInfo
}

export interface LiveMetrics {
  cpuUsagePercent: number
  ramUsagePercent: number
  ramUsedGB: number
  ramTotalGB: number
  networkSendKBps: number
  networkReceiveKBps: number
  timestamp: number
}

export type NavigationModule =
  | 'dashboard'
  | 'software'
  | 'backup'
  | 'driver'
  | 'cleanup'
  | 'repair'
  | 'tweaks'
  | 'network'
  | 'advanced'
  | 'settings'

export type SoftwareCategory =
  | 'all'
  | 'browser'
  | 'dev'
  | 'utilities'
  | 'media'
  | 'communication'
  | 'runtimes'
  | 'gaming'

export type SoftwareStatus =
  | 'not_installed'
  | 'installed'
  | 'update_available'
  | 'installing'
  | 'uninstalling'
  | 'upgrading'

export interface SoftwarePackage {
  id: string
  name: string
  description: string
  category: SoftwareCategory
  publisher?: string
  installedVersion?: string
  latestVersion?: string
  status: SoftwareStatus
}

export interface InstalledPackage {
  id: string
  name: string
  version: string
  availableVersion?: string
  source?: string
}

export interface PackageUpdate {
  id: string
  name: string
  currentVersion: string
  availableVersion: string
  source?: string
}

export interface OperationLogEvent {
  type: 'stdout' | 'stderr' | 'info' | 'exit'
  line: string
  packageId?: string
  exitCode?: number
}

export interface BackupWingetPackage {
  id: string
  name: string
  version: string
  source?: string
}

export interface BackupExplorerSettings {
  Hidden?: number
  HideFileExt?: number
  ShowSuperHidden?: number
  LaunchTo?: number
  TaskbarAl?: number
  TaskbarMn?: number
  TaskbarDa?: number
  ShowTaskViewButton?: number
  [key: string]: any
}

export interface BackupFont {
  fileName: string
  fontName?: string
  dataBase64?: string
}

export interface BackupWallpaper {
  originalPath: string
  style: string
  tile: string
  mimeType: string
  dataBase64?: string
}

export interface BackupPowerShellModule {
  name: string
  version: string
}

export interface BackupPayload {
  version: string
  createdAt: string
  computerName: string
  osVersion: string
  winget: BackupWingetPackage[]
  explorer: BackupExplorerSettings
  fonts: BackupFont[]
  wallpaper: BackupWallpaper | null
  powershellModules: BackupPowerShellModule[]
}

export interface RestoreSelection {
  winget: boolean
  explorer: boolean
  fonts: boolean
  wallpaper: boolean
  powershellModules: boolean
}

export interface BackupSummary {
  filePath?: string
  createdAt: string
  computerName: string
  osVersion: string
  wingetCount: number
  explorerSettingsCount: number
  fontsCount: number
  hasWallpaper: boolean
  powershellModulesCount: number
}


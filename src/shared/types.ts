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
  | 'reinstall'
  | 'ram-guardian'
  | 'battery'
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

// -------------------------------------------------------------
// Modul 4: Driver Center Typen
// -------------------------------------------------------------

export type DriverCategory =
  | 'all'
  | 'problems'
  | 'display'
  | 'net'
  | 'media'
  | 'input'
  | 'storage'
  | 'usb'
  | 'system'
  | 'other'

export type DeviceStatus = 'Started' | 'Problem' | 'Disabled' | 'Stopped' | 'Unknown'

export interface DeviceItem {
  instanceId: string
  deviceDescription: string
  className: string
  classGuid: string
  manufacturerName: string
  status: DeviceStatus
  problemCode: string
  problemDescription?: string
  driverName: string
  driverVersion?: string
  driverDate?: string
  driverProvider?: string
  signerName?: string
  category: DriverCategory
  isThirdParty: boolean
}

export interface DriverPackage {
  driverName: string
  originalName: string
  providerName: string
  className: string
  classGuid?: string
  driverVersion: string
  driverDate: string
  signerName: string
  catalogAttributes: string
}

export interface DriverStats {
  totalDevices: number
  problemDevices: number
  thirdPartyDrivers: number
  whqlDrivers: number
}

export interface DriverExportResult {
  success: boolean
  exportedCount: number
  targetDirectory: string
  error?: string
}

export interface DriverOperationResult {
  success: boolean
  message: string
}

export type GpuVendor = 'nvidia' | 'amd' | 'intel' | 'other'

export interface GpuInfo {
  name: string
  driverVersion: string
  driverDate: string
  vendor: GpuVendor
  isOutdated: boolean
  ageYears: number
  vendorDownloadUrl: string
  vendorToolName: string
}

export interface WindowsUpdateDriver {
  title: string
  description?: string
  driverModel?: string
  driverProvider?: string
  driverDate?: string
}

export interface OnlineDriverScanResult {
  gpu: GpuInfo | null
  availableUpdates: WindowsUpdateDriver[]
  scannedAt: string
}

// -------------------------------------------------------------
// Modul 5: Cleanup Center Typen
// -------------------------------------------------------------

export type CleanupGroupId = 'system' | 'browsers' | 'dumps' | 'cache'

export interface CleanupCategoryItem {
  id: string
  name: string
  description: string
  group: CleanupGroupId
  sizeBytes: number
  fileCount: number
  paths: string[]
  riskLevel: 'safe' | 'normal'
  selected: boolean
}

export interface DiskStorageInfo {
  drive: string
  volumeName: string
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usagePercent: number
}

export interface CleanupScanResult {
  categories: CleanupCategoryItem[]
  totalSizeBytes: number
  totalFileCount: number
  disks: DiskStorageInfo[]
  scannedAt: string
}

export interface CleanupProgressEvent {
  categoryId: string
  currentAction: string
  freedBytes: number
  percent: number
}

export interface CleanupResult {
  success: boolean
  freedBytes: number
  deletedFilesCount: number
  skippedFilesCount: number
  cleanedCategories: string[]
  durationMs: number
}

// -------------------------------------------------------------
// Modul 6: Repair Center Typen
// -------------------------------------------------------------

export type RepairCategory =
  | 'all'
  | 'system'
  | 'update'
  | 'network'
  | 'spooler'
  | 'explorer'
  | 'store'

export interface RepairActionItem {
  id: string
  title: string
  description: string
  category: RepairCategory
  requiresAdmin: boolean
  estimatedDuration: string
  riskLevel: 'safe' | 'caution'
}

export interface ServiceHealthItem {
  name: string
  displayName: string
  status: 'running' | 'stopped' | 'unknown'
}

export interface SystemHealthStatus {
  isAdmin: boolean
  services: ServiceHealthItem[]
  networkConnected: boolean
  computerName: string
  osVersion: string
}

export interface RepairLogEvent {
  actionId: string
  text: string
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success'
}

export interface RepairResult {
  actionId: string
  success: boolean
  message: string
  exitCode: number
  durationMs: number
}

// -------------------------------------------------------------
// Modul 7: Tweaks Typen
// -------------------------------------------------------------

export type TweakCategory =
  | 'all'
  | 'explorer'
  | 'taskbar'
  | 'privacy'
  | 'gaming'
  | 'system'

export interface TweakItem {
  id: string
  title: string
  description: string
  category: 'explorer' | 'taskbar' | 'privacy' | 'gaming' | 'system'
  value: boolean
  recommendedValue: boolean
  requiresRestart: 'explorer' | 'pc' | 'none'
  requiresAdmin: boolean
  dangerLevel: 'safe' | 'caution'
}

export interface TweakApplyResult {
  tweakId: string
  success: boolean
  newValue: boolean
  message: string
  requiresRestart: 'explorer' | 'pc' | 'none'
}

export interface BatchTweakResult {
  success: boolean
  updatedCount: number
  requiresRestart: boolean
  failedIds: string[]
}

// -------------------------------------------------------------
// Modul 8: Netzwerk Toolkit Typen
// -------------------------------------------------------------

export interface NetworkAdapterInfo {
  id: string
  name: string
  description: string
  status: 'Up' | 'Down' | 'Unknown'
  linkSpeed: string
  macAddress: string
  ipv4Address: string
  ipv6Address: string
  gateway: string
  dnsServers: string[]
  isPrimary: boolean
}

export interface WanIpInfo {
  ip: string | null
  city?: string
  region?: string
  country?: string
  org?: string
  isOnline: boolean
}

export interface PingResultItem {
  target: string
  name: string
  isAlive: boolean
  latencyMs: number
  minMs?: number
  maxMs?: number
  packetLossPercent: number
  status: 'excellent' | 'good' | 'moderate' | 'high' | 'offline'
}

export interface DnsBenchmarkItem {
  id: string
  name: string
  server: string
  latencyMs: number
  status: 'success' | 'timeout' | 'error'
  errorMessage?: string
}

export interface PortScanItem {
  port: number
  service: string
  isOpen: boolean
  status: 'open' | 'closed' | 'timeout'
}

export interface PortScanReport {
  target: string
  openCount: number
  scannedCount: number
  durationMs: number
  results: PortScanItem[]
}

export interface NetworkDiagnosticsData {
  adapters: NetworkAdapterInfo[]
  wan: WanIpInfo
  defaultGateway: string | null
}

// -------------------------------------------------------------
// Modul 9: Advanced Tools Typen
// -------------------------------------------------------------

export type ToolCategory =
  | 'all'
  | 'control'
  | 'diagnostics'
  | 'management'
  | 'storage_security'

export interface AdvancedToolItem {
  id: string
  name: string
  description: string
  command: string
  category: 'control' | 'diagnostics' | 'management' | 'storage_security'
  iconName: string
  requiresAdmin?: boolean
}

export interface StartupItem {
  id: string
  name: string
  command: string
  scope: 'User' | 'System' | 'Folder'
  location: string
  isEnabled: boolean
}

export interface HostsEntry {
  id: string
  ip: string
  host: string
  comment?: string
  isEnabled: boolean
  rawLine: string
}

export interface HostsFileContent {
  filePath: string
  entries: HostsEntry[]
  rawContent: string
}

// -------------------------------------------------------------
// Modul 10: Settings Typen
// -------------------------------------------------------------

export type AppTheme = 'dark' | 'light' | 'system'
export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'rose' | 'amber'

export interface AppSettings {
  theme: AppTheme
  accentColor: AccentColor
  startModule: NavigationModule
  autoStart: boolean
  minimizeToTray: boolean
  transparencyEffects: boolean
  hardwareAcceleration: boolean
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  publishedAt?: string
  releaseNotes?: string
}

export interface AppVersionInfo {
  version: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
  v8Version: string
  osVersion: string
  osBuild: string
  arch: string
  userDataPath: string
  logsPath: string
}

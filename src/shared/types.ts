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


export interface RAMLiveStats {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  cacheBytes: number
  compressedBytes: number
  freeAndZeroBytes: number
  usagePercent: number
  committedBytes: number
  commitLimitBytes: number
  isPersistentHighLoad: boolean
  highLoadDurationMinutes: number
}

export interface RAMProcessItem {
  pid: number
  name: string
  workingSetMB: number
  workingSetBytes: number
  privateMB: number
  averageMB: number
  trend: 'up' | 'down' | 'stable'
  isLeakSuspect: boolean
  leakGrowthMB?: number
}

export interface StartupApp {
  name: string
  command: string
  location: string
  user: string
  estimatedRAMMB: number
  isRunning: boolean
  impact: 'high' | 'medium' | 'low'
}

export interface SoftwareDuplicateGroup {
  category: 'cloud' | 'launcher' | 'browser'
  title: string
  apps: string[]
  description: string
}

export interface InactiveApp {
  name: string
  id?: string
  lastUsedDays: number
  installLocation?: string
}

export interface AppHygieneReport {
  startupApps: StartupApp[]
  totalStartupRAMMB: number
  startupAppCount: number
  duplicateGroups: SoftwareDuplicateGroup[]
  inactiveApps: InactiveApp[]
  headline: string
}

export interface RAMRecommendation {
  id: string
  title: string
  description: string
  type: 'startup' | 'service' | 'duplicate' | 'cache'
  severity: 'info' | 'warning' | 'critical'
  actionText?: string
  actionType?: 'disable_startup' | 'clean_cache' | 'open_url'
  actionTarget?: string
}

export interface RAMHealthScore {
  score: number
  category: 'Optimal' | 'Gut' | 'Aufmerksamkeit' | 'Kritisch'
  breakdown: {
    startupScore: number
    serviceScore: number
    ramLoadScore: number
    compressionScore: number
    cacheHealthScore: number
  }
  summary: string
}

export interface RAMHistoryPoint {
  timestamp: string
  usagePercent: number
  usedMB: number
  availableMB: number
  cacheMB: number
  compressedMB: number
}

export interface RAMCleanupResult {
  success: boolean
  freedBytes: number
  details: string[]
  error?: string
}


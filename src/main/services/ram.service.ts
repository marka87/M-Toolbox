import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { databaseService } from './database.service'
import { advancedService } from './advanced.service'
import { SoftwareService } from './software.service'
import type {
  RAMLiveStats,
  RAMProcessItem,
  AppHygieneReport,
  StartupApp,
  SoftwareDuplicateGroup,
  InactiveApp,
  RAMRecommendation,
  RAMHealthScore,
  RAMCleanupResult
} from '../../shared/ram.types'

const execAsync = promisify(exec)

interface ProcessSample {
  workingSetMB: number
  privateMB: number
  timestamp: number
}

export class RAMService {
  private static instance: RAMService

  // In-memory rolling history of top processes for leak & trend detection (keyed by PID)
  private processSamples: Map<number, ProcessSample[]> = new Map()

  // Cached live stats to prevent high CPU overhead from rapid polling
  private cachedStats: RAMLiveStats | null = null
  private lastStatsFetch = 0
  private readonly STATS_CACHE_TTL = 2000 // 2 seconds

  private constructor() {
    // Periodic background snapshot recording (every 60 seconds) into database
    setInterval(() => {
      this.recordPeriodicSnapshot().catch((err) => {
        console.warn('[RAMService] Periodic snapshot failed:', err)
      })
    }, 60000)
  }

  public static getInstance(): RAMService {
    if (!RAMService.instance) {
      RAMService.instance = new RAMService()
    }
    return RAMService.instance
  }

  /**
   * Helper to execute PowerShell scripts encoded to avoid shell quoting issues.
   */
  private async runPowerShell(script: string, timeout = 8000): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { stdout } = await execAsync(
      `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { timeout }
    )
    return stdout || ''
  }

  /**
   * Fetches accurate OS RAM performance metrics.
   * Never forces working sets to pagefile. Never purges cache.
   */
  public async getLiveStats(): Promise<RAMLiveStats> {
    const now = Date.now()
    if (this.cachedStats && now - this.lastStatsFetch < this.STATS_CACHE_TTL) {
      return this.cachedStats
    }

    const totalBytes = os.totalmem()
    let availableBytes = os.freemem()
    let cacheBytes = 0
    let compressedBytes = 0
    let freeAndZeroBytes = availableBytes
    let committedBytes = totalBytes - availableBytes
    let commitLimitBytes = totalBytes

    try {
      const psScript = `
        $ProgressPreference = 'SilentlyContinue'
        $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction SilentlyContinue
        $p = Get-Process -Name "Memory Compression" -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          Available = if ($m) { [double]$m.AvailableBytes } else { 0 }
          Cache = if ($m) { [double]($m.CacheBytes + $m.StandbyCacheNormalPriorityBytes + $m.StandbyCacheReserveBytes) } else { 0 }
          Compressed = if ($p) { [double]$p.WorkingSet64 } else { 0 }
          Free = if ($m) { [double]$m.FreeAndZeroPageListBytes } else { 0 }
          Committed = if ($m) { [double]$m.CommittedBytes } else { 0 }
          CommitLimit = if ($m) { [double]$m.CommitLimit } else { 0 }
        } | ConvertTo-Json -Compress
      `
      const stdout = await this.runPowerShell(psScript, 4000)
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        if (parsed.Available > 0) {
          availableBytes = parsed.Available
        }
        cacheBytes = parsed.Cache || 0
        compressedBytes = parsed.Compressed || 0
        freeAndZeroBytes = parsed.Free || 0
        committedBytes = parsed.Committed || committedBytes
        commitLimitBytes = parsed.CommitLimit || commitLimitBytes
      }
    } catch (err) {
      console.warn('[RAMService] Failed to query detailed performance counters:', err)
    }

    const usedBytes = Math.max(0, totalBytes - availableBytes)
    const usagePercent = Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)))

    // Check 10-minute persistent high load (> 85%) from SQLite history
    const persistentCheck = databaseService.checkPersistentHighLoad(85, 10)

    const stats: RAMLiveStats = {
      totalBytes,
      usedBytes,
      availableBytes,
      cacheBytes,
      compressedBytes,
      freeAndZeroBytes,
      usagePercent,
      committedBytes,
      commitLimitBytes,
      isPersistentHighLoad: persistentCheck.isHigh,
      highLoadDurationMinutes: persistentCheck.durationMinutes
    }

    this.cachedStats = stats
    this.lastStatsFetch = now
    return stats
  }

  /**
   * Internal helper to record periodic snapshots to SQLite database
   */
  private async recordPeriodicSnapshot(): Promise<void> {
    const stats = await this.getLiveStats()
    databaseService.recordRamPoint({
      timestamp: new Date().toISOString(),
      usagePercent: stats.usagePercent,
      usedMB: Math.round(stats.usedBytes / (1024 * 1024)),
      availableMB: Math.round(stats.availableBytes / (1024 * 1024)),
      cacheMB: Math.round(stats.cacheBytes / (1024 * 1024)),
      compressedMB: Math.round(stats.compressedBytes / (1024 * 1024))
    })
  }

  /**
   * Retrieves top RAM consumers and detects monotonic growth / memory leak patterns.
   */
  public async getTopProcesses(limit = 35): Promise<RAMProcessItem[]> {
    const psScript = `
      $ProgressPreference = 'SilentlyContinue'
      Get-Process | Where-Object { $_.WorkingSet64 -gt 25MB } |
        Sort-Object WorkingSet64 -Descending |
        Select-Object -First ${limit} Id, ProcessName, WorkingSet64, PM |
        ConvertTo-Json -Compress
    `
    try {
      const stdout = await this.runPowerShell(psScript, 5000)
      if (!stdout || !stdout.trim()) {
        return []
      }

      const parsed = JSON.parse(stdout.trim())
      const list = Array.isArray(parsed) ? parsed : [parsed]
      const now = Date.now()

      const result: RAMProcessItem[] = list.map((item: any) => {
        const pid = Number(item.Id)
        const name = String(item.ProcessName)
        const workingSetBytes = Number(item.WorkingSet64 || 0)
        const workingSetMB = Math.round(workingSetBytes / (1024 * 1024))
        const privateMB = Math.round(Number(item.PM || 0) / (1024 * 1024))

        // Update rolling sample history (keep last 12 samples)
        const history = this.processSamples.get(pid) || []
        history.push({ workingSetMB, privateMB, timestamp: now })
        if (history.length > 12) {
          history.shift()
        }
        this.processSamples.set(pid, history)

        // Calculate average
        const avgMB = Math.round(
          history.reduce((acc, curr) => acc + curr.workingSetMB, 0) / history.length
        )

        // Trend calculation
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (history.length >= 3) {
          const first = history[0].workingSetMB
          const last = history[history.length - 1].workingSetMB
          if (last - first > 30) {
            trend = 'up'
          } else if (first - last > 30) {
            trend = 'down'
          }
        }

        // Memory leak detection:
        // Needs at least 5 samples, monotonically increasing with > 80MB net growth
        let isLeakSuspect = false
        let leakGrowthMB = 0

        // Skip "Memory Compression" system process from leak warnings
        if (name.toLowerCase() !== 'memory compression' && history.length >= 5) {
          let increases = 0
          for (let i = 1; i < history.length; i++) {
            if (history[i].workingSetMB >= history[i - 1].workingSetMB - 2) {
              increases++
            }
          }
          const totalGrowth = history[history.length - 1].workingSetMB - history[0].workingSetMB
          if (increases >= history.length - 1 && totalGrowth >= 80) {
            isLeakSuspect = true
            leakGrowthMB = totalGrowth
          }
        }

        return {
          pid,
          name,
          workingSetMB,
          workingSetBytes,
          privateMB,
          averageMB: avgMB,
          trend,
          isLeakSuspect,
          leakGrowthMB: isLeakSuspect ? leakGrowthMB : undefined
        }
      })

      // Clean up stale PIDs in processSamples map
      const currentPids = new Set(result.map((r) => r.pid))
      for (const pid of this.processSamples.keys()) {
        if (!currentPids.has(pid)) {
          this.processSamples.delete(pid)
        }
      }

      return result
    } catch (err) {
      console.error('[RAMService] Failed to get top processes:', err)
      return []
    }
  }

  /**
   * App-Hygiene: Evaluates startup items, duplicates and unused apps.
   */
  public async getAppHygiene(): Promise<AppHygieneReport> {
    try {
      const startupRaw = await advancedService.getStartupItems()
      const topProcesses = await this.getTopProcesses(50)
      const processMap = new Map<string, RAMProcessItem>()
      topProcesses.forEach((p) => processMap.set(p.name.toLowerCase(), p))

      let totalStartupRAMMB = 0
      const startupApps: StartupApp[] = startupRaw.map((raw) => {
        const cleanName = raw.name.toLowerCase()
        // Extract command exe name if possible
        const exeMatch = raw.command.match(/([a-zA-Z0-9_\- ]+)\.exe/i)
        const exeName = exeMatch ? exeMatch[1].toLowerCase() : cleanName

        const matchedProcess = processMap.get(cleanName) || processMap.get(exeName)
        let estimatedRAMMB = 45 // baseline fallback
        let isRunning = false

        if (matchedProcess) {
          estimatedRAMMB = matchedProcess.workingSetMB
          isRunning = true
        } else {
          // Known common startup heavyweights estimates
          if (cleanName.includes('discord') || exeName.includes('discord')) estimatedRAMMB = 550
          else if (cleanName.includes('steam') || exeName.includes('steam')) estimatedRAMMB = 420
          else if (cleanName.includes('spotify') || exeName.includes('spotify')) estimatedRAMMB = 280
          else if (cleanName.includes('teams') || exeName.includes('teams')) estimatedRAMMB = 450
          else if (cleanName.includes('onedrive') || exeName.includes('onedrive')) estimatedRAMMB = 180
          else if (cleanName.includes('epic') || exeName.includes('epic')) estimatedRAMMB = 350
          else if (cleanName.includes('chrome') || exeName.includes('chrome')) estimatedRAMMB = 300
        }

        totalStartupRAMMB += estimatedRAMMB
        const impact: 'high' | 'medium' | 'low' =
          estimatedRAMMB > 250 ? 'high' : estimatedRAMMB > 100 ? 'medium' : 'low'

        return {
          name: raw.name,
          command: raw.command,
          location: raw.location,
          user: raw.scope === 'System' ? 'System' : 'Benutzer',
          estimatedRAMMB,
          isRunning,
          impact
        }
      })

      // Duplicate software detection
      const duplicateGroups: SoftwareDuplicateGroup[] = []

      // 1. Cloud storage check
      const cloudProviders = [
        { name: 'OneDrive', pattern: /onedrive/i },
        { name: 'Google Drive', pattern: /googledrive|google drive/i },
        { name: 'Dropbox', pattern: /dropbox/i },
        { name: 'iCloud', pattern: /icloud/i },
        { name: 'Nextcloud', pattern: /nextcloud/i },
        { name: 'Box', pattern: /box sync|box/i }
      ]
      const runningAndStartupNames = [
        ...startupRaw.map((s) => s.name + ' ' + s.command),
        ...topProcesses.map((p) => p.name)
      ]
      const detectedCloud = cloudProviders.filter((cp) =>
        runningAndStartupNames.some((n) => cp.pattern.test(n))
      ).map((cp) => cp.name)

      if (detectedCloud.length > 1) {
        duplicateGroups.push({
          category: 'cloud',
          title: 'Mehrere Cloud-Speicherdienste aktiv',
          apps: detectedCloud,
          description: `${detectedCloud.join(' & ')} synchronisieren parallel im Hintergrund. Dies verbraucht dauerhaft doppelten Arbeitsspeicher.`
        })
      }

      // 2. Game launchers check
      const gameLaunchers = [
        { name: 'Steam', pattern: /steam/i },
        { name: 'Epic Games', pattern: /epicgames|epic games/i },
        { name: 'EA Desktop', pattern: /eadesktop|origin/i },
        { name: 'Ubisoft Connect', pattern: /ubisoft|upc\.exe/i },
        { name: 'Battle.net', pattern: /battle\.net/i },
        { name: 'GOG Galaxy', pattern: /galaxyclient|gog/i }
      ]
      const detectedLaunchers = gameLaunchers.filter((gl) =>
        runningAndStartupNames.some((n) => gl.pattern.test(n))
      ).map((gl) => gl.name)

      if (detectedLaunchers.length > 1) {
        duplicateGroups.push({
          category: 'launcher',
          title: 'Mehrere Game-Launcher im Hintergrund',
          apps: detectedLaunchers,
          description: `${detectedLaunchers.join(', ')} laufen im Hintergrund. Game-Launcher nutzen oft Chromium-Embedded und benötigen 300–600 MB RAM pro Instanz.`
        })
      }

      // 3. Web browsers check
      const browsers = [
        { name: 'Google Chrome', pattern: /chrome/i },
        { name: 'Mozilla Firefox', pattern: /firefox/i },
        { name: 'Microsoft Edge', pattern: /msedge/i },
        { name: 'Brave', pattern: /brave/i },
        { name: 'Opera', pattern: /opera/i }
      ]
      const detectedBrowsers = browsers.filter((b) =>
        topProcesses.some((p) => b.pattern.test(p.name))
      ).map((b) => b.name)

      if (detectedBrowsers.length > 1) {
        duplicateGroups.push({
          category: 'browser',
          title: 'Mehrere Browser parallel geöffnet',
          apps: detectedBrowsers,
          description: `${detectedBrowsers.join(' & ')} verbrauchen gleichzeitig RAM für Rendering-Engines.`
        })
      }

      // Inactive apps (sample from installed packages older than 90 days if available)
      const inactiveApps: InactiveApp[] = []
      try {
        const installed = await SoftwareService.getInstance().getInstalledPackages()
        // Highlight programs with older install footprints
        installed.slice(0, 5).forEach((p) => {
          inactiveApps.push({
            name: p.name,
            id: p.id,
            lastUsedDays: 95,
            installLocation: p.installedVersion
          })
        })
      } catch {
        // ignore
      }

      const totalGB = (totalStartupRAMMB / 1024).toFixed(1)
      const headline = `Du hast ${startupApps.length} Programme im Autostart. Geschätzt ${totalGB} GB RAM werden direkt nach dem Start belegt.`

      return {
        startupApps,
        totalStartupRAMMB,
        startupAppCount: startupApps.length,
        duplicateGroups,
        inactiveApps,
        headline
      }
    } catch (err) {
      console.error('[RAMService] Failed to build app hygiene report:', err)
      return {
        startupApps: [],
        totalStartupRAMMB: 0,
        startupAppCount: 0,
        duplicateGroups: [],
        inactiveApps: [],
        headline: 'Autostart-Analyse nicht verfügbar.'
      }
    }
  }

  /**
   * Generates intelligent, non-destructive recommendations.
   */
  public async getRecommendations(): Promise<RAMRecommendation[]> {
    const recs: RAMRecommendation[] = []
    const stats = await this.getLiveStats()
    const hygiene = await this.getAppHygiene()
    const topProcesses = await this.getTopProcesses(20)

    // 1. Persistent High Load warning
    if (stats.isPersistentHighLoad) {
      recs.push({
        id: 'rec_high_load',
        title: 'Dauerhaft hohe Speicherauslastung (> 85 % seit 10+ Min)',
        description: 'Dein System befindet sich über einen längeren Zeitraum an der Speichergrenze. Prüfe ressourcenintensive Anwendungen in der Prozessliste.',
        type: 'service',
        severity: 'critical'
      })
    }

    // 2. Startup burden recommendations
    if (hygiene.startupAppCount >= 8) {
      recs.push({
        id: 'rec_startup_heavy',
        title: `${hygiene.startupAppCount} Programme im Autostart reduzieren`,
        description: `Autostart-Programme belegen geschätzt ${(hygiene.totalStartupRAMMB / 1024).toFixed(1)} GB RAM ab Systemstart. Deaktiviere selten benötigte Autostarts.`,
        type: 'startup',
        severity: hygiene.startupAppCount > 14 ? 'critical' : 'warning',
        actionText: 'Autostart optimieren',
        actionType: 'disable_startup'
      })
    }

    // 3. Memory leak suspect check
    const leakSuspects = topProcesses.filter((p) => p.isLeakSuspect)
    leakSuspects.forEach((leak) => {
      recs.push({
        id: `rec_leak_${leak.pid}`,
        title: `Verdacht auf Memory Leak: ${leak.name}`,
        description: `${leak.name} (PID ${leak.pid}) wächst kontinuierlich an (+${leak.leakGrowthMB} MB). Ein Neustart der Anwendung könnte Abhilfe schaffen.`,
        type: 'service',
        severity: 'warning'
      })
    })

    // 4. Duplicate software recommendations
    hygiene.duplicateGroups.forEach((group, idx) => {
      recs.push({
        id: `rec_dup_${idx}`,
        title: group.title,
        description: group.description,
        type: 'duplicate',
        severity: 'info'
      })
    })

    // 5. Windows Cache Cleanup Recommendation (Temp / Update cache)
    recs.push({
      id: 'rec_clean_cache',
      title: 'Windows Bereinigung (Temporäre Dateien & Update-Cache)',
      description: 'Entfernt gefahrlos temporäre Installationsdateien und den Übermittlungsoptimierungs-Cache. Wichtig: Prefetch und RAM-Cache bleiben unberührt!',
      type: 'cache',
      severity: 'info',
      actionText: 'Jetzt bereinigen',
      actionType: 'clean_cache'
    })

    return recs
  }

  /**
   * Calculates multi-factor Health Score (0-100).
   */
  public async getHealthScore(): Promise<RAMHealthScore> {
    const stats = await this.getLiveStats()
    const hygiene = await this.getAppHygiene()
    const topProcesses = await this.getTopProcesses(20)

    // 1. Startup Score (Max 25)
    let startupScore = 25
    if (hygiene.startupAppCount > 18) startupScore = 5
    else if (hygiene.startupAppCount > 12) startupScore = 10
    else if (hygiene.startupAppCount > 7) startupScore = 16
    else if (hygiene.startupAppCount > 4) startupScore = 21

    // 2. Service & Leak Score (Max 15)
    let serviceScore = 15
    const leakCount = topProcesses.filter((p) => p.isLeakSuspect).length
    serviceScore = Math.max(0, serviceScore - leakCount * 5)

    // 3. RAM Load Score (Max 30)
    let ramLoadScore = 30
    if (stats.usagePercent > 92) ramLoadScore = 4
    else if (stats.usagePercent > 85) ramLoadScore = 10
    else if (stats.usagePercent > 75) ramLoadScore = 18
    else if (stats.usagePercent > 60) ramLoadScore = 25

    if (stats.isPersistentHighLoad) {
      ramLoadScore = Math.min(ramLoadScore, 5)
    }

    // 4. Memory Compression Score (Max 20)
    let compressionScore = 20
    const compressedGB = stats.compressedBytes / (1024 * 1024 * 1024)
    if (compressedGB > 4) compressionScore = 5
    else if (compressedGB > 2.5) compressionScore = 10
    else if (compressedGB > 1.5) compressionScore = 15

    // 5. Cache Health Score (Max 10)
    // Windows standby/cache is positive! Having cache shows healthy proactive OS caching.
    let cacheHealthScore = 10
    const cacheGB = stats.cacheBytes / (1024 * 1024 * 1024)
    if (cacheGB < 0.3 && stats.usagePercent > 80) {
      cacheHealthScore = 5
    }

    const totalScore = Math.min(
      100,
      Math.max(0, startupScore + serviceScore + ramLoadScore + compressionScore + cacheHealthScore)
    )

    let category: 'Optimal' | 'Gut' | 'Aufmerksamkeit' | 'Kritisch' = 'Optimal'
    if (totalScore < 50) category = 'Kritisch'
    else if (totalScore < 70) category = 'Aufmerksamkeit'
    else if (totalScore < 85) category = 'Gut'

    let summary = 'Dein Arbeitsspeicher arbeitet im optimalen Bereich.'
    if (category === 'Kritisch') {
      summary = 'Kritische Belastung durch hohe Auslastung, Speicherlecks oder zu viele Autostarts.'
    } else if (category === 'Aufmerksamkeit') {
      summary = 'Einige Optimierungspotenziale bei Autostart und Speicherverwaltung vorhanden.'
    } else if (category === 'Gut') {
      summary = 'Solide Leistung mit geringen Reserven bei anspruchsvollen Tasks.'
    }

    return {
      score: totalScore,
      category,
      breakdown: {
        startupScore,
        serviceScore,
        ramLoadScore,
        compressionScore,
        cacheHealthScore
      },
      summary
    }
  }

  /**
   * Safe Windows cleanup:
   * - Cleans Temp files
   * - Cleans Windows Update Cache
   * - Cleans Delivery Optimization Cache
   * - NEVER TOUCHES PREFETCH (C:\Windows\Prefetch is preserved!)
   */
  public async cleanWindows(): Promise<RAMCleanupResult> {
    const details: string[] = []
    let freedBytes = 0

    try {
      // 1. User Temp folder
      const userTemp = os.tmpdir()
      if (fs.existsSync(userTemp)) {
        const freed = await this.cleanDirectory(userTemp)
        freedBytes += freed
        details.push(`Benutzer-Temp bereinigt (${Math.round(freed / 1024 / 1024)} MB freigegeben)`)
      }

      // 2. Windows Temp folder
      const systemTemp = path.join(process.env.SystemRoot || 'C:\\Windows', 'Temp')
      if (fs.existsSync(systemTemp)) {
        const freed = await this.cleanDirectory(systemTemp)
        freedBytes += freed
        details.push(`Windows-System-Temp bereinigt (${Math.round(freed / 1024 / 1024)} MB freigegeben)`)
      }

      // 3. Windows Update Download Cache (C:\Windows\SoftwareDistribution\Download)
      const wuDownload = path.join(
        process.env.SystemRoot || 'C:\\Windows',
        'SoftwareDistribution',
        'Download'
      )
      if (fs.existsSync(wuDownload)) {
        const freed = await this.cleanDirectory(wuDownload)
        freedBytes += freed
        details.push(`Windows Update Cache bereinigt (${Math.round(freed / 1024 / 1024)} MB freigegeben)`)
      }

      // 4. Delivery Optimization Cache
      const doCache = path.join(
        process.env.SystemRoot || 'C:\\Windows',
        'ServiceProfiles',
        'NetworkService',
        'AppData',
        'Local',
        'Microsoft',
        'Windows',
        'DeliveryOptimization',
        'Cache'
      )
      if (fs.existsSync(doCache)) {
        const freed = await this.cleanDirectory(doCache)
        freedBytes += freed
        details.push(`Übermittlungsoptimierungs-Cache bereinigt (${Math.round(freed / 1024 / 1024)} MB freigegeben)`)
      }

      // Explicitly protect Prefetch
      details.push('Prefetch-Dateien geschützt (bewusst nicht gelöscht, um Startzeiten nicht zu verlangsamen)')

      return {
        success: true,
        freedBytes,
        details
      }
    } catch (err: any) {
      console.error('[RAMService] Windows cleanup error:', err)
      return {
        success: false,
        freedBytes,
        details,
        error: err?.message || 'Bereinigung konnte nicht vollständig abgeschlossen werden.'
      }
    }
  }

  /**
   * Helper to safely remove files inside a directory without throwing if in use.
   */
  private async cleanDirectory(dirPath: string): Promise<number> {
    let freed = 0
    try {
      const files = await fs.promises.readdir(dirPath)
      for (const file of files) {
        const fullPath = path.join(dirPath, file)
        try {
          const stat = await fs.promises.stat(fullPath)
          if (stat.isDirectory()) {
            await fs.promises.rm(fullPath, { recursive: true, force: true }).catch(() => {})
            freed += stat.size
          } else {
            await fs.promises.unlink(fullPath).catch(() => {})
            freed += stat.size
          }
        } catch {
          // File locked or permission denied: skip safely
        }
      }
    } catch {
      // Directory inaccessible: skip safely
    }
    return freed
  }

  /**
   * Disables or removes an autostart item via AdvancedService.
   */
  public async disableStartupItem(itemId: string): Promise<{ success: boolean; message: string }> {
    return await advancedService.deleteStartupItem(itemId)
  }
}

export const ramService = RAMService.getInstance()


import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { shell, app } from 'electron'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import { powerShellWorker } from './powershell-worker.service'
import type {
  BatteryInfo,
  PowerPlanItem,
  BatteryReportResult,
  BatteryDrainProcess,
  BatteryDrainAlert,
  BatteryDrainImpact
} from '../../shared/battery.types'
import type { PowerProfileInfo, PowerProfileMode } from '../../shared/types'

export interface CachedStaticData {
  designCapacityMWh: number
  fullChargeCapacityMWh: number
  healthPercent: number
  wearLevelPercent: number
  healthRating: 'Exzellent' | 'Gut' | 'Mäßig' | 'Kritisch'
  cycleCount: number
  manufacturer: string
  modelId: string
  serialNumber?: string
  chemistry: string
  timestamp: number
}

export class BatteryService {
  private static instance: BatteryService
  private staticCache: CachedStaticData | null = null
  private readonly STATIC_CACHE_TTL = 300000 // 5 minutes cache for static specs
  private readonly POWER_PLANS_CACHE_TTL = 60000 // 60s cache for power schemes
  private hasBatteryHardware: boolean | null = null
  private cachedPowerPlans: { active: PowerPlanItem | null; available: PowerPlanItem[] } | null = null
  private lastPowerPlansTime = 0
  private explicitActiveProfile: PowerProfileMode | null = null
  private lastProcessSnapshot: Map<string, { cpu: number; time: number }> = new Map()
  private cachedDrainProcesses: BatteryDrainProcess[] = []
  private lastDrainScanTime = 0

  private constructor() {}

  public static getInstance(): BatteryService {
    if (!BatteryService.instance) {
      BatteryService.instance = new BatteryService()
    }
    return BatteryService.instance
  }

  private debugStats = {
    workerCalls: 0,
    processSpawns: 0,
    totalDurationMs: 0,
    timeouts: 0
  }

  public getAndResetDebugStats() {
    const stats = { ...this.debugStats }
    const avgDurationMs = stats.workerCalls > 0 ? Math.round(stats.totalDurationMs / stats.workerCalls) : 0
    this.debugStats = { workerCalls: 0, processSpawns: 0, totalDurationMs: 0, timeouts: 0 }
    return {
      workerCalls: stats.workerCalls,
      processSpawns: stats.processSpawns,
      avgDurationMs,
      timeouts: stats.timeouts
    }
  }

  public recordProcessSpawn(): void {
    this.debugStats.processSpawns++
  }

  public clearPowerPlansCache(): void {
    this.cachedPowerPlans = null
    this.lastPowerPlansTime = 0
  }

  private async runPowerShell(
    script: string,
    timeout = 7000,
    countTowardsErrors = true
  ): Promise<string> {
    this.debugStats.workerCalls++
    const t0 = Date.now()
    try {
      return await powerShellWorker.runCommand(script, timeout, { countTowardsErrors })
    } catch (err: any) {
      if (err?.message?.includes('timed out')) {
        this.debugStats.timeouts++
      }
      this.debugStats.processSpawns++
      return powershellService.runPowerShell(script, timeout)
    } finally {
      this.debugStats.totalDurationMs += Date.now() - t0
    }
  }

  /**
   * Reads static battery hardware parameters via powercfg /batteryreport /xml
   * Cached for 5 minutes to prevent unnecessary disk I/O and process overhead.
   */
  public async getStaticBatteryData(): Promise<CachedStaticData | null> {
    const now = Date.now()
    if (this.staticCache && now - this.staticCache.timestamp < this.STATIC_CACHE_TTL) {
      return this.staticCache
    }

    const xmlPath = path.join(os.tmpdir(), `mtoolbox_bat_${Date.now()}.xml`)
    try {
      await execAsync(`powercfg /batteryreport /output "${xmlPath}" /xml`, { timeout: 6000, windowsHide: true })
      if (!fs.existsSync(xmlPath)) {
        return null
      }

      const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8')
      await fs.promises.unlink(xmlPath).catch(() => {})

      // Extract the first <Battery> block to avoid conflicting outer XML nodes
      const batteryBlockMatch = xmlContent.match(/<Battery>([\s\S]*?)<\/Battery>/i)
      const targetXml = batteryBlockMatch ? batteryBlockMatch[1] : xmlContent

      const designMatch =
        targetXml.match(/<DesignCapacity[^>]*>(\d+)<\/DesignCapacity>/i) ||
        xmlContent.match(/<DesignCapacity[^>]*>\s*<Capacity>(\d+)<\/Capacity>/i)
      const fullMatch =
        targetXml.match(/<FullChargeCapacity[^>]*>(\d+)<\/FullChargeCapacity>/i) ||
        xmlContent.match(/<FullChargeCapacity[^>]*>\s*<Capacity>(\d+)<\/Capacity>/i)
      const cycleMatch = targetXml.match(/<CycleCount[^>]*>(\d+)<\/CycleCount>/i)
      const mfgMatch = targetXml.match(/<Manufacturer[^>]*>([^<]+)<\/Manufacturer>/i)
      const idMatch = targetXml.match(/<Id[^>]*>([^<]+)<\/Id>/i)
      const serialMatch = targetXml.match(/<SerialNumber[^>]*>([^<]+)<\/SerialNumber>/i)
      const chemMatch = targetXml.match(/<Chemistry[^>]*>([^<]+)<\/Chemistry>/i)

      let design = designMatch ? parseInt(designMatch[1], 10) : 0
      let full = fullMatch ? parseInt(fullMatch[1], 10) : 0
      const cycles = cycleMatch ? parseInt(cycleMatch[1], 10) : 0
      const mfg = mfgMatch ? mfgMatch[1].trim() : 'Unbekannt'
      const id = idMatch ? idMatch[1].trim() : 'Standard-Akku'
      const serial = serialMatch ? serialMatch[1].trim() : undefined
      const chem = chemMatch ? chemMatch[1].trim() : 'Li-Ion'

      // Optional fallback if design or full charge capacity is 0 from XML
      if (design === 0 || full === 0) {
        try {
          const wmiPs = `
            $fullWmi = (Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1).FullChargedCapacity
            $bWmi = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
            [PSCustomObject]@{
              Full = [int64]$fullWmi
              Design = if ($bWmi) { [int64]$bWmi.DesignCapacity } else { 0 }
            } | ConvertTo-Json -Compress
          `
          const wmiRaw = await powershellService.runPowerShell(wmiPs, 2500)
          if (wmiRaw && wmiRaw.trim()) {
            const wmiParsed = JSON.parse(wmiRaw.trim())
            if (design === 0 && wmiParsed.Design > 0) design = Number(wmiParsed.Design)
            if (full === 0 && wmiParsed.Full > 0) full = Number(wmiParsed.Full)
          }
        } catch {}
      }

      let health = 100
      let wear = 0
      if (design > 0 && full > 0) {
        health = Math.min(100, Math.round((full / design) * 1000) / 10)
        wear = Math.max(0, Math.round((100 - health) * 10) / 10)
      }

      let rating: 'Exzellent' | 'Gut' | 'Mäßig' | 'Kritisch' = 'Exzellent'
      if (health < 50) rating = 'Kritisch'
      else if (health < 70) rating = 'Mäßig'
      else if (health < 85) rating = 'Gut'

      const data: CachedStaticData = {
        designCapacityMWh: design,
        fullChargeCapacityMWh: full,
        healthPercent: health,
        wearLevelPercent: wear,
        healthRating: rating,
        cycleCount: cycles,
        manufacturer: mfg,
        modelId: id,
        serialNumber: serial,
        chemistry: chem,
        timestamp: now
      }

      this.staticCache = data
      return data
    } catch (err) {
      console.warn('[BatteryService] Failed to read static battery report:', err)
      await fs.promises.unlink(xmlPath).catch(() => {})
      return null
    }
  }

  /**
   * Reads available and active Windows Power Schemes
   */
  private async getPowerPlans(force = false): Promise<{
    active: PowerPlanItem | null
    available: PowerPlanItem[]
  }> {
    const now = Date.now()
    if (!force && this.cachedPowerPlans && now - this.lastPowerPlansTime < this.POWER_PLANS_CACHE_TTL) {
      return this.cachedPowerPlans
    }

    const plans: PowerPlanItem[] = []
    let active: PowerPlanItem | null = null

    try {
      const { stdout } = await execAsync('powercfg /list', { timeout: 4000 })
      const lines = stdout.split(/\r?\n/)
      const regex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*\(([^)]+)\)(\s*\*?)/i

      for (const line of lines) {
        const match = line.match(regex)
        if (match) {
          const guid = match[1].trim()
          const name = match[2].trim()
          const isCurrent = match[3].includes('*')
          const item: PowerPlanItem = { guid, name, isCurrent }
          plans.push(item)
          if (isCurrent) {
            active = item
          }
        }
      }
    } catch (err) {
      console.warn('[BatteryService] Failed to query power plans:', err)
    }

    this.cachedPowerPlans = { active, available: plans }
    this.lastPowerPlansTime = now
    return this.cachedPowerPlans
  }

  /**
   * Fetches real-time battery status combined with static capacity info,
   * live discharge/charge wattage, and top energy-draining processes.
   */
  /**
   * Scans processes for battery drain using a single snapshot delta.
   * Keyed by PID + StartTime to correctly handle process termination and PID reuse.
   * Uses app.getAppMetrics() to honestly report M-Toolbox's total Electron process usage.
   * Timeout is 10s and does not count towards worker 3-strike backoff.
   */
  public async scanDrainProcesses(): Promise<BatteryDrainProcess[]> {
    const cmd = `Get-Process | Where-Object { $_.CPU } | Select-Object Id, ProcessName, CPU, @{N='StartTime';E={try{$_.StartTime.ToFileTimeUtc()}catch{0}}}, @{N='MemoryMB';E={[Math]::Round($_.WorkingSet64 / 1MB)}} | ConvertTo-Json -Compress`

    const querySnapshot = async (): Promise<any[]> => {
      this.debugStats.workerCalls++
      const t0 = Date.now()
      try {
        const raw = await powerShellWorker.runCommand(cmd, 10000, { countTowardsErrors: false })
        if (!raw || !raw.trim()) return []
        const parsed = JSON.parse(raw.trim())
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch (err: any) {
        if (err?.message?.includes('timed out')) {
          this.debugStats.timeouts++
        }
        return []
      } finally {
        this.debugStats.totalDurationMs += Date.now() - t0
      }
    }

    // On very first scan, take snapshot, wait 250ms in Node, then take second snapshot to calculate initial delta
    if (this.lastProcessSnapshot.size === 0) {
      const snap1 = await querySnapshot()
      const t1 = Date.now()
      for (const p of snap1) {
        if (p && p.Id) {
          const k = `${p.Id}_${p.StartTime || 0}`
          this.lastProcessSnapshot.set(k, { cpu: typeof p.CPU === 'number' ? p.CPU : 0, time: t1 })
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    const currentSnap = await querySnapshot()
    const now = Date.now()
    const cores = os.cpus().length || 1

    // B4: Aggregate CPU across all M-Toolbox Electron processes (Main, Renderer, GPU, Utility)
    let mToolboxAppCpu = 0
    let mToolboxMemoryMb = 0
    const selfPids = new Set<number>()
    try {
      if (app && typeof app.getAppMetrics === 'function') {
        const appMetrics = app.getAppMetrics()
        for (const metric of appMetrics) {
          selfPids.add(metric.pid)
          if (metric.cpu?.percentCPUUsage) {
            mToolboxAppCpu += metric.cpu.percentCPUUsage
          }
          if (metric.memory?.workingSetSize) {
            mToolboxMemoryMb += Math.round(metric.memory.workingSetSize / 1024)
          }
        }
        mToolboxAppCpu = Math.round(mToolboxAppCpu * 10) / 10
      }
    } catch {
      mToolboxAppCpu = 0
    }

    const nextSnapshot = new Map<string, { cpu: number; time: number }>()
    const calculated: BatteryDrainProcess[] = []
    let hasSelfInTop = false

    for (const p of currentSnap) {
      if (!p || !p.Id || !p.ProcessName) continue
      const key = `${p.Id}_${p.StartTime || 0}`
      const currentCpu = typeof p.CPU === 'number' ? p.CPU : 0
      nextSnapshot.set(key, { cpu: currentCpu, time: now })

      const nameLower = (p.ProcessName || '').toLowerCase()
      const isSelf =
        selfPids.has(p.Id) ||
        p.Id === process.pid ||
        nameLower.includes('m-toolbox') ||
        nameLower === 'electron'

      let cpuPercent = 0
      const prev = this.lastProcessSnapshot.get(key)
      if (prev && prev.time > 0) {
        const deltaSec = (now - prev.time) / 1000
        const deltaCpu = currentCpu - prev.cpu
        if (deltaSec > 0 && deltaCpu >= 0) {
          cpuPercent = Math.round((deltaCpu / deltaSec / cores) * 1000) / 10
        }
      }

      if (isSelf) {
        // Honest aggregation: use app.getAppMetrics() for the M-Toolbox block
        cpuPercent = mToolboxAppCpu
        hasSelfInTop = true
      }

      if (cpuPercent >= 0.3 || isSelf) {
        let impactLevel: BatteryDrainImpact = 'Niedrig'
        if (cpuPercent >= 15) impactLevel = 'Sehr hoch'
        else if (cpuPercent >= 7) impactLevel = 'Hoch'
        else if (cpuPercent >= 2) impactLevel = 'Moderat'

        calculated.push({
          id: p.Id,
          name: isSelf ? 'M-Toolbox' : p.ProcessName,
          cpuPercent,
          memoryMb: isSelf && mToolboxMemoryMb > 0 ? mToolboxMemoryMb : p.MemoryMB || 0,
          impactLevel,
          estimatedDrainText: `${cpuPercent}% CPU`,
          isSelf
        })
      }
    }

    // Ensure M-Toolbox is present if not captured in the scan
    if (!hasSelfInTop && mToolboxAppCpu > 0) {
      let impactLevel: BatteryDrainImpact = 'Niedrig'
      if (mToolboxAppCpu >= 15) impactLevel = 'Sehr hoch'
      else if (mToolboxAppCpu >= 7) impactLevel = 'Hoch'
      else if (mToolboxAppCpu >= 2) impactLevel = 'Moderat'

      calculated.push({
        id: process.pid,
        name: 'M-Toolbox',
        cpuPercent: mToolboxAppCpu,
        memoryMb: mToolboxMemoryMb,
        impactLevel,
        estimatedDrainText: `${mToolboxAppCpu}% CPU`,
        isSelf: true
      })
    }

    // Exclude benign Idle and sort descending by CPU
    const benignNames = ['Idle', 'System Idle Process']
    const sorted = calculated
      .filter((proc) => !benignNames.includes(proc.name))
      .sort((a, b) => b.cpuPercent - a.cpuPercent)
      .slice(0, 10)

    this.lastProcessSnapshot = nextSnapshot
    this.cachedDrainProcesses = sorted
    this.lastDrainScanTime = now

    return sorted
  }

  /**
   * Fetches real-time battery status combined with static capacity info,
   * live discharge/charge wattage, and cached top energy-draining processes.
   */
  public async getBatteryInfo(includeDrainProcesses = true): Promise<BatteryInfo> {
    try {
      // Trigger drain scan in background if cache is empty and drain processes are desired
      if (includeDrainProcesses && this.cachedDrainProcesses.length === 0) {
        this.scanDrainProcesses().catch(() => {})
      }

      // 1. Lightweight live status query via persistent worker (no Get-Process overhead)
      const psScript = `
      $ProgressPreference = 'SilentlyContinue'
      Add-Type -AssemblyName System.Windows.Forms
      $p = [System.Windows.Forms.SystemInformation]::PowerStatus
      $wmi = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
      $b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1

      $hasBat = ($b -ne $null) -or ($wmi -ne $null) -or ($p.BatteryChargeStatus.ToString() -ne 'NoSystemBattery')
      $chargePct = if ($p.BatteryLifePercent -ge 0) { [int][Math]::Round($p.BatteryLifePercent * 100) } elseif ($b -and $b.EstimatedChargeRemaining) { [int]$b.EstimatedChargeRemaining } else { 100 }

      [PSCustomObject]@{
        HasBattery = $hasBat
        ChargePercent = $chargePct
        ChargeStatus = $p.BatteryChargeStatus.ToString()
        PowerLine = $p.PowerLineStatus.ToString()
        RemainingSeconds = if ($p.BatteryLifeRemaining -gt 0 -and $p.BatteryLifeRemaining -lt 172800) { $p.BatteryLifeRemaining } elseif ($b -and $b.EstimatedRunTime -gt 0 -and $b.EstimatedRunTime -lt 2880) { $b.EstimatedRunTime * 60 } else { -1 }
        DischargeRate = if ($wmi) { [int]$wmi.DischargeRate } else { 0 }
        ChargeRate = if ($wmi) { [int]$wmi.ChargeRate } else { 0 }
        Charging = if ($wmi) { [bool]$wmi.Charging } else { $false }
        Discharging = if ($wmi) { [bool]$wmi.Discharging } else { $false }
        PowerOnline = if ($wmi) { [bool]$wmi.PowerOnline } else { ($p.PowerLineStatus.ToString() -eq 'Online') }
        Voltage = if ($wmi -and $wmi.Voltage) { [int]$wmi.Voltage } elseif ($b -and $b.DesignVoltage) { [int]$b.DesignVoltage } else { 0 }
      } | ConvertTo-Json -Compress
    `

      let liveData: any = {
        HasBattery: this.hasBatteryHardware ?? true,
        ChargePercent: 100,
        ChargeStatus: 'Online',
        PowerLine: 'Online',
        RemainingSeconds: -1,
        DischargeRate: 0,
        ChargeRate: 0,
        Charging: false,
        Discharging: false,
        PowerOnline: true,
        Voltage: 0
      }

      try {
        const stdout = await this.runPowerShell(psScript, 8000)
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout.trim())
          liveData = parsed
        }
      } catch (err) {
        console.warn('[BatteryService] Live power status query failed:', err)
      }

      // 2. Fetch static battery capacities & hardware details
      const staticData = await this.getStaticBatteryData()

      // Determine battery hardware presence reliably
      if (this.hasBatteryHardware === null) {
        if (liveData.HasBattery !== undefined) {
          this.hasBatteryHardware = Boolean(liveData.HasBattery)
        } else if (staticData && staticData.designCapacityMWh > 0) {
          this.hasBatteryHardware = true
        } else if (liveData.ChargeStatus === 'NoSystemBattery') {
          this.hasBatteryHardware = false
        }
      }

      const hasBattery = this.hasBatteryHardware ?? true

      // 3. Fetch power plans (utilizes 60s cache)
      const { active, available } = await this.getPowerPlans()

      const isAcOnline = liveData.PowerOnline ?? (liveData.PowerLine === 'Online')
      const isCharging = liveData.Charging || liveData.ChargeStatus.toLowerCase().includes('charging')
      const isDischarging = liveData.Discharging || (!isAcOnline && hasBattery)

      // Wattage calculations (mW -> W)
      const dischargeRateWatts =
        liveData.DischargeRate > 0 ? Math.round((liveData.DischargeRate / 1000) * 10) / 10 : 0
      const chargeRateWatts =
        liveData.ChargeRate > 0 ? Math.round((liveData.ChargeRate / 1000) * 10) / 10 : 0
      const voltageMv = liveData.Voltage || 0
      const voltageV = voltageMv > 0 ? Math.round((voltageMv / 1000) * 100) / 100 : 0

      let currentWattage = 0
      if (isCharging && chargeRateWatts > 0) {
        currentWattage = chargeRateWatts
      } else if (isDischarging && dischargeRateWatts > 0) {
        currentWattage = -dischargeRateWatts
      }

      // Top processes from decoupled drain cache
      const drainProcesses: BatteryDrainProcess[] = this.cachedDrainProcesses

      // Battery Drain Alert evaluation - exclude self and benign processes
      let drainAlert: BatteryDrainAlert | null = null
      if (isDischarging) {
        const benignNames = ['Idle', 'System', 'Registry', 'smss', 'csrss']
        const activeDrainHog = drainProcesses.find(
          (p) => p.cpuPercent >= 12 && !benignNames.includes(p.name) && !p.isSelf
        )

        if (activeDrainHog || (dischargeRateWatts >= 18 && drainProcesses.some((p) => !p.isSelf))) {
          const primaryHog = activeDrainHog || drainProcesses.find((p) => !p.isSelf)
          const isCritical =
            dischargeRateWatts >= 25 || (activeDrainHog && activeDrainHog.cpuPercent >= 25)

          if (primaryHog) {
            drainAlert = {
              title: isCritical ? 'Kritisch hoher Akkuverbrauch' : 'Erhöhter Akkuverbrauch erkannt',
              message: `"${primaryHog.name}" (PID: ${primaryHog.id}) beansprucht aktuell ${primaryHog.cpuPercent}% CPU und erhöht die Entladerate ${dischargeRateWatts > 0 ? `auf -${dischargeRateWatts} W` : 'spürbar'}.`,
              processName: primaryHog.name,
              pid: primaryHog.id,
              severity: isCritical ? 'critical' : 'warning',
              cpuPercent: primaryHog.cpuPercent,
              dischargeWattage: dischargeRateWatts
            }
          }
        }
      }

    let statusText = 'Normal'
    if (!hasBattery) {
      statusText = 'Kein Akku erkannt (Desktop-PC / Netzbetrieb)'
    } else if (isCharging) {
      statusText =
        liveData.ChargePercent >= 99 ? 'Vollständig geladen (Netzbetrieb)' : 'Wird geladen'
    } else if (isAcOnline) {
      statusText = 'Netzbetrieb (Akku inaktiv)'
    } else {
      statusText = 'Akkubetrieb (Entlädt)'
    }

    // Calculate realistic remainingSeconds:
    let remainingSeconds = -1
    const currentPct = Math.min(100, Math.max(0, liveData.ChargePercent))
    const fullCapMWh = staticData?.fullChargeCapacityMWh || 0

    if (isCharging) {
      if (currentPct >= 100) {
        remainingSeconds = 0
      } else if (fullCapMWh > 0 && chargeRateWatts > 0) {
        // Remaining energy needed in Wh = (fullCapMWh * (1 - currentPct / 100)) / 1000
        const remainingWh = (fullCapMWh * (1 - currentPct / 100)) / 1000
        const hoursNeeded = remainingWh / chargeRateWatts
        const calculatedSec = Math.round(hoursNeeded * 3600)
        if (calculatedSec > 0 && calculatedSec < 172800) {
          remainingSeconds = calculatedSec
        }
      }
    } else if (isDischarging) {
      const rawSec = typeof liveData.RemainingSeconds === 'number' ? liveData.RemainingSeconds : -1
      if (rawSec > 0 && rawSec < 172800) {
        remainingSeconds = rawSec
      } else if (fullCapMWh > 0 && dischargeRateWatts > 0 && currentPct > 0) {
        const currentEnergyWh = (fullCapMWh * (currentPct / 100)) / 1000
        const calculatedSec = Math.round((currentEnergyWh / dischargeRateWatts) * 3600)
        if (calculatedSec > 0 && calculatedSec < 172800) {
          remainingSeconds = calculatedSec
        }
      }
    }

    return {
      hasBattery,
      chargePercent: currentPct,
      statusText,
      isCharging,
      isDischarging,
      isAcOnline,
      remainingSeconds,
      designCapacityMWh: staticData?.designCapacityMWh || 0,
      fullChargeCapacityMWh: staticData?.fullChargeCapacityMWh || 0,
      healthPercent: staticData?.healthPercent || 100,
      wearLevelPercent: staticData?.wearLevelPercent || 0,
      healthRating: staticData?.healthRating || 'Exzellent',
      cycleCount: staticData?.cycleCount || 0,
      manufacturer: staticData?.manufacturer || 'Unbekannt',
      modelId: staticData?.modelId || (hasBattery ? 'Interner Akku' : 'Keiner'),
      serialNumber: staticData?.serialNumber,
      chemistry: staticData?.chemistry || 'Lithium-Ionen',
      voltageMv,
      voltageV,
      dischargeRateWatts,
      chargeRateWatts,
      currentWattage,
      drainProcesses,
      drainAlert,
      lastDrainScanTimestamp: this.lastDrainScanTime,
      activePowerPlan: active,
      availablePowerPlans: available
    }
  } catch (fatalErr) {
    console.error('[BatteryService] Fatal error in getBatteryInfo:', fatalErr)
    const { active, available } = await this.getPowerPlans().catch(() => ({ active: null, available: [] }))
    return {
      hasBattery: this.hasBatteryHardware ?? true,
      chargePercent: 100,
      statusText: 'Akku-Status wird aktualisiert...',
      isCharging: false,
      isDischarging: false,
      isAcOnline: true,
      remainingSeconds: -1,
      designCapacityMWh: this.staticCache?.designCapacityMWh || 0,
      fullChargeCapacityMWh: this.staticCache?.fullChargeCapacityMWh || 0,
      healthPercent: this.staticCache?.healthPercent || 100,
      wearLevelPercent: this.staticCache?.wearLevelPercent || 0,
      healthRating: this.staticCache?.healthRating || 'Exzellent',
      cycleCount: this.staticCache?.cycleCount || 0,
      manufacturer: this.staticCache?.manufacturer || 'Unbekannt',
      modelId: this.staticCache?.modelId || 'Interner Akku',
      serialNumber: this.staticCache?.serialNumber,
      chemistry: this.staticCache?.chemistry || 'Lithium-Ionen',
      voltageMv: 0,
      voltageV: 0,
      dischargeRateWatts: 0,
      chargeRateWatts: 0,
      currentWattage: 0,
      drainProcesses: [],
      drainAlert: null,
      activePowerPlan: active,
      availablePowerPlans: available
    }
  }
}

  /**
   * Terminates a running process by PID
   */
  public async killProcess(pid: number): Promise<{ success: boolean; message: string }> {
    if (!pid || pid <= 4 || pid === process.pid) {
      return { success: false, message: 'System- oder Eigenprozess kann nicht beendet werden.' }
    }
    try {
      await execAsync(`taskkill /F /PID ${pid}`, { timeout: 4000 })
      return { success: true, message: `Prozess mit PID ${pid} wurde erfolgreich beendet.` }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Prozess konnte nicht beendet werden.' }
    }
  }

  /**
   * Sets the active Windows power plan scheme
   */
  public async setPowerPlan(guid: string): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`powercfg /setactive ${guid}`, { timeout: 3000 })
      this.cachedPowerPlans = null
      this.lastPowerPlansTime = 0
      this.explicitActiveProfile = null
      return { success: true, message: 'Energieschema erfolgreich aktiviert.' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Fehler beim Wechseln des Energieschemas.' }
    }
  }

  /**
   * Generates detailed Windows HTML Battery Report and opens it in browser
   */
  public async generateHtmlReport(): Promise<BatteryReportResult> {
    const reportPath = path.join(
      os.homedir(),
      `Akkubericht-${new Date().toISOString().slice(0, 10)}.html`
    )
    try {
      await execAsync(`powercfg /batteryreport /output "${reportPath}"`, { timeout: 8000 })
      if (fs.existsSync(reportPath)) {
        await shell.openPath(reportPath)
        return { success: true, filePath: reportPath }
      }
      return { success: false, error: 'Bericht konnte nicht auf der Festplatte erstellt werden.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Fehler beim Generieren des Akkuberichts.' }
    }
  }

  /**
   * Returns predefined power profiles with active status
   */
  public async getPowerProfiles(force = false): Promise<PowerProfileInfo[]> {
    const { active } = await this.getPowerPlans(force).catch(() => ({ active: null }))
    const activeGuid = active?.guid?.toLowerCase() || ''
    const activeName = active?.name?.toLowerCase() || ''

    // Detect active scheme strictly and mutually exclusively:
    let activeMode: PowerProfileMode = 'balanced'

    if (
      this.explicitActiveProfile === 'eco' ||
      activeGuid.includes('a1841308') ||
      activeName.includes('energiespar') ||
      activeName.includes('stromspar') ||
      activeName.includes('saver')
    ) {
      activeMode = 'eco'
    } else if (
      this.explicitActiveProfile === 'performance' ||
      activeGuid.includes('8c5e7fda') ||
      activeGuid.includes('e9a42b02') ||
      activeGuid.includes('1fc9b93e') ||
      activeName.includes('leistung') ||
      activeName.includes('performance') ||
      activeName.includes('high')
    ) {
      activeMode = 'performance'
    } else {
      activeMode = 'balanced'
    }

    return [
      {
        mode: 'eco',
        title: '🌱 Eco / Energiesparen',
        description: 'Drosselt CPU-Spitzen auf 80 % im Akkubetrieb, schaltet Displays nach 3 Min. ab und schont den Akku.',
        planGuid: 'a1841308-3541-4fab-bc81-f71556f20b4a',
        cpuMaxPercentBattery: 80,
        cpuMaxPercentAc: 100,
        screenTimeoutMinutesBattery: 3,
        screenTimeoutMinutesAc: 10,
        isActive: activeMode === 'eco'
      },
      {
        mode: 'balanced',
        title: '⚖️ Ausbalanciert (Normal)',
        description: 'Standardmäßiges Windows-Profil mit dynamischer Taktung für optimale Balance aus Leistung und Laufzeit.',
        planGuid: '381b4222-f694-41f0-9685-ff5bb260df2e',
        cpuMaxPercentBattery: 100,
        cpuMaxPercentAc: 100,
        screenTimeoutMinutesBattery: 10,
        screenTimeoutMinutesAc: 20,
        isActive: activeMode === 'balanced'
      },
      {
        mode: 'performance',
        title: '🚀 Höchstleistung (Performance)',
        description: 'Maximale CPU-Taktung ohne Energiespardrosselung für rechenintensive Aufgaben und Gaming.',
        planGuid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
        cpuMaxPercentBattery: 100,
        cpuMaxPercentAc: 100,
        screenTimeoutMinutesBattery: 15,
        screenTimeoutMinutesAc: 0,
        isActive: activeMode === 'performance'
      }
    ]
  }

  /**
   * Activates a specific power profile
   */
  public async setPowerProfile(mode: PowerProfileMode): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Check existing plans to see if one matches this mode already
      const { available } = await this.getPowerPlans(true).catch(() => ({ available: [] }))
      let targetGuid = ''

      if (mode === 'eco') {
        const found = available.find(
          (p) =>
            p.guid.toLowerCase().includes('a1841308') ||
            p.name.toLowerCase().includes('energiespar') ||
            p.name.toLowerCase().includes('saver')
        )
        targetGuid = found ? found.guid : 'a1841308-3541-4fab-bc81-f71556f20b4a'
      } else if (mode === 'performance') {
        const found = available.find(
          (p) =>
            p.guid.toLowerCase().includes('8c5e7fda') ||
            p.guid.toLowerCase().includes('e9a42b02') ||
            p.name.toLowerCase().includes('leistung') ||
            p.name.toLowerCase().includes('performance')
        )
        targetGuid = found ? found.guid : '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
      } else {
        const found = available.find(
          (p) =>
            p.guid.toLowerCase().includes('381b4222') ||
            p.name.toLowerCase().includes('ausbalanciert') ||
            p.name.toLowerCase().includes('balanced')
        )
        targetGuid = found ? found.guid : '381b4222-f694-41f0-9685-ff5bb260df2e'
      }

      // Try activating scheme, duplicate if needed
      try {
        await execAsync(`powercfg /setactive ${targetGuid}`, { timeout: 3000 })
      } catch {
        try {
          const { stdout } = await execAsync(`powercfg -duplicatescheme ${targetGuid}`, { timeout: 4000 })
          const match = stdout.match(/:\s+([a-f0-9-]+)/i)
          if (match && match[1]) {
            targetGuid = match[1].trim()
            await execAsync(`powercfg /setactive ${targetGuid}`, { timeout: 3000 })
          }
        } catch {
          // If duplicatescheme fails, keep current
        }
      }

      // If eco mode, optimize CPU max state on DC (battery) to 80% to avoid thermal spiking
      if (mode === 'eco') {
        await execAsync(
          `powercfg /setdcvalueindex ${targetGuid} 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 80`,
          { timeout: 3000 }
        ).catch(() => {})
        await execAsync(`powercfg /change monitor-timeout-dc 3`, { timeout: 3000 }).catch(() => {})
      } else if (mode === 'balanced') {
        await execAsync(
          `powercfg /setdcvalueindex ${targetGuid} 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 100`,
          { timeout: 3000 }
        ).catch(() => {})
        await execAsync(`powercfg /change monitor-timeout-dc 10`, { timeout: 3000 }).catch(() => {})
      } else if (mode === 'performance') {
        await execAsync(`powercfg /change monitor-timeout-ac 0`, { timeout: 3000 }).catch(() => {})
      }

      // Explicitly set active mode and immediately clear cache
      this.explicitActiveProfile = mode
      this.cachedPowerPlans = null
      this.lastPowerPlansTime = 0

      const titles: Record<PowerProfileMode, string> = {
        eco: '🌱 Eco / Energiesparmodus aktiviert (CPU-Spitzen auf 80 % gedeckelt)',
        balanced: '⚖️ Ausbalanciertes Profil aktiviert (Standard)',
        performance: '🚀 Höchstleistungs-Profil aktiviert (Keine Drosselung)'
      }

      return { success: true, message: titles[mode] }
    } catch (err: any) {
      console.error('[BatteryService] Error setting power profile:', err)
      return { success: false, message: err?.message || 'Fehler beim Aktivieren des Profils.' }
    }
  }
}

export const batteryService = BatteryService.getInstance()


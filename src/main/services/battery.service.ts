import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { shell } from 'electron'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import { powerShellWorker } from './powershell-worker.service'
import type {
  BatteryInfo,
  PowerPlanItem,
  BatteryReportResult
} from '../../shared/battery.types'

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

  public getStaticCache(): CachedStaticData | null {
    return this.staticCache
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
   * Fetches real-time battery status combined with static capacity info and live discharge/charge wattage.
   */
  public async getBatteryInfo(): Promise<BatteryInfo> {
    try {
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
      activePowerPlan: active,
      availablePowerPlans: available
    }
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
}

export const batteryService = BatteryService.getInstance()


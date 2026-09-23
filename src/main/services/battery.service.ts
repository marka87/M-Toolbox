import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { shell } from 'electron'
import type {
  BatteryInfo,
  PowerPlanItem,
  BatteryReportResult,
  BatteryDrainProcess,
  BatteryDrainAlert,
  BatteryDrainImpact
} from '../../shared/battery.types'

const execAsync = promisify(exec)

interface CachedStaticData {
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
  private readonly STATIC_CACHE_TTL = 60000 // 60 seconds

  private constructor() {}

  public static getInstance(): BatteryService {
    if (!BatteryService.instance) {
      BatteryService.instance = new BatteryService()
    }
    return BatteryService.instance
  }

  private async runPowerShell(script: string, timeout = 7000): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { stdout } = await execAsync(
      `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { timeout }
    )
    return stdout || ''
  }

  /**
   * Reads static battery hardware parameters via powercfg /batteryreport /xml
   */
  private async getStaticBatteryData(): Promise<CachedStaticData | null> {
    const now = Date.now()
    if (this.staticCache && now - this.staticCache.timestamp < this.STATIC_CACHE_TTL) {
      return this.staticCache
    }

    const xmlPath = path.join(os.tmpdir(), `mtoolbox_bat_${Date.now()}.xml`)
    try {
      await execAsync(`powercfg /batteryreport /output "${xmlPath}" /xml`, { timeout: 6000 })
      if (!fs.existsSync(xmlPath)) {
        return null
      }

      const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8')
      await fs.promises.unlink(xmlPath).catch(() => {})

      // Simple regex extraction from batteryreport XML to avoid heavy XML parser dependencies
      const designMatch = xmlContent.match(/<DesignCapacity[^>]*>(\d+)<\/DesignCapacity>/i)
      const fullMatch = xmlContent.match(/<FullChargeCapacity[^>]*>(\d+)<\/FullChargeCapacity>/i)
      const cycleMatch = xmlContent.match(/<CycleCount[^>]*>(\d+)<\/CycleCount>/i)
      const mfgMatch = xmlContent.match(/<Manufacturer[^>]*>([^<]+)<\/Manufacturer>/i)
      const idMatch = xmlContent.match(/<Id[^>]*>([^<]+)<\/Id>/i)
      const serialMatch = xmlContent.match(/<SerialNumber[^>]*>([^<]+)<\/SerialNumber>/i)
      const chemMatch = xmlContent.match(/<Chemistry[^>]*>([^<]+)<\/Chemistry>/i)

      const design = designMatch ? parseInt(designMatch[1], 10) : 0
      const full = fullMatch ? parseInt(fullMatch[1], 10) : 0
      const cycles = cycleMatch ? parseInt(cycleMatch[1], 10) : 0
      const mfg = mfgMatch ? mfgMatch[1].trim() : 'Unbekannt'
      const id = idMatch ? idMatch[1].trim() : 'Standard-Akku'
      const serial = serialMatch ? serialMatch[1].trim() : undefined
      const chem = chemMatch ? chemMatch[1].trim() : 'Li-Ion'

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
      return null
    }
  }

  /**
   * Reads available and active Windows Power Schemes
   */
  private async getPowerPlans(): Promise<{
    active: PowerPlanItem | null
    available: PowerPlanItem[]
  }> {
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

    return { active, available: plans }
  }

  /**
   * Fetches real-time battery status combined with static capacity info,
   * live discharge/charge wattage, and top energy-draining processes.
   */
  public async getBatteryInfo(): Promise<BatteryInfo> {
    // 1. Check live power status, WMI battery status & sample process CPU delta
    const psScript = `
      $ProgressPreference = 'SilentlyContinue'
      Add-Type -AssemblyName System.Windows.Forms
      $p = [System.Windows.Forms.SystemInformation]::PowerStatus
      $wmi = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
      $b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1

      # Measure process CPU delta over 400ms
      $p1 = @{}
      Get-Process | ForEach-Object { if ($_.CPU) { $p1[$_.Id] = $_.CPU } }
      Start-Sleep -Milliseconds 400
      $cores = [Environment]::ProcessorCount

      $apps = Get-Process | ForEach-Object {
        if ($_.CPU -and $p1.ContainsKey($_.Id)) {
          $delta = ($_.CPU - $p1[$_.Id]) / 0.4 / $cores * 100
          if ($delta -ge 0.3) {
            [PSCustomObject]@{
              Id = $_.Id
              Name = $_.ProcessName
              CpuPercent = [Math]::Round($delta, 1)
              MemoryMB = [Math]::Round($_.WorkingSet64 / 1MB)
            }
          }
        }
      } | Sort-Object CpuPercent -Descending | Select-Object -First 10

      [PSCustomObject]@{
        ChargePercent = [int][Math]::Round($p.BatteryLifePercent * 100)
        ChargeStatus = $p.BatteryChargeStatus.ToString()
        PowerLine = $p.PowerLineStatus.ToString()
        RemainingSeconds = $p.BatteryLifeRemaining
        DischargeRate = if ($wmi) { [int]$wmi.DischargeRate } else { 0 }
        ChargeRate = if ($wmi) { [int]$wmi.ChargeRate } else { 0 }
        Charging = if ($wmi) { [bool]$wmi.Charging } else { $false }
        Discharging = if ($wmi) { [bool]$wmi.Discharging } else { $false }
        PowerOnline = if ($wmi) { [bool]$wmi.PowerOnline } else { ($p.PowerLineStatus.ToString() -eq 'Online') }
        Voltage = if ($wmi -and $wmi.Voltage) { [int]$wmi.Voltage } elseif ($b -and $b.DesignVoltage) { [int]$b.DesignVoltage } else { 0 }
        TopProcesses = $apps
      } | ConvertTo-Json -Depth 3 -Compress
    `

    let liveData: any = {
      ChargePercent: 100,
      ChargeStatus: 'Online',
      PowerLine: 'Online',
      RemainingSeconds: -1,
      DischargeRate: 0,
      ChargeRate: 0,
      Charging: false,
      Discharging: false,
      PowerOnline: true,
      Voltage: 0,
      TopProcesses: []
    }

    let hasBattery = true

    try {
      const stdout = await this.runPowerShell(psScript, 6000)
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        liveData = parsed
        if (parsed.ChargeStatus === 'NoSystemBattery' || parsed.ChargePercent < 0) {
          hasBattery = false
        }
      }
    } catch (err) {
      console.warn('[BatteryService] Live power status query failed:', err)
    }

    // 2. Fetch static battery capacities & hardware details
    const staticData = hasBattery ? await this.getStaticBatteryData() : null
    if (!staticData && liveData.ChargeStatus === 'NoSystemBattery') {
      hasBattery = false
    }

    // 3. Fetch power plans
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

    // Map top processes to BatteryDrainProcess
    const rawProcesses = Array.isArray(liveData.TopProcesses)
      ? liveData.TopProcesses
      : liveData.TopProcesses
      ? [liveData.TopProcesses]
      : []

    const drainProcesses: BatteryDrainProcess[] = rawProcesses
      .filter((p: any) => p && p.Name && !['Idle'].includes(p.Name))
      .map((p: any) => {
        const cpu = typeof p.CpuPercent === 'number' ? p.CpuPercent : 0
        let impactLevel: BatteryDrainImpact = 'Niedrig'
        if (cpu >= 15) impactLevel = 'Sehr hoch'
        else if (cpu >= 7) impactLevel = 'Hoch'
        else if (cpu >= 2) impactLevel = 'Moderat'

        return {
          id: p.Id,
          name: p.Name,
          cpuPercent: cpu,
          memoryMb: p.MemoryMB || 0,
          impactLevel,
          estimatedDrainText: `${cpu}% CPU`
        }
      })

    // Battery Drain Alert evaluation
    let drainAlert: BatteryDrainAlert | null = null
    if (isDischarging) {
      const benignNames = ['Idle', 'System', 'Registry', 'smss', 'csrss']
      const activeDrainHog = drainProcesses.find(
        (p) => p.cpuPercent >= 12 && !benignNames.includes(p.name)
      )

      if (activeDrainHog || dischargeRateWatts >= 18) {
        const primaryHog = activeDrainHog || drainProcesses[0]
        const isCritical =
          dischargeRateWatts >= 25 || (activeDrainHog && activeDrainHog.cpuPercent >= 25)

        drainAlert = {
          title: isCritical ? 'Kritisch hoher Akkuverbrauch' : 'Erhöhter Akkuverbrauch erkannt',
          message: primaryHog
            ? `"${primaryHog.name}" (PID: ${primaryHog.id}) beansprucht aktuell ${primaryHog.cpuPercent}% CPU und erhöht die Entladerate ${dischargeRateWatts > 0 ? `auf -${dischargeRateWatts} W` : 'spürbar'}.`
            : `Hohe Systementladung von -${dischargeRateWatts} W im Akkubetrieb.`,
          processName: primaryHog?.name || 'Hintergrundprozess',
          pid: primaryHog?.id || 0,
          severity: isCritical ? 'critical' : 'warning',
          cpuPercent: primaryHog?.cpuPercent || 0,
          dischargeWattage: dischargeRateWatts
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

    return {
      hasBattery,
      chargePercent: Math.min(100, Math.max(0, liveData.ChargePercent)),
      statusText,
      isCharging,
      isDischarging,
      isAcOnline,
      remainingSeconds: liveData.RemainingSeconds,
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
      activePowerPlan: active,
      availablePowerPlans: available
    }
  }

  /**
   * Terminates a running process by PID
   */
  public async killProcess(pid: number): Promise<{ success: boolean; message: string }> {
    if (!pid || pid <= 4) {
      return { success: false, message: 'Systemprozess kann nicht beendet werden.' }
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


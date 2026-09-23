import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { shell } from 'electron'
import type { BatteryInfo, PowerPlanItem, BatteryReportResult } from '../../shared/battery.types'

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
   * Fetches real-time battery status combined with static capacity info
   */
  public async getBatteryInfo(): Promise<BatteryInfo> {
    // 1. Check live power status via quick PowerShell call
    const psScript = `
      $ProgressPreference = 'SilentlyContinue'
      Add-Type -AssemblyName System.Windows.Forms
      $p = [System.Windows.Forms.SystemInformation]::PowerStatus
      $b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
      [PSCustomObject]@{
        ChargePercent = [int][Math]::Round($p.BatteryLifePercent * 100)
        ChargeStatus = $p.BatteryChargeStatus.ToString()
        PowerLine = $p.PowerLineStatus.ToString()
        RemainingSeconds = $p.BatteryLifeRemaining
        Voltage = if ($b -and $b.DesignVoltage) { [int]$b.DesignVoltage } else { 0 }
      } | ConvertTo-Json -Compress
    `

    let liveData = {
      ChargePercent: 100,
      ChargeStatus: 'Online',
      PowerLine: 'Online',
      RemainingSeconds: -1,
      Voltage: 0
    }

    let hasBattery = true

    try {
      const stdout = await this.runPowerShell(psScript, 3500)
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

    const isAcOnline = liveData.PowerLine === 'Online'
    const isCharging = liveData.ChargeStatus.toLowerCase().includes('charging')

    let statusText = 'Normal'
    if (!hasBattery) {
      statusText = 'Kein Akku erkannt (Desktop-PC / Netzbetrieb)'
    } else if (isCharging) {
      statusText = liveData.ChargePercent >= 99 ? 'Vollständig geladen (Netzbetrieb)' : 'Wird geladen'
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
      voltageMv: liveData.Voltage,
      activePowerPlan: active,
      availablePowerPlans: available
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

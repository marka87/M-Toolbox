import os from 'node:os'
import { app, powerMonitor } from 'electron'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import { batteryService } from './battery.service'
import type { LiveMetrics } from '../../shared/types'

export interface TelemetryBatteryState {
  hasBattery: boolean
  isAcOnline: boolean
  percent: number
  isCharging: boolean
  chargeRateWatts: number
  dischargeRateWatts: number
  healthPercent?: number
}

export interface TelemetrySnapshot {
  cpuUsagePercent: number
  ramUsagePercent: number
  ramUsedGB: number
  ramTotalGB: number
  networkSendKBps: number
  networkReceiveKBps: number
  gpuUsagePercent: number
  battery: TelemetryBatteryState
  temperatures?: {
    cpu?: number
    gpu?: number
  }
  smartStatus?: string
  timestamp: number
}

type MetricsListener = (metrics: LiveMetrics) => void

export class TelemetryService {
  private static instance: TelemetryService

  // In-memory single-source-of-truth cache
  private cache: TelemetrySnapshot = {
    cpuUsagePercent: 0,
    ramUsagePercent: 0,
    ramUsedGB: 0,
    ramTotalGB: 0,
    networkSendKBps: 0,
    networkReceiveKBps: 0,
    gpuUsagePercent: 0,
    battery: {
      hasBattery: false,
      isAcOnline: true,
      percent: 100,
      isCharging: false,
      chargeRateWatts: 0,
      dischargeRateWatts: 0
    },
    timestamp: Date.now()
  }

  // Subscriber callbacks
  private listeners: Set<MetricsListener> = new Set()

  // Loop & timer handles
  private isRunning = false
  private isPaused = false
  private mainLoopTimer: NodeJS.Timeout | null = null

  // Timestamp trackers for adaptive refresh
  private lastCpuSampleTime = 0
  private lastGpuSampleTime = 0
  private lastNetSampleTime = 0
  private lastRamSampleTime = 0
  private lastTempSampleTime = 0
  private lastBatterySampleTime = 0
  private lastSmartSampleTime = 0

  // CPU delta state
  private lastCpuTimes: { idle: number; total: number } | null = null

  // Network delta state
  private lastNetStats: { rxBytes: number; txBytes: number; timestamp: number } | null = null

  // GPU detection & concurrency control
  private hasNvidia = true
  private isSamplingGpu = false
  private isSamplingBattery = false

  // Last broadcasted metrics (for dirty-checking)
  private lastBroadcastJson = ''

  private constructor() {
    this.initPowerMonitor()
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService()
    }
    return TelemetryService.instance
  }

  private initPowerMonitor(): void {
    try {
      // 1. Initial AC status check via Electron powerMonitor (zero process overhead)
      if (typeof powerMonitor.isOnBatteryPower === 'function') {
        this.cache.battery.isAcOnline = !powerMonitor.isOnBatteryPower()
      }

      powerMonitor.on('on-ac', () => {
        this.handlePowerSourceChange(true)
      })

      powerMonitor.on('on-battery', () => {
        this.handlePowerSourceChange(false)
      })

      powerMonitor.on('suspend', () => {
        this.pause()
      })

      powerMonitor.on('resume', () => {
        this.resume()
      })

      powerMonitor.on('lock-screen', () => {
        this.pause()
      })

      powerMonitor.on('unlock-screen', () => {
        this.resume()
      })

      app.on('before-quit', () => {
        this.dispose()
      })
    } catch {
      // powerMonitor may not be available in headless test environments
    }
  }

  private handlePowerSourceChange(isAc: boolean): void {
    this.cache.battery.isAcOnline = isAc
    this.broadcastIfChanged()
  }

  public pause(): void {
    this.isPaused = true
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false

    // Update battery health once after resume
    this.sampleBatteryHealthOnce()

    // Immediate fresh snapshot
    this.sampleImmediate()
  }

  /**
   * Registers a listener and starts the background sampling loop if not already running.
   */
  public subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener)
    // Send immediate snapshot to new subscriber
    listener(this.getLiveMetrics())

    if (!this.isRunning) {
      this.startLoop()
    }

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.stopLoop()
      }
    }
  }

  /**
   * Returns current live metrics snapshot from memory cache.
   */
  public getLiveMetrics(): LiveMetrics {
    return {
      cpuUsagePercent: this.cache.cpuUsagePercent,
      ramUsagePercent: this.cache.ramUsagePercent,
      ramUsedGB: this.cache.ramUsedGB,
      ramTotalGB: this.cache.ramTotalGB,
      networkSendKBps: this.cache.networkSendKBps,
      networkReceiveKBps: this.cache.networkReceiveKBps,
      gpuUsagePercent: this.cache.gpuUsagePercent,
      timestamp: this.cache.timestamp,
      battery: { ...this.cache.battery }
    }
  }

  public getSnapshot(): TelemetrySnapshot {
    return { ...this.cache }
  }

  private startLoop(): void {
    this.isRunning = true
    this.isPaused = false

    // Sample battery health once at startup
    this.sampleBatteryHealthOnce()

    this.sampleImmediate()

    // Master heartbeat tick every 500ms to evaluate adaptive intervals
    this.mainLoopTimer = setInterval(() => {
      if (!this.isPaused && this.listeners.size > 0) {
        this.tick()
      }
    }, 500)
  }

  private stopLoop(): void {
    this.isRunning = false
    if (this.mainLoopTimer) {
      clearInterval(this.mainLoopTimer)
      this.mainLoopTimer = null
    }
  }

  public dispose(): void {
    this.stopLoop()
    this.listeners.clear()
  }

  private async sampleImmediate(): Promise<void> {
    this.sampleCpu()
    this.sampleRam()
    await this.sampleNetwork()
    this.sampleGpu()
    await this.sampleBattery()
    this.broadcastIfChanged()
  }

  /**
   * Adaptive refresh scheduler
   */
  private async tick(): Promise<void> {
    const now = Date.now()
    const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    let hasChanges = false

    // 1. CPU (1s normal, 2s eco)
    if (now - this.lastCpuSampleTime >= 1000 * multiplier) {
      this.sampleCpu()
      this.lastCpuSampleTime = now
      hasChanges = true
    }

    // 2. GPU (1s normal, 2s eco) - on demand, allows dGPU to sleep
    if (now - this.lastGpuSampleTime >= 1000 * multiplier) {
      this.sampleGpu()
      this.lastGpuSampleTime = now
      hasChanges = true
    }

    // 3. Network (1s normal, 2s eco)
    if (now - this.lastNetSampleTime >= 1000 * multiplier) {
      await this.sampleNetwork()
      this.lastNetSampleTime = now
      hasChanges = true
    }

    // 4. RAM (2s normal, 4s eco)
    if (now - this.lastRamSampleTime >= 2000 * multiplier) {
      this.sampleRam()
      this.lastRamSampleTime = now
      hasChanges = true
    }

    // 5. Temperatures (3s normal, 6s eco)
    if (now - this.lastTempSampleTime >= 3000 * multiplier) {
      this.sampleTemperatures()
      this.lastTempSampleTime = now
    }

    // 6. Unified Battery & Wattage (3s normal, 6s eco)
    if (now - this.lastBatterySampleTime >= 3000 * multiplier) {
      await this.sampleBattery()
      this.lastBatterySampleTime = now
      hasChanges = true
    }

    // 7. SMART status (every 30 minutes)
    if (now - this.lastSmartSampleTime >= 1800000) {
      this.sampleSmartStatus()
      this.lastSmartSampleTime = now
    }

    if (hasChanges) {
      this.broadcastIfChanged()
    }
  }

  // --- SAMPLING METHODS ---

  private sampleCpu(): void {
    const cpus = os.cpus()
    let idle = 0
    let total = 0

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type]
      }
      idle += cpu.times.idle
    }

    if (!this.lastCpuTimes) {
      this.lastCpuTimes = { idle, total }
      return
    }

    const idleDelta = idle - this.lastCpuTimes.idle
    const totalDelta = total - this.lastCpuTimes.total
    this.lastCpuTimes = { idle, total }

    if (totalDelta <= 0) return
    const usage = 100 - Math.round((idleDelta / totalDelta) * 100)
    this.cache.cpuUsagePercent = Math.max(0, Math.min(100, usage))
    this.cache.timestamp = Date.now()
  }

  private sampleRam(): void {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    this.cache.ramUsagePercent = Math.round((usedMem / totalMem) * 100)
    this.cache.ramUsedGB = Number((usedMem / (1024 * 1024 * 1024)).toFixed(1))
    this.cache.ramTotalGB = Number((totalMem / (1024 * 1024 * 1024)).toFixed(1))
    this.cache.timestamp = Date.now()
  }

  private async sampleNetwork(): Promise<void> {
    const now = Date.now()
    try {
      const { stdout } = await execAsync('netstat -e', { timeout: 1500, windowsHide: true })
      const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/i)
      if (!match) return

      const currentRx = parseInt(match[1], 10)
      const currentTx = parseInt(match[2], 10)

      if (!this.lastNetStats) {
        this.lastNetStats = { rxBytes: currentRx, txBytes: currentTx, timestamp: now }
        return
      }

      const timeDeltaSeconds = (now - this.lastNetStats.timestamp) / 1000
      if (timeDeltaSeconds <= 0) return

      const rxDelta = Math.max(0, currentRx - this.lastNetStats.rxBytes)
      const txDelta = Math.max(0, currentTx - this.lastNetStats.txBytes)
      this.lastNetStats = { rxBytes: currentRx, txBytes: currentTx, timestamp: now }

      this.cache.networkReceiveKBps = Math.round(rxDelta / 1024 / timeDeltaSeconds)
      this.cache.networkSendKBps = Math.round(txDelta / 1024 / timeDeltaSeconds)
      this.cache.timestamp = now
    } catch {
      // keep cached
    }
  }

  /**
   * Samples GPU utilization on demand.
   * Avoids persistent loop processes to allow dGPU (Nvidia Optimus) to enter D3cold sleep.
   */
  private sampleGpu(): void {
    if (this.isSamplingGpu) return
    this.isSamplingGpu = true

    if (this.hasNvidia) {
      execAsync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', {
        timeout: 1500,
        windowsHide: true
      })
        .then(({ stdout }) => {
          const val = parseInt(stdout.trim(), 10)
          if (!isNaN(val)) {
            this.cache.gpuUsagePercent = Math.min(100, Math.max(0, val))
            this.cache.timestamp = Date.now()
          }
        })
        .catch(() => {
          this.hasNvidia = false
          this.sampleGpuViaWmi()
        })
        .finally(() => {
          this.isSamplingGpu = false
        })
    } else {
      this.sampleGpuViaWmi()
    }
  }

  /**
   * GPU WMI fallback constrained to engtype_3D and bounded to 0-100%
   */
  private sampleGpuViaWmi(): void {
    const cmd = `(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*engtype_3D*' } | Measure-Object -Property UtilizationPercentage -Sum).Sum`
    powershellService
      .runPowerShell(cmd, 3000)
      .then((raw) => {
        const val = parseInt(raw.trim(), 10)
        if (!isNaN(val)) {
          this.cache.gpuUsagePercent = Math.min(100, Math.max(0, val))
          this.cache.timestamp = Date.now()
        }
      })
      .catch(() => {})
      .finally(() => {
        this.isSamplingGpu = false
      })
  }

  /**
   * Unified battery, power status & wattage query.
   * Combines PowerStatus and BatteryStatus into ONE lightweight call.
   */
  private async sampleBattery(): Promise<void> {
    if (this.isSamplingBattery) return
    this.isSamplingBattery = true

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $p = [System.Windows.Forms.SystemInformation]::PowerStatus
      $wmi = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
      [PSCustomObject]@{
        HasBat = ($p.BatteryChargeStatus.ToString() -ne 'NoSystemBattery')
        LineStatus = $p.PowerLineStatus.ToString()
        Percent = [int]($p.BatteryLifePercent * 100)
        Status = $p.BatteryChargeStatus.ToString()
        ChargeRate = if ($wmi) { [int64]$wmi.ChargeRate } else { 0 }
        DischargeRate = if ($wmi) { [int64]$wmi.DischargeRate } else { 0 }
      } | ConvertTo-Json -Compress
    `.replace(/\r?\n\s*/g, ' ')

    try {
      const stdout = await powershellService.runPowerShell(script, 3500)
      if (stdout && stdout.trim() && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout.trim())
        const hasBattery = Boolean(parsed.HasBat)
        this.cache.battery.hasBattery = hasBattery

        if (hasBattery) {
          const isAcOnline = parsed.LineStatus === 'Online'
          const isCharging = parsed.Status.includes('Charging') || parsed.ChargeRate > 0
          const percent = Math.min(100, Math.max(0, parsed.Percent >= 0 ? parsed.Percent : 100))
          const chargeRate = parsed.ChargeRate ? Math.round((parsed.ChargeRate / 1000) * 10) / 10 : 0
          const dischargeRate = parsed.DischargeRate ? Math.round((parsed.DischargeRate / 1000) * 10) / 10 : 0

          this.cache.battery.isAcOnline = isAcOnline
          this.cache.battery.isCharging = isCharging
          this.cache.battery.percent = percent
          this.cache.battery.chargeRateWatts = chargeRate
          this.cache.battery.dischargeRateWatts = dischargeRate
          this.cache.timestamp = Date.now()
        }
      }
    } catch {
      // Keep cached
    } finally {
      this.isSamplingBattery = false
    }
  }

  /**
   * Sample battery health / wear level once from BatteryService's cached static data.
   * Eliminates duplicate XML report generation and extra WMI queries.
   */
  private async sampleBatteryHealthOnce(): Promise<void> {
    try {
      const staticData = await batteryService.getStaticBatteryData()
      if (staticData && staticData.healthPercent > 0) {
        this.cache.battery.healthPercent = staticData.healthPercent
      } else {
        this.cache.battery.healthPercent = undefined
      }
    } catch {
      this.cache.battery.healthPercent = undefined
    }
  }

  private sampleTemperatures(): void {
    if (this.hasNvidia) {
      execAsync('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits', {
        timeout: 1500,
        windowsHide: true
      })
        .then(({ stdout }) => {
          const gpuTemp = parseInt(stdout.trim(), 10)
          if (!isNaN(gpuTemp)) {
            this.cache.temperatures = {
              ...this.cache.temperatures,
              gpu: gpuTemp
            }
          }
        })
        .catch(() => {})
    }
  }

  private sampleSmartStatus(): void {
    const script = `Get-PhysicalDisk -ErrorAction SilentlyContinue | Select-Object -ExpandProperty HealthStatus -First 1`
    powershellService
      .runPowerShell(script, 5000)
      .then((stdout) => {
        if (stdout && stdout.trim()) {
          this.cache.smartStatus = stdout.trim()
        }
      })
      .catch(() => {})
  }

  private broadcastIfChanged(): void {
    const metrics = this.getLiveMetrics()
    // Compare key values to avoid spamming renderer IPC if values didn't change
    const signature = `${metrics.cpuUsagePercent}_${metrics.ramUsagePercent}_${metrics.networkReceiveKBps}_${metrics.networkSendKBps}_${metrics.gpuUsagePercent}_${metrics.battery?.percent}_${metrics.battery?.isCharging}_${metrics.battery?.isAcOnline}_${metrics.battery?.chargeRateWatts}_${metrics.battery?.dischargeRateWatts}`

    if (signature === this.lastBroadcastJson) {
      return
    }
    this.lastBroadcastJson = signature

    for (const listener of this.listeners) {
      try {
        listener(metrics)
      } catch (err) {
        console.error('[TelemetryService] Error in listener callback:', err)
      }
    }
  }
}

export const telemetryService = TelemetryService.getInstance()

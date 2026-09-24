import os from 'node:os'
import { powerMonitor } from 'electron'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
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

  // In-memory cache single-source-of-truth
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
  private lastWattageSampleTime = 0
  private lastBatPercentSampleTime = 0
  private lastBatHealthSampleTime = 0
  private lastSmartSampleTime = 0

  // CPU delta state
  private lastCpuTimes: { idle: number; total: number } | null = null

  // Network delta state
  private lastNetStats: { rxBytes: number; txBytes: number; timestamp: number } | null = null

  // GPU detection state
  private hasNvidia = true
  private isSamplingGpu = false

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
    } catch {
      // powerMonitor may not be available in test environments
    }
  }

  public pause(): void {
    this.isPaused = true
  }

  public resume(): void {
    this.isPaused = false
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
    this.sampleImmediate()

    // High precision master heartbeat tick (every 500ms), checks adaptive intervals
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

  private async sampleImmediate(): Promise<void> {
    this.sampleCpu()
    this.sampleRam()
    await this.sampleNetwork()
    this.sampleGpu()
    await this.sampleBattery()
    this.broadcastIfChanged()
  }

  /**
   * Main adaptive refresh scheduler
   */
  private async tick(): Promise<void> {
    const now = Date.now()
    const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    let hasChanges = false

    // 1. CPU / GPU (1s normal, 2s eco)
    if (now - this.lastCpuSampleTime >= 1000 * multiplier) {
      this.sampleCpu()
      this.sampleGpu()
      this.lastCpuSampleTime = now
      hasChanges = true
    }

    // 2. Netzwerk (1s normal, 2s eco)
    if (now - this.lastNetSampleTime >= 1000 * multiplier) {
      await this.sampleNetwork()
      this.lastNetSampleTime = now
      hasChanges = true
    }

    // 3. RAM (2s normal, 4s eco)
    if (now - this.lastRamSampleTime >= 2000 * multiplier) {
      this.sampleRam()
      this.lastRamSampleTime = now
      hasChanges = true
    }

    // 4. Temperaturen (3s normal, 6s eco)
    if (now - this.lastTempSampleTime >= 3000 * multiplier) {
      this.sampleTemperatures()
      this.lastTempSampleTime = now
    }

    // 5. Ladeleistung / Wattage (3s normal, 6s eco)
    if (now - this.lastWattageSampleTime >= 3000 * multiplier) {
      this.sampleWattage()
      this.lastWattageSampleTime = now
      hasChanges = true
    }

    // 6. Akku Prozent (15s normal, 30s eco)
    if (now - this.lastBatPercentSampleTime >= 15000 * multiplier) {
      await this.sampleBattery()
      this.lastBatPercentSampleTime = now
      hasChanges = true
    }

    // 7. Batterie-Health (alle 10 Minuten = 600s)
    if (now - this.lastBatHealthSampleTime >= 600000) {
      this.sampleBatteryHealth()
      this.lastBatHealthSampleTime = now
    }

    // 8. SMART (alle 30 Minuten = 1800s)
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

  private sampleGpu(): void {
    const now = Date.now()
    if (this.isSamplingGpu || now - this.lastGpuSampleTime < 1000) {
      return
    }
    this.isSamplingGpu = true
    this.lastGpuSampleTime = now

    if (this.hasNvidia) {
      execAsync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', {
        timeout: 1500,
        windowsHide: true
      })
        .then(({ stdout }) => {
          const val = parseInt(stdout.trim(), 10)
          if (!isNaN(val)) {
            this.cache.gpuUsagePercent = Math.min(100, Math.max(0, val))
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

  private sampleGpuViaWmi(): void {
    const cmd = `Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Measure-Object -Property UtilizationPercentage -Sum | Select-Object -ExpandProperty Sum`
    powershellService
      .executeCommand(cmd, 3000)
      .then((res) => {
        const val = parseInt(res.stdout.trim(), 10)
        if (!isNaN(val)) {
          this.cache.gpuUsagePercent = Math.min(100, Math.max(0, val))
        }
      })
      .catch(() => {})
      .finally(() => {
        this.isSamplingGpu = false
      })
  }

  private async sampleBattery(): Promise<void> {
    try {
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        $p = [System.Windows.Forms.SystemInformation]::PowerStatus
        [PSCustomObject]@{
          LineStatus = $p.PowerLineStatus.ToString()
          Percent = [int]($p.BatteryLifePercent * 100)
          Status = $p.BatteryChargeStatus.ToString()
        } | ConvertTo-Json -Compress
      `
      const stdout = await powershellService.runPowerShell(script, 3500)
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        const hasBattery = parsed.Status !== 'NoSystemBattery' && parsed.Percent >= 0
        const isAcOnline = parsed.LineStatus === 'Online'
        const isCharging = parsed.Status.includes('Charging')
        const percent = Math.min(100, Math.max(0, parsed.Percent || 100))

        this.cache.battery.hasBattery = hasBattery
        this.cache.battery.isAcOnline = isAcOnline
        this.cache.battery.isCharging = isCharging
        this.cache.battery.percent = percent
      }
    } catch {
      // keep cached
    }
  }

  private sampleWattage(): void {
    if (!this.cache.battery.hasBattery) return

    const script = `
      $wmi = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($wmi) {
        [PSCustomObject]@{
          ChargeRate = $wmi.ChargeRate
          DischargeRate = $wmi.DischargeRate
        } | ConvertTo-Json -Compress
      }
    `
    powershellService
      .runPowerShell(script, 3000)
      .then((stdout) => {
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout.trim())
          const chargeRate = parsed.ChargeRate ? Math.round((parsed.ChargeRate / 1000) * 10) / 10 : 0
          const dischargeRate = parsed.DischargeRate ? Math.round((parsed.DischargeRate / 1000) * 10) / 10 : 0
          this.cache.battery.chargeRateWatts = chargeRate
          this.cache.battery.dischargeRateWatts = dischargeRate
        }
      })
      .catch(() => {})
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

  private sampleBatteryHealth(): void {
    if (!this.cache.battery.hasBattery) return

    const script = `
      $b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($b -and $b.DesignCapacity -and $b.FullChargeCapacity) {
        [math]::Round(($b.FullChargeCapacity / $b.DesignCapacity) * 100)
      }
    `
    powershellService
      .runPowerShell(script, 4000)
      .then((stdout) => {
        const val = parseInt(stdout.trim(), 10)
        if (!isNaN(val) && val > 0 && val <= 100) {
          this.cache.battery.healthPercent = val
        }
      })
      .catch(() => {})
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
    const signature = `${metrics.cpuUsagePercent}_${metrics.ramUsagePercent}_${metrics.networkReceiveKBps}_${metrics.networkSendKBps}_${metrics.gpuUsagePercent}_${metrics.battery?.percent}_${metrics.battery?.isCharging}`

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

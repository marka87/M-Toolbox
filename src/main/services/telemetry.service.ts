import os from 'node:os'
import { app, powerMonitor } from 'electron'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import { powerShellWorker } from './powershell-worker.service'
import { batteryService } from './battery.service'
import type { LiveMetrics, TelemetryMetric } from '../../shared/types'

export type { TelemetryMetric }

export interface SubscribeOptions {
  metrics?: TelemetryMetric[]
  windowId?: number
  isBackground?: boolean
}

interface SubscriberInfo {
  listener: MetricsListener
  metrics: Set<TelemetryMetric>
  windowId?: number
  isBackground: boolean
  isActive: boolean
}

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

  // Subscriber tracking (demand-driven & visibility-aware)
  private subscribers: Map<MetricsListener, SubscriberInfo> = new Map()

  // Loop & timer handles
  private isRunning = false
  private isPaused = false
  private isLocked = false
  private isSuspended = false
  private isTicking = false
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

  // Mutexes & concurrency control
  private hasNvidia = true
  private isSamplingGpu = false
  private isSamplingBattery = false
  private isSamplingNet = false

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
        this.isSuspended = true
        this.clearTimer()
        powerShellWorker.terminateProcess()
      })

      powerMonitor.on('resume', () => {
        this.isSuspended = false
        if (!this.isLocked && !this.isPaused && this.canSample()) {
          this.handleWakeUpOrUnlock()
        }
      })

      powerMonitor.on('lock-screen', () => {
        this.isLocked = true
        this.clearTimer()
        powerShellWorker.terminateProcess()
      })

      powerMonitor.on('unlock-screen', () => {
        this.isLocked = false
        if (!this.isSuspended && !this.isPaused && this.canSample()) {
          this.handleWakeUpOrUnlock()
        }
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
    this.sampleBattery()
      .then(() => this.broadcastIfChanged())
      .catch(() => {})
  }

  private canSample(): boolean {
    return (
      this.isRunning &&
      !this.isPaused &&
      !this.isLocked &&
      !this.isSuspended &&
      this.hasActiveSubscribers()
    )
  }

  private clearTimer(): void {
    if (this.mainLoopTimer) {
      clearTimeout(this.mainLoopTimer)
      this.mainLoopTimer = null
    }
  }

  private async handleWakeUpOrUnlock(): Promise<void> {
    this.clearTimer()
    await this.sampleBatteryHealthOnce()
    await this.sampleImmediate()
    this.scheduleNextTick()
  }

  public pause(): void {
    this.isPaused = true
    this.clearTimer()
    powerShellWorker.terminateProcess()
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false
    if (!this.isLocked && !this.isSuspended && this.canSample()) {
      this.handleWakeUpOrUnlock()
    }
  }

  /**
   * Registers a listener and starts the background sampling loop if not already running.
   * If opts is omitted, all metrics are sampled by default (backwards compatible).
   */
  public subscribe(listener: MetricsListener, opts?: SubscribeOptions): () => void {
    const allMetrics: TelemetryMetric[] = [
      'cpu',
      'ram',
      'gpu',
      'net',
      'battery',
      'watts',
      'temps',
      'smart'
    ]
    const metrics =
      opts?.metrics && opts.metrics.length > 0 ? new Set(opts.metrics) : new Set(allMetrics)

    const subInfo: SubscriberInfo = {
      listener,
      metrics,
      windowId: opts?.windowId,
      isBackground: opts?.isBackground ?? false,
      isActive: true
    }
    this.subscribers.set(listener, subInfo)

    // Send immediate snapshot to new subscriber
    listener(this.getLiveMetrics())

    if (!this.isRunning) {
      this.startLoop()
    } else {
      this.scheduleNextTick()
    }

    return () => {
      this.subscribers.delete(listener)
      if (this.subscribers.size === 0 || !this.hasActiveSubscribers()) {
        this.stopLoop()
      } else {
        this.scheduleNextTick()
      }
    }
  }

  /**
   * Toggles active state for subscribers belonging to a specific BrowserWindow.
   * Minimized or hidden windows become inactive; restoring sends an immediate snapshot.
   */
  public setWindowActive(windowId: number, isActive: boolean): void {
    let stateChanged = false
    for (const sub of this.subscribers.values()) {
      if (sub.windowId === windowId) {
        if (sub.isActive !== isActive) {
          sub.isActive = isActive
          stateChanged = true
          if (isActive) {
            try {
              sub.listener(this.getLiveMetrics())
            } catch {}
          }
        }
      }
    }

    if (stateChanged) {
      if (this.hasActiveSubscribers()) {
        if (!this.isRunning) {
          this.startLoop()
        } else {
          this.scheduleNextTick()
        }
      } else {
        this.clearTimer()
      }
    }
  }

  private hasActiveSubscribers(): boolean {
    for (const sub of this.subscribers.values()) {
      if (sub.isActive) return true
    }
    return false
  }

  private getActiveRequestedMetrics(): Set<TelemetryMetric> {
    const active = new Set<TelemetryMetric>()
    for (const sub of this.subscribers.values()) {
      if (sub.isActive) {
        for (const m of sub.metrics) {
          active.add(m)
        }
      }
    }
    return active
  }

  private hasActiveForegroundSubscriber(metric: TelemetryMetric): boolean {
    for (const sub of this.subscribers.values()) {
      if (sub.isActive && !sub.isBackground && sub.metrics.has(metric)) {
        return true
      }
    }
    return false
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
    this.sampleBatteryHealthOnce().catch(() => {})
    this.sampleImmediate().finally(() => {
      this.scheduleNextTick()
    })
  }

  private stopLoop(): void {
    this.isRunning = false
    this.clearTimer()
  }

  public dispose(): void {
    this.stopLoop()
    this.subscribers.clear()
    powerShellWorker.dispose()
  }

  private async sampleImmediate(): Promise<void> {
    const activeMetrics = this.getActiveRequestedMetrics()
    const all = activeMetrics.size === 0
    if (all || activeMetrics.has('cpu')) this.sampleCpu()
    if (all || activeMetrics.has('ram')) this.sampleRam()
    if (all || activeMetrics.has('net')) await this.sampleNetwork()
    if (all || activeMetrics.has('gpu')) this.sampleGpu()
    if (all || activeMetrics.has('battery') || activeMetrics.has('watts')) {
      await this.sampleBattery()
    }
    if (activeMetrics.has('temps')) this.sampleTemperatures()
    if (activeMetrics.has('smart')) this.sampleSmartStatus()
    this.broadcastIfChanged()
  }

  private scheduleNextTick(): void {
    this.clearTimer()
    if (!this.canSample()) return

    const activeMetrics = this.getActiveRequestedMetrics()
    if (activeMetrics.size === 0) return

    const now = Date.now()
    const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    const intervals: number[] = []

    if (activeMetrics.has('cpu')) {
      intervals.push(Math.max(50, this.lastCpuSampleTime + 1000 * multiplier - now))
    }
    if (activeMetrics.has('gpu')) {
      intervals.push(Math.max(50, this.lastGpuSampleTime + 1000 * multiplier - now))
    }
    if (activeMetrics.has('net')) {
      intervals.push(Math.max(50, this.lastNetSampleTime + 1000 * multiplier - now))
    }
    if (activeMetrics.has('ram')) {
      intervals.push(Math.max(50, this.lastRamSampleTime + 2000 * multiplier - now))
    }
    if (activeMetrics.has('temps')) {
      intervals.push(Math.max(50, this.lastTempSampleTime + 3000 * multiplier - now))
    }
    if (activeMetrics.has('battery') || activeMetrics.has('watts')) {
      const isForeground =
        this.hasActiveForegroundSubscriber('battery') || this.hasActiveForegroundSubscriber('watts')
      const batBaseInterval = !isForeground ? 60000 : activeMetrics.has('watts') ? 3000 : 30000
      intervals.push(Math.max(50, this.lastBatterySampleTime + batBaseInterval * multiplier - now))
    }
    if (activeMetrics.has('smart')) {
      intervals.push(Math.max(50, this.lastSmartSampleTime + 1800000 - now))
    }

    if (intervals.length === 0) return

    const nextDelay = Math.min(...intervals)
    this.mainLoopTimer = setTimeout(() => {
      this.tick()
    }, Math.max(50, nextDelay))
  }

  /**
   * Adaptive refresh scheduler
   */
  private async tick(): Promise<void> {
    if (this.isTicking || !this.canSample()) return
    this.isTicking = true

    try {
      const activeMetrics = this.getActiveRequestedMetrics()
      if (activeMetrics.size === 0) return

      const now = Date.now()
      const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
      const multiplier = isEco ? 2 : 1

      let hasChanges = false

      // 1. CPU (1s normal, 2s eco)
      if (activeMetrics.has('cpu') && now - this.lastCpuSampleTime >= 1000 * multiplier) {
        this.lastCpuSampleTime = now
        this.sampleCpu()
        hasChanges = true
      }

      // 2. GPU (1s normal, 2s eco) - on demand, allows dGPU to sleep
      if (activeMetrics.has('gpu') && now - this.lastGpuSampleTime >= 1000 * multiplier) {
        this.lastGpuSampleTime = now
        this.sampleGpu()
        hasChanges = true
      }

      // 3. Network (1s normal, 2s eco)
      if (activeMetrics.has('net') && now - this.lastNetSampleTime >= 1000 * multiplier) {
        this.lastNetSampleTime = now
        await this.sampleNetwork()
        hasChanges = true
      }

      // 4. RAM (2s normal, 4s eco)
      if (activeMetrics.has('ram') && now - this.lastRamSampleTime >= 2000 * multiplier) {
        this.lastRamSampleTime = now
        this.sampleRam()
        hasChanges = true
      }

      // 5. Temperatures (3s normal, 6s eco) - only if requested
      if (activeMetrics.has('temps') && now - this.lastTempSampleTime >= 3000 * multiplier) {
        this.lastTempSampleTime = now
        this.sampleTemperatures()
      }

      // 6. Unified Battery & Wattage
      if (activeMetrics.has('battery') || activeMetrics.has('watts')) {
        const isForeground =
          this.hasActiveForegroundSubscriber('battery') || this.hasActiveForegroundSubscriber('watts')
        const batBaseInterval = !isForeground ? 60000 : activeMetrics.has('watts') ? 3000 : 30000
        if (now - this.lastBatterySampleTime >= batBaseInterval * multiplier) {
          this.lastBatterySampleTime = now
          await this.sampleBattery()
          hasChanges = true
        }
      }

      // 7. SMART status (every 30 minutes) - only if requested
      if (activeMetrics.has('smart') && now - this.lastSmartSampleTime >= 1800000) {
        this.lastSmartSampleTime = now
        this.sampleSmartStatus()
      }

      if (hasChanges) {
        this.broadcastIfChanged()
      }
    } finally {
      this.isTicking = false
      this.scheduleNextTick()
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
    if (this.isSamplingNet) return
    this.isSamplingNet = true
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
    } finally {
      this.isSamplingNet = false
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
    powerShellWorker
      .runCommand(cmd, 3000)
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
      $ProgressPreference = 'SilentlyContinue';
      $p = [System.Windows.Forms.SystemInformation]::PowerStatus;
      $wmi = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1;
      [PSCustomObject]@{
        HasBat = ($p.BatteryChargeStatus.ToString() -ne 'NoSystemBattery');
        LineStatus = $p.PowerLineStatus.ToString();
        Percent = [int]($p.BatteryLifePercent * 100);
        Status = $p.BatteryChargeStatus.ToString();
        ChargeRate = if ($wmi) { [int64]$wmi.ChargeRate } else { 0 };
        DischargeRate = if ($wmi) { [int64]$wmi.DischargeRate } else { 0 };
      } | ConvertTo-Json -Compress
    `

    try {
      const stdout = await powerShellWorker.runCommand(script, 4000)
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
      if (staticData && staticData.designCapacityMWh > 0) {
        this.cache.battery.hasBattery = true
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
    powerShellWorker
      .runCommand(script, 5000)
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

    for (const sub of this.subscribers.values()) {
      if (sub.isActive) {
        try {
          sub.listener(metrics)
        } catch (err) {
          console.error('[TelemetryService] Error in listener callback:', err)
        }
      }
    }
  }
}

export const telemetryService = TelemetryService.getInstance()

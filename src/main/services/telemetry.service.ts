import os from 'node:os'
import { spawn, type ChildProcess } from 'node:child_process'
import { app, powerMonitor } from 'electron'
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

/**
 * Persistent background PowerShell worker that handles sequential WMI queries
 * via stdin/stdout with delimiter markers, avoiding repeated powershell.exe spawns.
 */
class PersistentPowerShell {
  private child: ChildProcess | null = null
  private queue: Array<{
    command: string
    timeoutMs: number
    resolve: (value: string) => void
    reject: (error: Error) => void
  }> = []
  private isBusy = false
  private stdoutBuffer = ''
  private requestTimer: NodeJS.Timeout | null = null
  private failureCount = 0
  private readonly maxFailures = 3
  private isDisabled = false
  private backoffTimer: NodeJS.Timeout | null = null
  private readonly EOF_MARKER = '___MTB_EOF___'

  public start(): void {
    if (this.child || this.isDisabled) return

    try {
      this.child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NoLogo', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'],
        {
          windowsHide: true,
          env: process.env,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )

      this.stdoutBuffer = ''

      // Set UTF-8 encoding
      this.child.stdin?.write("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n")

      this.child.stdout?.on('data', (chunk: Buffer) => {
        this.stdoutBuffer += chunk.toString('utf8')
        this.checkEof()
      })

      this.child.stderr?.on('data', () => {
        // Silently consume stderr to prevent buffer congestion
      })

      this.child.on('error', (err) => {
        console.warn('[PersistentPowerShell] Worker error:', err.message)
        this.handleCrash()
      })

      this.child.on('close', () => {
        this.handleCrash()
      })
    } catch (err: any) {
      console.warn('[PersistentPowerShell] Failed to spawn worker:', err.message)
      this.handleCrash()
    }
  }

  public async execute(command: string, timeoutMs = 5000): Promise<string> {
    if (this.isDisabled) {
      throw new Error('Persistent PowerShell is disabled after repeated failures')
    }

    if (!this.child) {
      this.start()
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ command, timeoutMs, resolve, reject })
      this.processQueue()
    })
  }

  private processQueue(): void {
    if (this.isBusy || this.queue.length === 0) return
    const current = this.queue[0]
    this.isBusy = true
    this.stdoutBuffer = ''

    if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
      this.start()
    }

    this.requestTimer = setTimeout(() => {
      console.warn('[PersistentPowerShell] Command timed out after', current.timeoutMs, 'ms')
      current.reject(new Error(`Command timed out after ${current.timeoutMs}ms`))
      this.cleanupCurrent(true)
    }, current.timeoutMs)

    try {
      const script = `try { ${current.command} } catch { Write-Output "null" }; Write-Output "${this.EOF_MARKER}"\r\n`
      this.child!.stdin!.write(script)
    } catch (err: any) {
      current.reject(err)
      this.cleanupCurrent(true)
    }
  }

  private checkEof(): void {
    if (!this.isBusy || this.queue.length === 0) return
    const markerIndex = this.stdoutBuffer.indexOf(this.EOF_MARKER)
    if (markerIndex !== -1) {
      const output = this.stdoutBuffer.substring(0, markerIndex).trim()
      const current = this.queue.shift()!
      if (this.requestTimer) {
        clearTimeout(this.requestTimer)
        this.requestTimer = null
      }
      this.isBusy = false
      this.failureCount = 0
      current.resolve(output)
      this.processQueue()
    }
  }

  private cleanupCurrent(killProcess: boolean): void {
    if (this.requestTimer) {
      clearTimeout(this.requestTimer)
      this.requestTimer = null
    }
    this.queue.shift()
    this.isBusy = false
    this.stdoutBuffer = ''

    if (killProcess) {
      this.killChild()
      this.handleCrash()
    } else {
      this.processQueue()
    }
  }

  private handleCrash(): void {
    this.killChild()
    this.failureCount++

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      item.reject(new Error('PowerShell worker crashed or terminated'))
    }
    this.isBusy = false

    if (this.failureCount >= this.maxFailures) {
      this.isDisabled = true
      console.warn('[PersistentPowerShell] Disabled worker after', this.maxFailures, 'consecutive failures')
      return
    }

    const backoffMs = Math.min(8000, 1000 * Math.pow(2, this.failureCount - 1))
    if (this.backoffTimer) clearTimeout(this.backoffTimer)
    this.backoffTimer = setTimeout(() => {
      this.start()
    }, backoffMs)
  }

  public resetFailureState(): void {
    this.failureCount = 0
    this.isDisabled = false
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer)
      this.backoffTimer = null
    }
  }

  public stop(): void {
    this.resetFailureState()
    if (this.requestTimer) {
      clearTimeout(this.requestTimer)
      this.requestTimer = null
    }
    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      item.reject(new Error('Persistent PowerShell stopped'))
    }
    this.isBusy = false
    this.killChild()
  }

  private killChild(): void {
    if (this.child) {
      try {
        this.child.removeAllListeners()
        this.child.kill('SIGKILL')
      } catch {}
      this.child = null
    }
  }
}

/**
 * Manages a continuously running nvidia-smi process with --loop-ms streaming
 */
class NvidiaSmiMonitor {
  private child: ChildProcess | null = null
  private buffer = ''
  private onValue: (gpuPercent: number) => void
  private onError: () => void
  private currentIntervalMs = 1000
  private isStopped = true

  constructor(onValue: (val: number) => void, onError: () => void) {
    this.onValue = onValue
    this.onError = onError
  }

  public start(intervalMs: number): void {
    this.currentIntervalMs = intervalMs
    this.isStopped = false
    this.stopProcess()

    try {
      this.child = spawn(
        'nvidia-smi',
        [
          '--query-gpu=utilization.gpu',
          '--format=csv,noheader,nounits',
          `--loop-ms=${intervalMs}`
        ],
        {
          windowsHide: true,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      )

      this.buffer = ''

      this.child.stdout?.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8')
        const lines = this.buffer.split(/\r?\n/)
        // Preserve any trailing incomplete line in buffer
        this.buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const val = parseInt(trimmed, 10)
          if (!isNaN(val)) {
            this.onValue(Math.min(100, Math.max(0, val)))
          }
        }
      })

      this.child.stderr?.on('data', () => {
        // Ignore stderr
      })

      this.child.on('error', () => {
        if (!this.isStopped) {
          this.onError()
        }
      })

      this.child.on('close', (code) => {
        if (!this.isStopped && code !== 0) {
          this.onError()
        }
      })
    } catch {
      this.onError()
    }
  }

  public setInterval(intervalMs: number): void {
    if (this.currentIntervalMs !== intervalMs && !this.isStopped) {
      this.start(intervalMs)
    } else {
      this.currentIntervalMs = intervalMs
    }
  }

  public stop(): void {
    this.isStopped = true
    this.stopProcess()
  }

  private stopProcess(): void {
    if (this.child) {
      try {
        this.child.removeAllListeners()
        this.child.kill('SIGKILL')
      } catch {}
      this.child = null
    }
  }
}

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
  private lastSmartSampleTime = 0

  // CPU delta state
  private lastCpuTimes: { idle: number; total: number } | null = null

  // Network delta state
  private lastNetStats: { rxBytes: number; txBytes: number; timestamp: number } | null = null

  // GPU detection & workers
  private hasNvidia = true
  private isSamplingGpu = false
  private nvidiaMonitor: NvidiaSmiMonitor
  private persistentPs: PersistentPowerShell

  // Last broadcasted metrics (for dirty-checking)
  private lastBroadcastJson = ''

  private constructor() {
    this.persistentPs = new PersistentPowerShell()

    this.nvidiaMonitor = new NvidiaSmiMonitor(
      (gpuVal) => {
        this.cache.gpuUsagePercent = gpuVal
        this.cache.timestamp = Date.now()
        this.broadcastIfChanged()
      },
      () => {
        // Fallback to WMI if nvidia-smi fails
        if (this.hasNvidia) {
          console.warn('[TelemetryService] nvidia-smi failed or unavailable, falling back to WMI engtype_3D.')
          this.hasNvidia = false
          this.nvidiaMonitor.stop()
        }
      }
    )

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
      // 4. Initial AC status check via Electron powerMonitor
      this.cache.battery.isAcOnline = !powerMonitor.isOnBatteryPower()

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
    const isEco = !isAc && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    if (this.hasNvidia && this.isRunning && !this.isPaused) {
      this.nvidiaMonitor.setInterval(1000 * multiplier)
    }

    this.broadcastIfChanged()
  }

  public pause(): void {
    if (this.isPaused) return
    this.isPaused = true

    this.nvidiaMonitor.stop()
    this.persistentPs.stop()
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false

    this.persistentPs.resetFailureState()
    this.persistentPs.start()

    const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    if (this.hasNvidia) {
      this.nvidiaMonitor.start(1000 * multiplier)
    }

    // Refresh battery health once after resume
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

    this.persistentPs.start()

    const isEco = !this.cache.battery.isAcOnline && this.cache.battery.hasBattery
    const multiplier = isEco ? 2 : 1

    if (this.hasNvidia) {
      this.nvidiaMonitor.start(1000 * multiplier)
    }

    // Sample battery health once at startup
    this.sampleBatteryHealthOnce()

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
    this.nvidiaMonitor.stop()
    this.persistentPs.stop()
  }

  public dispose(): void {
    this.stopLoop()
    this.listeners.clear()
  }

  private async sampleImmediate(): Promise<void> {
    this.sampleCpu()
    this.sampleRam()
    await this.sampleNetwork()
    if (!this.hasNvidia) {
      this.sampleGpuViaWmi()
    }
    await this.sampleBatteryAndWattage()
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

    // 1. CPU (1s normal, 2s eco)
    if (now - this.lastCpuSampleTime >= 1000 * multiplier) {
      this.sampleCpu()
      this.lastCpuSampleTime = now
      hasChanges = true
    }

    // 2. GPU WMI-Fallback if Nvidia is not available (1s normal, 2s eco)
    if (!this.hasNvidia && now - this.lastGpuSampleTime >= 1000 * multiplier) {
      this.sampleGpuViaWmi()
      this.lastGpuSampleTime = now
      hasChanges = true
    }

    // 3. Netzwerk (1s normal, 2s eco)
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

    // 5. Temperaturen (3s normal, 6s eco)
    if (now - this.lastTempSampleTime >= 3000 * multiplier) {
      this.sampleTemperatures()
      this.lastTempSampleTime = now
    }

    // 6. Ladeleistung, Akkustand & Batterie-Status (3s normal, 6s eco)
    if (now - this.lastWattageSampleTime >= 3000 * multiplier) {
      await this.sampleBatteryAndWattage()
      this.lastWattageSampleTime = now
      hasChanges = true
    }

    // 7. SMART (alle 30 Minuten = 1800s)
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
   * 2. GPU WMI-Fallback: Constrained to engtype_3D and bounded to 0-100
   */
  private sampleGpuViaWmi(): void {
    if (this.isSamplingGpu) return
    this.isSamplingGpu = true

    const cmd = `(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*engtype_3D*' } | Measure-Object -Property UtilizationPercentage -Sum).Sum`

    this.persistentPs
      .execute(cmd, 3000)
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
   * 5. Unified 3-second Battery & Wattage query via Persistent PowerShell Worker
   */
  private async sampleBatteryAndWattage(): Promise<void> {
    const cmd = `
      $status = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
      $full = Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1
      [PSCustomObject]@{
        HasBat = ($status -ne $null)
        Charging = [bool]$status.Charging
        Discharging = [bool]$status.Discharging
        PowerOnline = [bool]$status.PowerOnline
        Remaining = [int64]$status.RemainingCapacity
        FullCapacity = [int64]$full.FullChargedCapacity
        ChargeRate = [int64]$status.ChargeRate
        DischargeRate = [int64]$status.DischargeRate
      } | ConvertTo-Json -Compress
    `.replace(/\r?\n\s*/g, ' ')

    try {
      const stdout = await this.persistentPs.execute(cmd, 3500)
      if (stdout && stdout.trim() && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout.trim())
        const hasBattery = Boolean(parsed.HasBat)
        this.cache.battery.hasBattery = hasBattery

        if (hasBattery) {
          this.cache.battery.isCharging = Boolean(parsed.Charging)

          const chargeRate = parsed.ChargeRate ? Math.round((parsed.ChargeRate / 1000) * 10) / 10 : 0
          const dischargeRate = parsed.DischargeRate ? Math.round((parsed.DischargeRate / 1000) * 10) / 10 : 0
          this.cache.battery.chargeRateWatts = chargeRate
          this.cache.battery.dischargeRateWatts = dischargeRate

          // Calculate percent from Remaining / FullCapacity
          if (parsed.Remaining > 0 && parsed.FullCapacity > 0) {
            const calculatedPercent = Math.min(
              100,
              Math.max(0, Math.round((parsed.Remaining / parsed.FullCapacity) * 100))
            )
            this.cache.battery.percent = calculatedPercent
          } else {
            // Fallback to PowerStatus.BatteryLifePercent if WMI capacities are 0 or missing
            await this.fallbackBatteryPercent()
          }
        }
      }
    } catch {
      // Fallback if WMI query fails
      await this.fallbackBatteryPercent()
    }
  }

  /**
   * Fallback using PowerStatus.BatteryLifePercent over persistent worker
   */
  private async fallbackBatteryPercent(): Promise<void> {
    try {
      const fallbackCmd = `Add-Type -AssemblyName System.Windows.Forms; [int]([System.Windows.Forms.SystemInformation]::PowerStatus.BatteryLifePercent * 100)`
      const out = await this.persistentPs.execute(fallbackCmd, 2500)
      const val = parseInt(out.trim(), 10)
      if (!isNaN(val) && val >= 0) {
        this.cache.battery.percent = Math.min(100, Math.max(0, val))
      }
    } catch {}
  }

  /**
   * 6. Battery Health (Wear-Level): Queried ONCE at start or after resume.
   * Uses root/wmi BatteryStaticData & BatteryFullChargedCapacity.
   */
  private async sampleBatteryHealthOnce(): Promise<void> {
    const cmd = `
      $designed = (Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1).DesignedCapacity
      $full = (Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1).FullChargedCapacity
      [PSCustomObject]@{ Designed = [int64]$designed; Full = [int64]$full } | ConvertTo-Json -Compress
    `.replace(/\r?\n\s*/g, ' ')

    try {
      const stdout = await this.persistentPs.execute(cmd, 4000)
      if (stdout && stdout.trim() && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout.trim())
        if (parsed.Designed > 0 && parsed.Full > 0) {
          const health = Math.min(100, Math.max(0, Math.round((parsed.Full / parsed.Designed) * 100)))
          this.cache.battery.healthPercent = health
          return
        }
      }
    } catch {}

    // If missing or 0, set to undefined (unknown)
    this.cache.battery.healthPercent = undefined
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

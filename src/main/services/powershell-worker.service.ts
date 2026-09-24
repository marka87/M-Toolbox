import { spawn, ChildProcess } from 'node:child_process'
import { powershellService } from './powershell.service'

interface WorkerTask {
  script: string
  timeoutMs: number
  resolve: (value: string) => void
  reject: (err: Error) => void
}

export class PowerShellWorker {
  private static instance: PowerShellWorker
  private child: ChildProcess | null = null
  private buffer = ''
  private queue: WorkerTask[] = []
  private activeTask: WorkerTask | null = null
  private timeoutTimer: NodeJS.Timeout | null = null
  private idleTimer: NodeJS.Timeout | null = null
  private retryTimer: NodeJS.Timeout | null = null
  private isReady = false
  private consecutiveErrors = 0
  private readonly MAX_CONSECUTIVE_ERRORS = 3
  private readonly IDLE_TIMEOUT_MS = 60000 // 60s idle before process shutdown
  private readonly RETRY_INTERVAL_MS = 60000 // 60s before retrying worker after fallback

  private constructor() {}

  public static getInstance(): PowerShellWorker {
    if (!PowerShellWorker.instance) {
      PowerShellWorker.instance = new PowerShellWorker()
    }
    return PowerShellWorker.instance
  }

  public isAlive(): boolean {
    return this.child !== null && !this.child.killed && this.isReady
  }

  public getConsecutiveErrors(): number {
    return this.consecutiveErrors
  }

  private spawnCount = 0

  public getAndResetSpawnsCount(): number {
    const count = this.spawnCount
    this.spawnCount = 0
    return count
  }

  /**
   * Runs a PowerShell command via persistent worker queue.
   * If worker has failed 3 times consecutively, falls back to one-shot powershellService.
   */
  public async runCommand(script: string, timeoutMs = 8000): Promise<string> {
    // Reset idle timer on every request
    this.resetIdleTimer()

    // Fallback mode if worker is unhealthy
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      return powershellService.runPowerShell(script, timeoutMs)
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ script, timeoutMs, resolve, reject })
      this.runNext()
    })
  }

  private ensureProcess(): void {
    if (this.child) return

    try {
      this.child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NoLogo',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '-'
        ],
        {
          windowsHide: true,
          env: process.env,
          stdio: ['pipe', 'pipe', 'ignore']
        }
      )

      this.spawnCount++
      this.buffer = ''
      this.isReady = false

      this.child.stdout?.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8')
        this.processBuffer()
      })

      this.child.on('error', (err) => {
        this.handleProcessCrash(err)
      })

      this.child.on('close', (code) => {
        this.handleProcessCrash(new Error(`PowerShell worker exited with code ${code}`))
      })

      // Send initial setup: UTF-8 encoding and WinForms assembly (once)
      this.child.stdin?.write('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n')
      this.child.stdin?.write('Add-Type -AssemblyName System.Windows.Forms\r\n')
      this.child.stdin?.write('[Console]::Out.WriteLine("__READY__")\r\n')
    } catch (err: any) {
      this.handleProcessCrash(err)
    }
  }

  private processBuffer(): void {
    if (!this.isReady) {
      const readyIdx = this.buffer.indexOf('__READY__')
      if (readyIdx !== -1) {
        this.isReady = true
        this.buffer = this.buffer.slice(readyIdx + 9)
        this.consecutiveErrors = 0
        this.runNext()
      }
      return
    }

    if (!this.activeTask) return

    const endIdx = this.buffer.indexOf('__MTOOLBOX_END__')
    if (endIdx !== -1) {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer)
        this.timeoutTimer = null
      }
      const output = this.buffer.slice(0, endIdx).trim()
      this.buffer = this.buffer.slice(endIdx + 16)
      const task = this.activeTask
      this.activeTask = null
      this.consecutiveErrors = 0

      task.resolve(output)
      this.runNext()
    }
  }

  private runNext(): void {
    if (this.activeTask || this.queue.length === 0) {
      if (!this.activeTask && this.queue.length === 0) {
        this.startIdleTimer()
      }
      return
    }

    this.ensureProcess()
    if (!this.isReady) return

    this.activeTask = this.queue.shift() || null
    if (!this.activeTask) return

    const enc = Buffer.from(this.activeTask.script, 'utf8').toString('base64')
    const cmd = `try { & ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${enc}")))) } catch { [Console]::Out.WriteLine("ERROR: " + $_.Exception.Message) }; [Console]::Out.WriteLine("__MTOOLBOX_END__")\r\n`

    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout()
    }, this.activeTask.timeoutMs)

    try {
      this.child?.stdin?.write(cmd)
    } catch (err: any) {
      this.handleProcessCrash(err)
    }
  }

  private handleTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }

    const task = this.activeTask
    this.activeTask = null
    this.terminateProcess()
    this.recordError()

    if (task) {
      task.reject(new Error('PowerShell worker command timed out'))
    }

    this.runNext()
  }

  private handleProcessCrash(err: Error): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }

    const task = this.activeTask
    this.activeTask = null
    this.terminateProcess()
    this.recordError()

    if (task) {
      task.reject(err)
    }

    this.runNext()
  }

  private recordError(): void {
    this.consecutiveErrors++
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.warn(
        `[PowerShellWorker] ${this.consecutiveErrors} consecutive errors. Falling back to one-shot PowerShellService for 60s.`
      )
      // Drain queue to one-shot service so pending tasks don't hang
      const pending = [...this.queue]
      this.queue = []
      for (const t of pending) {
        powershellService.runPowerShell(t.script, t.timeoutMs).then(t.resolve).catch(t.reject)
      }

      // Schedule retry in 60s
      if (!this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null
          this.consecutiveErrors = 0
          console.info('[PowerShellWorker] Attempting to re-enable persistent PowerShell worker.')
        }, this.RETRY_INTERVAL_MS)
      }
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private startIdleTimer(): void {
    this.resetIdleTimer()
    this.idleTimer = setTimeout(() => {
      this.terminateProcess()
    }, this.IDLE_TIMEOUT_MS)
  }

  public terminateProcess(): void {
    this.resetIdleTimer()
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
    if (this.child) {
      try {
        this.child.stdin?.write('exit\r\n')
        this.child.kill()
      } catch {}
      this.child = null
    }
    this.isReady = false
    this.buffer = ''
  }

  public dispose(): void {
    this.terminateProcess()
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.activeTask) {
      this.activeTask.reject(new Error('PowerShellWorker disposed'))
      this.activeTask = null
    }
    this.queue = []
  }
}

export const powerShellWorker = PowerShellWorker.getInstance()

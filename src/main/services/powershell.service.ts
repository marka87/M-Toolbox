import { spawn } from 'node:child_process'
import * as fs from 'node:fs'

export interface PowerShellResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export class PowerShellService {
  private static instance: PowerShellService

  private constructor() {}

  public static getInstance(): PowerShellService {
    if (!PowerShellService.instance) {
      PowerShellService.instance = new PowerShellService()
    }
    return PowerShellService.instance
  }

  /**
   * Executes a PowerShell script/command string via Base64 EncodedCommand
   * to safely avoid escaping and encoding issues. Returns stdout.
   */
  public async runPowerShell(script: string, timeoutMs = 25000): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    return new Promise((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-EncodedCommand',
          encoded
        ],
        {
          windowsHide: true,
          env: process.env
        }
      )

      let stdout = ''
      let isTimedOut = false

      const timer = setTimeout(() => {
        isTimedOut = true
        child.kill()
        reject(new Error(`PowerShell execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', () => {
        clearTimeout(timer)
        if (!isTimedOut) {
          resolve(stdout.trim())
        }
      })
    })
  }

  /**
   * Executes a PowerShell script file (supports physical files and .asar archives)
   */
  public async runPowerShellFile(
    scriptPath: string,
    args: string[] = [],
    timeoutMs = 45000
  ): Promise<PowerShellResult> {
    return this.executeScriptFile(scriptPath, args, timeoutMs)
  }

  /**
   * Executes a PowerShell command and returns stdout, stderr and exit code
   */
  public async executeCommand(command: string, timeoutMs = 30000): Promise<PowerShellResult> {
    return new Promise((resolve, reject) => {
      const utf8Prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; '
      const fullCommand = `${utf8Prefix}${command}`

      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          fullCommand
        ],
        {
          windowsHide: true,
          env: process.env
        }
      )

      let stdout = ''
      let stderr = ''
      let isTimedOut = false

      const timer = setTimeout(() => {
        isTimedOut = true
        child.kill()
        reject(new Error(`PowerShell execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8')
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        if (!isTimedOut) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code
          })
        }
      })
    })
  }

  /**
   * Executes a PowerShell script file (supports both physical files and .asar-embedded files via stdin)
   */
  public async executeScriptFile(
    scriptPath: string,
    args: string[] = [],
    timeoutMs = 45000
  ): Promise<PowerShellResult> {
    if (fs.existsSync(scriptPath)) {
      try {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8')
        return this.executeScriptContent(scriptContent, timeoutMs)
      } catch {
        // Fallback to -File if direct read fails
      }
    }

    return new Promise((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          scriptPath,
          ...args
        ],
        {
          windowsHide: true,
          env: process.env
        }
      )

      let stdout = ''
      let stderr = ''
      let isTimedOut = false

      const timer = setTimeout(() => {
        isTimedOut = true
        child.kill()
        reject(new Error(`PowerShell script timed out after ${timeoutMs}ms: ${scriptPath}`))
      }, timeoutMs)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8')
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        if (!isTimedOut) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code
          })
        }
      })
    })
  }

  /**
   * Executes a full PowerShell script content cleanly via stdin
   */
  public async executeScriptContent(
    scriptContent: string,
    timeoutMs = 45000
  ): Promise<PowerShellResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '-'
        ],
        {
          windowsHide: true,
          env: process.env
        }
      )

      let stdout = ''
      let stderr = ''
      let isTimedOut = false

      const timer = setTimeout(() => {
        isTimedOut = true
        child.kill()
        reject(new Error(`PowerShell script timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8')
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        if (!isTimedOut) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code
          })
        }
      })

      child.stdin.write(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n${scriptContent}\r\n`)
      child.stdin.end()
    })
  }

  /**
   * Streams PowerShell output line by line for live consoles (Repair, Tweaks, Advanced Tools)
   */
  public streamCommand(
    command: string,
    onData: (data: string) => void,
    onError: (data: string) => void,
    onExit: (code: number | null) => void
  ): { kill: () => void } {
    const utf8Prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; '
    const fullCommand = `${utf8Prefix}${command}`

    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        fullCommand
      ],
      {
        windowsHide: true,
        env: process.env
      }
    )

    child.stdout.on('data', (chunk) => {
      onData(chunk.toString('utf8'))
    })

    child.stderr.on('data', (chunk) => {
      onError(chunk.toString('utf8'))
    })

    child.on('close', (code) => {
      onExit(code)
    })

    return {
      kill: () => {
        try {
          child.kill()
        } catch {
          // ignore already exited
        }
      }
    }
  }
}

export const powershellService = PowerShellService.getInstance()

import { spawn } from 'node:child_process'

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
   * Executes a PowerShell command and returns the full output
   */
  public async executeCommand(command: string, timeoutMs = 30000): Promise<PowerShellResult> {
    return new Promise((resolve, reject) => {
      const utf8Prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; '
      const fullCommand = `${utf8Prefix}${command}`

      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        fullCommand
      ], {
        windowsHide: true,
        env: process.env
      })

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
  public async executeScriptFile(scriptPath: string, args: string[] = [], timeoutMs = 45000): Promise<PowerShellResult> {
    const fs = await import('node:fs')
    // If the file exists and is accessible directly, or if inside an asar archive (where node:fs can read it)
    if (fs.existsSync(scriptPath)) {
      try {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8')
        return this.executeScriptContent(scriptContent, timeoutMs)
      } catch {
        // Fallback to -File if read fails
      }
    }

    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        ...args
      ], {
        windowsHide: true,
        env: process.env
      })

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
  public async executeScriptContent(scriptContent: string, timeoutMs = 45000): Promise<PowerShellResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        '-'
      ], {
        windowsHide: true,
        env: process.env
      })

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

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      fullCommand
    ], {
      windowsHide: true,
      env: process.env
    })

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


import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import type {
  RepairActionItem,
  SystemHealthStatus,
  ServiceHealthItem,
  RepairLogEvent,
  RepairResult
} from '../../shared/types'

export const REPAIR_ACTIONS: RepairActionItem[] = [
  {
    id: 'sfc_scannow',
    title: 'Systemdatei-Prüfung (SFC)',
    description: 'Scannt alle geschützten Windows-Systemdateien auf Integrität und repariert beschädigte Dateien automatisch.',
    category: 'system',
    requiresAdmin: true,
    estimatedDuration: '5-15 Min.',
    riskLevel: 'safe'
  },
  {
    id: 'dism_restorehealth',
    title: 'DISM Image-Reparatur (RestoreHealth)',
    description: 'Repariert den Windows-Komponentenspeicher (WinSxS) über Windows Update oder lokale Windows-Quellen.',
    category: 'system',
    requiresAdmin: true,
    estimatedDuration: '5-20 Min.',
    riskLevel: 'safe'
  },
  {
    id: 'dism_scanhealth',
    title: 'DISM Komponenten-Scan (ScanHealth)',
    description: 'Überprüft den Komponentenspeicher auf Beschädigungen, nimmt jedoch noch keine Modifikationen vor.',
    category: 'system',
    requiresAdmin: true,
    estimatedDuration: '3-10 Min.',
    riskLevel: 'safe'
  },
  {
    id: 'windows_update_reset',
    title: 'Windows Update Komponenten-Reset',
    description: 'Beendet Update-Dienste, bereinigt SoftwareDistribution/Catroot2, registriert DLLs neu und startet Dienste.',
    category: 'update',
    requiresAdmin: true,
    estimatedDuration: '1-2 Min.',
    riskLevel: 'safe'
  },
  {
    id: 'network_dns_flush',
    title: 'DNS-Cache leeren (Flush DNS)',
    description: 'Bereinigt den lokalen DNS-Auflösungscache bei Verbindungsproblemen oder veralteten Host-Einträgen.',
    category: 'network',
    requiresAdmin: false,
    estimatedDuration: '< 5 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'network_winsock_reset',
    title: 'Winsock & TCP/IP Reset',
    description: 'Setzt den Winsock-Katalog und die TCP/IP-Netzwerk-Konfiguration auf Werkseinstellungen zurück.',
    category: 'network',
    requiresAdmin: true,
    estimatedDuration: '10 Sek.',
    riskLevel: 'caution'
  },
  {
    id: 'network_ip_renew',
    title: 'DHCP IP-Adresse erneuern',
    description: 'Gibt die aktuelle Netzwerkadresse frei und fordert eine frische Lease vom DHCP-Server an.',
    category: 'network',
    requiresAdmin: false,
    estimatedDuration: '10-20 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'spooler_repair',
    title: 'Druckwarteschlange bereinigen & neu starten',
    description: 'Stoppt den Spooler, löscht blockierte Druckdateien im Systemverzeichnis und startet den Dienst neu.',
    category: 'spooler',
    requiresAdmin: true,
    estimatedDuration: '10-15 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'explorer_restart',
    title: 'Windows Explorer neu starten',
    description: 'Startet die Windows-Shell neu, wenn Taskleiste, Startmenü oder Desktop einfrieren.',
    category: 'explorer',
    requiresAdmin: false,
    estimatedDuration: '< 5 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'wsearch_restart',
    title: 'Windows Search Dienst neu starten',
    description: 'Startet den Windows Search Dienst neu, wenn die Suchleiste nicht reagiert oder keine Ergebnisse liefert.',
    category: 'explorer',
    requiresAdmin: true,
    estimatedDuration: '10 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'store_reset',
    title: 'Microsoft Store Cache zurücksetzen (WSReset)',
    description: 'Bereinigt den Zwischenspeicher der Microsoft Store App bei Downloadfehlern oder Startproblemen.',
    category: 'store',
    requiresAdmin: false,
    estimatedDuration: '15-30 Sek.',
    riskLevel: 'safe'
  },
  {
    id: 'appx_re_register',
    title: 'Windows Standard-Apps neu registrieren',
    description: 'Repariert Windows 11 Standard-Apps durch Neu-Registrierung der AppX-Manifeste über PowerShell.',
    category: 'store',
    requiresAdmin: false,
    estimatedDuration: '1-3 Min.',
    riskLevel: 'safe'
  }
]

export class RepairService {
  private static instance: RepairService

  static getInstance(): RepairService {
    if (!RepairService.instance) {
      RepairService.instance = new RepairService()
    }
    return RepairService.instance
  }

  /**
   * Prüft ob der aktuelle Prozess als Administrator ausgeführt wird
   */
  async checkElevation(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"`,
        { timeout: 5000 }
      )
      return stdout.trim().toLowerCase() === 'true'
    } catch {
      return false
    }
  }

  /**
   * Liest den System-Gesundheitsstatus aus
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const isAdmin = await this.checkElevation()
    const services: ServiceHealthItem[] = []
    let networkConnected = false

    // 1. Dienststatus abfragen
    try {
      const psCmd = `Get-Service wuauserv, bits, Spooler, WSearch -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, Status | ConvertTo-Json -Compress`
      const stdout = await powershellService.runPowerShell(psCmd, 8000)
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        const list = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of list) {
          if (item && item.Name) {
            services.push({
              name: item.Name,
              displayName: item.DisplayName || item.Name,
              status: item.Status === 4 ? 'running' : 'stopped'
            })
          }
        }
      }
    } catch (err) {
      console.warn('[RepairService] Fehler beim Abfragen der Dienste:', err)
    }

    // 2. Netzwerk-Verbindung testen
    try {
      const { stdout: pingOut } = await execAsync('ping -n 1 -w 1500 1.1.1.1', { timeout: 3000 })
      if (pingOut.includes('TTL=')) {
        networkConnected = true
      }
    } catch {
      networkConnected = false
    }

    return {
      isAdmin,
      services,
      networkConnected,
      computerName: os.hostname(),
      osVersion: `${os.type()} ${os.release()}`
    }
  }

  /**
   * Führt eine Reparatur-Aktion aus
   */
  async runAction(
    actionId: string,
    onLog?: (event: RepairLogEvent) => void
  ): Promise<RepairResult> {
    const startTime = Date.now()
    const action = REPAIR_ACTIONS.find((a) => a.id === actionId)
    if (!action) {
      return {
        actionId,
        success: false,
        message: 'Unbekannte Reparatur-Aktion.',
        exitCode: 1,
        durationMs: 0
      }
    }

    const isAdmin = await this.checkElevation()

    onLog?.({
      actionId,
      text: `[START] ${action.title}...`,
      type: 'info'
    })

    // Falls Admin erforderlich und nicht vorhanden: UAC-Elevation nutzen
    if (action.requiresAdmin && !isAdmin) {
      onLog?.({
        actionId,
        text: `[UAC] Administratorrechte erforderlich: Öffne erhöhten Ausführungsdialog...`,
        type: 'info'
      })

      return this.runWithElevation(action, onLog)
    }

    // Normales Ausführen (entweder Admin oder nicht erforderlich)
    return this.runDirect(action, onLog, startTime)
  }

  /**
   * Direktes Ausführen mit stdout/stderr Streaming
   */
  private async runDirect(
    action: RepairActionItem,
    onLog: ((event: RepairLogEvent) => void) | undefined,
    startTime: number
  ): Promise<RepairResult> {
    const commandInfo = this.getCommandForAction(action.id)

    return new Promise((resolve) => {
      let child: any

      if (commandInfo.type === 'cmd') {
        child = spawn('cmd.exe', ['/c', commandInfo.command], {
          windowsHide: true
        })
      } else {
        child = spawn(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', commandInfo.command],
          { windowsHide: true }
        )
      }

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf8')
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        for (const line of lines) {
          onLog?.({
            actionId: action.id,
            text: line,
            type: 'stdout'
          })
        }
      })

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf8')
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        for (const line of lines) {
          onLog?.({
            actionId: action.id,
            text: line,
            type: 'stderr'
          })
        }
      })

      child.on('close', (code: number) => {
        const durationMs = Date.now() - startTime
        const success = code === 0 || (action.id === 'sfc_scannow' && (code === 0 || code === 1))

        const message = success
          ? `Aktion "${action.title}" erfolgreich abgeschlossen (Exit-Code ${code}).`
          : `Aktion "${action.title}" beendet mit Fehlercode ${code}.`

        onLog?.({
          actionId: action.id,
          text: message,
          type: success ? 'success' : 'error'
        })

        resolve({
          actionId: action.id,
          success,
          message,
          exitCode: code ?? 0,
          durationMs
        })
      })

      child.on('error', (err: Error) => {
        const durationMs = Date.now() - startTime
        onLog?.({
          actionId: action.id,
          text: `[FEHLER] ${err.message}`,
          type: 'error'
        })
        resolve({
          actionId: action.id,
          success: false,
          message: err.message,
          exitCode: 1,
          durationMs
        })
      })
    })
  }

  /**
   * Ausführung mit UAC-Dialog (Start-Process -Verb RunAs)
   */
  private async runWithElevation(
    action: RepairActionItem,
    onLog?: (event: RepairLogEvent) => void
  ): Promise<RepairResult> {
    const startTime = Date.now()
    const commandInfo = this.getCommandForAction(action.id)
    const tempLog = path.join(os.tmpdir(), `mtoolbox_repair_${action.id}_${Date.now()}.log`)

    // Skript mit Protokollierung in temporäre Datei
    const elevatedScript = `
      Start-Transcript -Path "${tempLog}" -Append
      Write-Host "M-Toolbox Reparatur: ${action.title}" -ForegroundColor Cyan
      ${commandInfo.command}
      Stop-Transcript
    `.trim()

    const scriptBase64 = Buffer.from(elevatedScript, 'utf16le').toString('base64')

    try {
      const psRunner = `Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile', '-EncodedCommand', '${scriptBase64}'`
      await powershellService.runPowerShell(psRunner, 1800000)

      if (fs.existsSync(tempLog)) {
        try {
          const logContent = fs.readFileSync(tempLog, 'utf8')
          const lines = logContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          for (const line of lines) {
            onLog?.({
              actionId: action.id,
              text: line,
              type: 'stdout'
            })
          }
          fs.unlinkSync(tempLog)
        } catch {
          // Temporäre Datei ignorieren
        }
      }

      onLog?.({
        actionId: action.id,
        text: `[ERFOLG] Erhöhte Ausführung von "${action.title}" abgeschlossen.`,
        type: 'success'
      })

      return {
        actionId: action.id,
        success: true,
        message: `Aktion "${action.title}" erfolgreich mit Administratorrechten ausgeführt.`,
        exitCode: 0,
        durationMs: Date.now() - startTime
      }
    } catch (err: any) {
      onLog?.({
        actionId: action.id,
        text: `[UAC FEHLER] ${err.message || 'UAC-Bestätigung abgelehnt oder Fehler bei erhöhter Ausführung.'}`,
        type: 'error'
      })

      return {
        actionId: action.id,
        success: false,
        message: err.message || 'UAC-Bestätigung wurde abgebrochen.',
        exitCode: 1,
        durationMs: Date.now() - startTime
      }
    }
  }

  /**
   * M-Toolbox mit Administratorrechten neu starten
   */
  async restartAsAdmin(): Promise<void> {
    const execPath = process.execPath
    const isPackaged = !process.defaultApp

    if (isPackaged) {
      execAsync(`powershell -NoProfile -Command "Start-Process '${execPath}' -Verb RunAs"`).catch(() => {})
    } else {
      // Entwicklungsmodus: dev.cmd im Projektordner mit RunAs starten
      const devCmd = path.join(process.cwd(), 'dev.cmd')
      if (fs.existsSync(devCmd)) {
        execAsync(`powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c', '${devCmd}' -Verb RunAs"`).catch(() => {})
      } else {
        execAsync(`powershell -NoProfile -Command "Start-Process '${execPath}' -ArgumentList '${process.argv.slice(1).join("' '")}' -Verb RunAs"`).catch(() => {})
      }
    }

    setTimeout(() => {
      process.exit(0)
    }, 1000)
  }

  /**
   * Liefert das konkrete Shell-/PowerShell-Kommando für eine Reparatur-ID
   */
  private getCommandForAction(actionId: string): { type: 'cmd' | 'powershell'; command: string } {
    switch (actionId) {
      case 'sfc_scannow':
        return { type: 'cmd', command: 'sfc /scannow' }
      case 'dism_restorehealth':
        return { type: 'cmd', command: 'dism /online /cleanup-image /restorehealth' }
      case 'dism_scanhealth':
        return { type: 'cmd', command: 'dism /online /cleanup-image /scanhealth' }
      case 'windows_update_reset':
        return {
          type: 'powershell',
          command: `
            Write-Host 'Beende Windows Update Dienste...'
            Stop-Service -Name wuauserv, cryptSvc, bits, msiserver -Force -ErrorAction SilentlyContinue
            Write-Host 'Bereinige SoftwareDistribution & Catroot2...'
            $time = (Get-Date).ToString('yyyyMMddHHmmss')
            if (Test-Path 'C:\\Windows\\SoftwareDistribution') { Rename-Item 'C:\\Windows\\SoftwareDistribution' "SoftwareDistribution.old.$time" -ErrorAction SilentlyContinue }
            if (Test-Path 'C:\\Windows\\System32\\catroot2') { Rename-Item 'C:\\Windows\\System32\\catroot2' "catroot2.old.$time" -ErrorAction SilentlyContinue }
            Write-Host 'Registriere Systemkomponenten neu...'
            regsvr32.exe /s wups2.dll
            Write-Host 'Starte Windows Update Dienste wieder...'
            Start-Service -Name bits, cryptSvc, wuauserv, msiserver -ErrorAction SilentlyContinue
            Write-Host 'Windows Update Reset abgeschlossen.'
          `.trim()
        }
      case 'network_dns_flush':
        return { type: 'cmd', command: 'ipconfig /flushdns' }
      case 'network_winsock_reset':
        return {
          type: 'powershell',
          command: 'netsh winsock reset; netsh int ip reset'
        }
      case 'network_ip_renew':
        return {
          type: 'cmd',
          command: 'ipconfig /release & ipconfig /renew'
        }
      case 'spooler_repair':
        return {
          type: 'powershell',
          command: `
            Write-Host 'Stoppe Druckwarteschlange...'
            Stop-Service -Name Spooler -Force -ErrorAction SilentlyContinue
            Write-Host 'Lösche hängende Druckaufträge...'
            $spoolDir = Join-Path $env:SystemRoot 'System32\\spool\\PRINTERS'
            if (Test-Path $spoolDir) {
              Get-ChildItem -Path $spoolDir -Recurse -File | Remove-Item -Force -ErrorAction SilentlyContinue
            }
            Write-Host 'Starte Druckwarteschlange neu...'
            Start-Service -Name Spooler -ErrorAction SilentlyContinue
            Write-Host 'Druckspooler erfolgreich repariert.'
          `.trim()
        }
      case 'explorer_restart':
        return {
          type: 'cmd',
          command: 'taskkill /f /im explorer.exe & start explorer.exe'
        }
      case 'wsearch_restart':
        return {
          type: 'powershell',
          command: 'Restart-Service -Name WSearch -Force -ErrorAction SilentlyContinue; Write-Host "Windows Search Dienst neu gestartet."'
        }
      case 'store_reset':
        return { type: 'cmd', command: 'wsreset.exe' }
      case 'appx_re_register':
        return {
          type: 'powershell',
          command: `
            Write-Host 'Registriere Standard-AppX-Pakete neu...'
            Get-AppXPackage -AllUsers | Foreach {
              if ($_.InstallLocation) {
                Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\\AppXManifest.xml" -ErrorAction SilentlyContinue
              }
            }
            Write-Host 'AppX-Registrierung abgeschlossen.'
          `.trim()
        }
      default:
        return { type: 'cmd', command: 'echo Unbekannte Aktion' }
    }
  }
}

export const repairService = RepairService.getInstance()


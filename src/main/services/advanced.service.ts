import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type {
  AdvancedToolItem,
  StartupItem,
  HostsEntry,
  HostsFileContent
} from '../../shared/types'

const execAsync = promisify(exec)

export const ADVANCED_TOOLS_CATALOG: AdvancedToolItem[] = [
  // Control & God Mode
  {
    id: 'god_mode',
    name: 'God Mode (Alle Aufgaben)',
    description: 'Öffnet den versteckten Windows-Ordner mit über 200 Systemsteuerungs-Optionen auf einen Blick.',
    command: 'explorer.exe "shell:::{ED7BA470-8E54-465E-825C-99712043E01C}"',
    category: 'control',
    iconName: 'Crown'
  },
  {
    id: 'control_panel',
    name: 'Klassische Systemsteuerung',
    description: 'Startet die traditionelle Windows-Systemsteuerung mit allen klassischen Mini-Anwendungen.',
    command: 'control.exe',
    category: 'control',
    iconName: 'Sliders'
  },
  {
    id: 'sysdm',
    name: 'Erweiterte Systemeigenschaften',
    description: 'Schnellzugriff auf Computernamen, Hardware-Profile, Umgebungsvariablen und Systemeinstellungen.',
    command: 'sysdm.cpl',
    category: 'control',
    iconName: 'Laptop'
  },

  // Diagnostics & Performance
  {
    id: 'resmon',
    name: 'Ressourcenmonitor',
    description: 'Detaillierte Echtzeit-Überwachung von CPU-Threads, Speicherseiten, Datenträger-I/O und Netzwerk-Handles.',
    command: 'resmon.exe',
    category: 'diagnostics',
    iconName: 'Activity'
  },
  {
    id: 'perfmon',
    name: 'Leistungsüberwachung',
    description: 'Professionelles Windows-Diagnosetool zur Aufzeichnung von Systemleistungsdaten und Diagnoseberichten.',
    command: 'perfmon.exe',
    category: 'diagnostics',
    iconName: 'Gauge'
  },
  {
    id: 'taskmgr',
    name: 'Task-Manager',
    description: 'Öffnet den integrierten Task-Manager zur Prozess- und Start-Überwachung.',
    command: 'taskmgr.exe',
    category: 'diagnostics',
    iconName: 'Layers'
  },
  {
    id: 'dxdiag',
    name: 'DirectX-Diagnoseprogramm',
    description: 'Detaillierter Prüfbericht zu DirectX-Treibern, Grafikhardware, Audio-Codecs und DirectPlay.',
    command: 'dxdiag.exe',
    category: 'diagnostics',
    iconName: 'Cpu'
  },
  {
    id: 'msinfo32',
    name: 'Systeminformationen (msinfo32)',
    description: 'Vollständige Hardware- und Softwareumgebungsübersicht inklusive BIOS/UEFI-Version und Secure Boot Status.',
    command: 'msinfo32.exe',
    category: 'diagnostics',
    iconName: 'Info'
  },

  // Management & Administration
  {
    id: 'regedit',
    name: 'Registrierungs-Editor',
    description: 'Bearbeiten und Durchsuchen der Windows-Systemregistrierung (HKCU, HKLM).',
    command: 'regedit.exe',
    category: 'management',
    iconName: 'Database',
    requiresAdmin: true
  },
  {
    id: 'gpedit',
    name: 'Gruppenrichtlinien-Editor',
    description: 'Lokale Richtlinien für Sicherheit, Benutzerrechte, Systemkomponenten und Windows Update konfigurieren.',
    command: 'gpedit.msc',
    category: 'management',
    iconName: 'ShieldAlert',
    requiresAdmin: true
  },
  {
    id: 'compmgmt',
    name: 'Computerverwaltung',
    description: 'Zentrale Verwaltungskonsole mit Ereignisanzeige, Aufgabenplanung, Datenträgern und Diensten.',
    command: 'compmgmt.msc',
    category: 'management',
    iconName: 'FolderKanban',
    requiresAdmin: true
  },
  {
    id: 'services',
    name: 'Dienste-Verwaltung',
    description: 'Alle installierten Windows-Hintergrunddienste prüfen, starten, stoppen und Starttypen ändern.',
    command: 'services.msc',
    category: 'management',
    iconName: 'Cog',
    requiresAdmin: true
  },
  {
    id: 'taskschd',
    name: 'Aufgabenplanung',
    description: 'Erstellen und Verwalten automatisierter zeit- oder ereignisgesteuerter Windows-Aufgaben.',
    command: 'taskschd.msc',
    category: 'management',
    iconName: 'CalendarClock'
  },
  {
    id: 'eventvwr',
    name: 'Ereignisanzeige (Event Viewer)',
    description: 'Diagnoseprotokolle von Windows-Systemabstürzen, Anwendungsfehlern und Sicherheitsaudits.',
    command: 'eventvwr.msc',
    category: 'management',
    iconName: 'FileText'
  },

  // Storage & Security
  {
    id: 'diskmgmt',
    name: 'Datenträgerverwaltung',
    description: 'Partitionieren, Formatieren, Initialisieren und Ändern von Laufwerksbuchstaben aller Datenträger.',
    command: 'diskmgmt.msc',
    category: 'storage_security',
    iconName: 'HardDrive',
    requiresAdmin: true
  },
  {
    id: 'wf',
    name: 'Windows Firewall mit erw. Sicherheit',
    description: 'Erweiterte Regeln für ein- und ausgehende Netzwerkverbindungen sowie Portfreigaben.',
    command: 'wf.msc',
    category: 'storage_security',
    iconName: 'ShieldCheck',
    requiresAdmin: true
  },
  {
    id: 'certmgr',
    name: 'Zertifikatsmanager',
    description: 'Verwaltung vertrauenswürdiger Stammzertifizierungsstellen und Benutzer-Sicherheitszertifikate.',
    command: 'certmgr.msc',
    category: 'storage_security',
    iconName: 'FileKey'
  }
]

export class AdvancedService {
  private static instance: AdvancedService
  private hostsPath: string

  private constructor() {
    this.hostsPath = path.join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32',
      'drivers',
      'etc',
      'hosts'
    )
  }

  public static getInstance(): AdvancedService {
    if (!AdvancedService.instance) {
      AdvancedService.instance = new AdvancedService()
    }
    return AdvancedService.instance
  }

  public getTools(): AdvancedToolItem[] {
    return ADVANCED_TOOLS_CATALOG
  }

  /**
   * Launches a Windows administrative tool in a detached subprocess.
   */
  public async launchTool(toolId: string): Promise<{ success: boolean; message: string }> {
    const tool = ADVANCED_TOOLS_CATALOG.find((t) => t.id === toolId)
    if (!tool) {
      return { success: false, message: `Tool mit ID "${toolId}" nicht gefunden.` }
    }

    try {
      if (tool.id === 'god_mode') {
        // God mode explorer shell folder
        spawn('explorer.exe', ['shell:::{ED7BA470-8E54-465E-825C-99712043E01C}'], {
          detached: true,
          stdio: 'ignore'
        }).unref()
      } else {
        // Start process via cmd.exe /c start to preserve elevated launch prompt if needed
        spawn('cmd.exe', ['/c', 'start', '""', tool.command], {
          detached: true,
          stdio: 'ignore'
        }).unref()
      }

      return {
        success: true,
        message: `${tool.name} wurde erfolgreich gestartet.`
      }
    } catch (err: any) {
      console.error(`Failed to launch tool ${toolId}:`, err)
      return {
        success: false,
        message: `Fehler beim Starten von ${tool.name}: ${err?.message || 'Unbekannt'}`
      }
    }
  }

  /**
   * Reads real Autostart entries from HKCU, HKLM and Startup folder.
   */
  public async getStartupItems(): Promise<StartupItem[]> {
    const psScript = `& {
      $items = @()

      # 1. HKCU Run
      $hkcu = Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -ErrorAction SilentlyContinue
      if ($hkcu) {
        $hkcu.PSObject.Properties | Where-Object { $_.Name -notmatch "^PS" } | ForEach-Object {
          $items += [PSCustomObject]@{
            Id = "hkcu_" + $_.Name
            Name = $_.Name
            Command = [string]$_.Value
            Scope = "User"
            Location = "HKCU\\...\\Run"
            IsEnabled = $true
          }
        }
      }

      # 2. HKLM Run
      $hklm = Get-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -ErrorAction SilentlyContinue
      if ($hklm) {
        $hklm.PSObject.Properties | Where-Object { $_.Name -notmatch "^PS" } | ForEach-Object {
          $items += [PSCustomObject]@{
            Id = "hklm_" + $_.Name
            Name = $_.Name
            Command = [string]$_.Value
            Scope = "System"
            Location = "HKLM\\...\\Run"
            IsEnabled = $true
          }
        }
      }

      # 3. User Startup Folder
      $folder = [Environment]::GetFolderPath("Startup")
      if (Test-Path $folder) {
        Get-ChildItem -Path $folder -File -ErrorAction SilentlyContinue | ForEach-Object {
          $items += [PSCustomObject]@{
            Id = "folder_" + $_.Name
            Name = $_.Name
            Command = $_.FullName
            Scope = "Folder"
            Location = "Startup-Ordner"
            IsEnabled = (-not $_.Name.EndsWith(".disabled"))
          }
        }
      }

      $items | ConvertTo-Json -Compress
    }`

    try {
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 10000 }
      )

      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        const list = Array.isArray(parsed) ? parsed : [parsed]
        return list.map((item: any) => ({
          id: String(item.Id),
          name: String(item.Name),
          command: String(item.Command),
          scope: item.Scope,
          location: String(item.Location),
          isEnabled: Boolean(item.IsEnabled)
        }))
      }
      return []
    } catch (err) {
      console.error('Failed to get startup items:', err)
      return []
    }
  }

  /**
   * Deletes an autostart item safely from registry or startup folder.
   */
  public async deleteStartupItem(itemId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (itemId.startsWith('hkcu_')) {
        const name = itemId.replace('hkcu_', '')
        const ps = `Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${name}" -Force`
        await execAsync(`powershell.exe -NoProfile -Command "${ps}"`)
      } else if (itemId.startsWith('hklm_')) {
        const name = itemId.replace('hklm_', '')
        const ps = `Remove-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${name}" -Force`
        await execAsync(`powershell.exe -NoProfile -Command "${ps}"`)
      } else if (itemId.startsWith('folder_')) {
        const name = itemId.replace('folder_', '')
        const folder = path.join(
          process.env.APPDATA || '',
          'Microsoft',
          'Windows',
          'Start Menu',
          'Programs',
          'Startup'
        )
        const targetFile = path.join(folder, name)
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile)
        }
      }

      return { success: true, message: 'Autostart-Eintrag wurde erfolgreich entfernt.' }
    } catch (err: any) {
      return { success: false, message: `Fehler beim Löschen: ${err?.message || 'Unbekannt'}` }
    }
  }

  /**
   * Reads and parses the Windows hosts file.
   */
  public async getHostsFile(): Promise<HostsFileContent> {
    try {
      if (!fs.existsSync(this.hostsPath)) {
        return { filePath: this.hostsPath, entries: [], rawContent: '' }
      }

      const rawContent = fs.readFileSync(this.hostsPath, 'utf8')
      const lines = rawContent.split(/\r?\n/)
      const entries: HostsEntry[] = []

      let index = 0
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Check if commented out
        const isCommented = trimmed.startsWith('#')
        const cleanLine = isCommented ? trimmed.replace(/^#\s*/, '') : trimmed

        // Match IP Host format e.g. "127.0.0.1 localhost" or "::1 localhost"
        const match = cleanLine.match(/^(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|::1|[a-fA-F0-9:]+)\s+([^\s#]+)(?:\s*#\s*(.*))?$/)

        if (match) {
          entries.push({
            id: `entry_${index++}`,
            ip: match[1],
            host: match[2],
            comment: match[3] || undefined,
            isEnabled: !isCommented,
            rawLine: line
          })
        }
      }

      return {
        filePath: this.hostsPath,
        entries,
        rawContent
      }
    } catch (err) {
      console.error('Failed to read hosts file:', err)
      return { filePath: this.hostsPath, entries: [], rawContent: '' }
    }
  }

  /**
   * Saves updated entries to the hosts file with automatic backup.
   */
  public async saveHostsFile(entries: HostsEntry[]): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Create backup hosts.bak if not exists or update it
      const backupPath = `${this.hostsPath}.bak`
      if (fs.existsSync(this.hostsPath)) {
        fs.copyFileSync(this.hostsPath, backupPath)
      }

      // 2. Generate new hosts content
      const lines: string[] = [
        '# Copyright (c) 1993-2009 Microsoft Corp.',
        '# Modified by M-Toolbox Advanced Tools',
        '#',
        '# IP-Adresse        Hostname                  Kommentar'
      ]

      for (const entry of entries) {
        const prefix = entry.isEnabled ? '' : '# '
        const commentPart = entry.comment ? `  # ${entry.comment}` : ''
        lines.push(`${prefix}${entry.ip.padEnd(18)} ${entry.host}${commentPart}`)
      }
      lines.push('') // trailing newline

      const newContent = lines.join('\r\n')

      // 3. Write to temporary file first
      const tempFile = path.join(os.tmpdir(), `m_toolbox_hosts_${Date.now()}.tmp`)
      fs.writeFileSync(tempFile, newContent, 'utf8')

      // 4. Try direct write, or fallback to elevated PowerShell Copy-Item
      try {
        fs.writeFileSync(this.hostsPath, newContent, 'utf8')
      } catch (writeErr) {
        // Needs administrator permissions, copy via PowerShell RunAs
        const psCmd = `Copy-Item -Path '${tempFile}' -Destination '${this.hostsPath}' -Force`
        await execAsync(`powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -Command \\\"${psCmd}\\\"' -Wait"`)
      }

      // Cleanup temp
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }

      return {
        success: true,
        message: 'Hosts-Datei wurde erfolgreich gespeichert (Backup unter hosts.bak angelegt).'
      }
    } catch (err: any) {
      console.error('Failed to save hosts file:', err)
      return {
        success: false,
        message: `Fehler beim Speichern der Hosts-Datei: ${err?.message || 'Unbekannt'}`
      }
    }
  }
}

export const advancedService = AdvancedService.getInstance()


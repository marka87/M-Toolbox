import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execAsync, execFileAsync } from '../utils/exec'
import { parseStartupItemId, startupApprovedHex } from '../utils/startup-approved'
import type {
  StartupItem,
  HostsEntry,
  HostsFileContent
} from '../../shared/types'

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

  /**
   * Reads real Autostart entries from HKCU, HKLM and Startup folder.
   */
  public async getStartupItems(): Promise<StartupItem[]> {
    const psScript = `& {
      $items = @()

      # StartupApproved (also used by Task Manager): first byte odd (03, 07) = disabled
      function Test-Approved($approved, $name) {
        $v = if ($approved) { $approved.PSObject.Properties[$name] }
        if ($v -and $v.Value -is [byte[]] -and $v.Value.Length -gt 0) { return (($v.Value[0] -band 1) -eq 0) }
        return $true
      }
      $approvedBase = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved"
      $hkcuApproved = Get-ItemProperty -Path "HKCU:\\$approvedBase\\Run" -ErrorAction SilentlyContinue
      $hklmApproved = Get-ItemProperty -Path "HKLM:\\$approvedBase\\Run" -ErrorAction SilentlyContinue
      $folderApproved = Get-ItemProperty -Path "HKCU:\\$approvedBase\\StartupFolder" -ErrorAction SilentlyContinue

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
            IsEnabled = (Test-Approved $hkcuApproved $_.Name)
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
            IsEnabled = (Test-Approved $hklmApproved $_.Name)
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
            IsEnabled = ((-not $_.Name.EndsWith(".disabled")) -and (Test-Approved $folderApproved $_.Name))
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
    const target = parseStartupItemId(itemId)
    if (!target) return { success: false, message: 'Unbekannter Autostart-Eintrag.' }

    try {
      if (target.runKey) {
        // reg.exe without a shell: names with spaces, quotes or $ are passed as-is
        await execFileAsync('reg', ['delete', target.runKey, '/v', target.name, '/f'])
      } else {
        const folder = path.join(
          process.env.APPDATA || '',
          'Microsoft',
          'Windows',
          'Start Menu',
          'Programs',
          'Startup'
        )
        const targetFile = path.join(folder, target.name)
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
   * Enables or disables an autostart item without removing it (StartupApproved, like Task Manager).
   */
  public async setStartupItemEnabled(
    itemId: string,
    enabled: boolean
  ): Promise<{ success: boolean; message: string }> {
    const target = parseStartupItemId(itemId)
    if (!target) return { success: false, message: 'Unbekannter Autostart-Eintrag.' }

    try {
      await execFileAsync('reg', [
        'add',
        target.approvedKey,
        '/v',
        target.name,
        '/t',
        'REG_BINARY',
        '/d',
        startupApprovedHex(enabled === true),
        '/f'
      ])
      return {
        success: true,
        message: enabled ? 'Autostart-Eintrag wurde aktiviert.' : 'Autostart-Eintrag wurde deaktiviert.'
      }
    } catch (err: any) {
      return { success: false, message: `Fehler beim Ändern: ${err?.message || 'Unbekannt'}` }
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


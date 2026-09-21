import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { PowerShellService } from './powershell.service'
import { SoftwareService } from './software.service'
import type {
  BackupPayload,
  BackupSummary,
  RestoreSelection,
  OperationLogEvent,
  BackupFont,
  BackupWallpaper,
  BackupPowerShellModule,
  BackupExplorerSettings
} from '../../shared/types'

export class BackupService {
  private static instance: BackupService
  private ps: PowerShellService
  private softwareService: SoftwareService
  private backupsDir: string

  private constructor() {
    this.ps = PowerShellService.getInstance()
    this.softwareService = SoftwareService.getInstance()
    const appData = app?.getPath('userData') || path.join(process.env.APPDATA || '', 'm-toolbox')
    this.backupsDir = path.join(appData, 'backups')
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true })
    }
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService()
    }
    return BackupService.instance
  }

  public getBackupsDirectory(): string {
    return this.backupsDir
  }

  /**
   * Creates a complete Windows system backup in JSON format
   */
  public async createBackup(
    customFilePath?: string,
    onProgress?: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; filePath: string; payload: BackupPayload; error?: string }> {
    try {
      onProgress?.({ type: 'info', line: '=== Starte Erstellung des M-Toolbox System-Backups ===' })

      // 1. System Info
      const computerName = process.env.COMPUTERNAME || 'WINDOWS-PC'
      const osVersion = process.env.OS || 'Windows 11'

      // 2. Winget Packages
      onProgress?.({ type: 'info', line: 'Sichere installierte Winget-Pakete...' })
      const installedApps = await this.softwareService.getInstalledPackages()
      const wingetPackages = installedApps.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        version: pkg.version,
        source: pkg.source
      }))
      onProgress?.({ type: 'info', line: `${wingetPackages.length} Winget-Pakete erfasst.` })

      // 3. Explorer Settings
      onProgress?.({ type: 'info', line: 'Sichere Windows Explorer & Taskbar Einstellungen...' })
      const explorerRes = await this.ps.executeCommand(`
        $adv = Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          Hidden = $adv.Hidden
          HideFileExt = $adv.HideFileExt
          ShowSuperHidden = $adv.ShowSuperHidden
          LaunchTo = $adv.LaunchTo
          TaskbarAl = $adv.TaskbarAl
          TaskbarMn = $adv.TaskbarMn
          TaskbarDa = $adv.TaskbarDa
          ShowTaskViewButton = $adv.ShowTaskViewButton
        } | ConvertTo-Json -Compress
      `)

      let explorerSettings: BackupExplorerSettings = {}
      try {
        if (explorerRes.stdout) {
          explorerSettings = JSON.parse(explorerRes.stdout)
        }
      } catch (err) {
        console.warn('Failed to parse explorer settings JSON:', err)
      }
      onProgress?.({ type: 'info', line: 'Explorer-Einstellungen erfolgreich gesichert.' })

      // 4. Custom User Fonts
      onProgress?.({ type: 'info', line: 'Sichere benutzerinstallierte Schriftarten...' })
      const fonts: BackupFont[] = []
      const userFontsDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Windows/Fonts')
      if (fs.existsSync(userFontsDir)) {
        const fontFiles = fs.readdirSync(userFontsDir)
        for (const file of fontFiles) {
          if (/\.(ttf|otf)$/i.test(file)) {
            const fontPath = path.join(userFontsDir, file)
            try {
              const fileBuffer = fs.readFileSync(fontPath)
              // Limit individual font backup size to 25MB for safety
              if (fileBuffer.length <= 25 * 1024 * 1024) {
                fonts.push({
                  fileName: file,
                  dataBase64: fileBuffer.toString('base64')
                })
              }
            } catch (err) {
              console.warn(`Font read error for ${file}:`, err)
            }
          }
        }
      }
      onProgress?.({ type: 'info', line: `${fonts.length} benutzerinstallierte Schriftarten gesichert.` })

      // 5. Wallpaper
      onProgress?.({ type: 'info', line: 'Sichere Desktop-Hintergrundbild (Wallpaper)...' })
      let wallpaper: BackupWallpaper | null = null
      const wpRes = await this.ps.executeCommand(`
        $d = Get-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          WallPaper = $d.WallPaper
          WallpaperStyle = $d.WallpaperStyle
          TileWallpaper = $d.TileWallpaper
        } | ConvertTo-Json -Compress
      `)

      try {
        if (wpRes.stdout) {
          const wpData = JSON.parse(wpRes.stdout)
          const wpPath = wpData.WallPaper
          if (wpPath && fs.existsSync(wpPath)) {
            const ext = path.extname(wpPath).toLowerCase()
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
            const imgBuffer = fs.readFileSync(wpPath)
            if (imgBuffer.length <= 30 * 1024 * 1024) {
              wallpaper = {
                originalPath: wpPath,
                style: wpData.WallpaperStyle || '10',
                tile: wpData.TileWallpaper || '0',
                mimeType,
                dataBase64: imgBuffer.toString('base64')
              }
            }
          }
        }
      } catch (err) {
        console.warn('Wallpaper backup error:', err)
      }
      onProgress?.({ type: 'info', line: wallpaper ? 'Wallpaper erfolgreich gesichert.' : 'Kein Wallpaper-Pfad ermittelt.' })

      // 6. PowerShell Modules
      onProgress?.({ type: 'info', line: 'Sichere PowerShell-Module...' })
      const psModRes = await this.ps.executeCommand(`
        Get-Module -ListAvailable | Select-Object -Unique Name, @{Name="Version"; Expression={$_.Version.ToString()}} | ConvertTo-Json -Compress
      `)

      let psModules: BackupPowerShellModule[] = []
      try {
        if (psModRes.stdout) {
          const parsed = JSON.parse(psModRes.stdout)
          if (Array.isArray(parsed)) {
            psModules = parsed.map((m) => ({ name: m.Name, version: m.Version || '1.0.0' }))
          } else if (parsed && parsed.Name) {
            psModules = [{ name: parsed.Name, version: parsed.Version || '1.0.0' }]
          }
        }
      } catch (err) {
        console.warn('PowerShell modules parse error:', err)
      }
      onProgress?.({ type: 'info', line: `${psModules.length} PowerShell-Module erfasst.` })

      // Construct Complete Payload
      const payload: BackupPayload = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        computerName,
        osVersion,
        winget: wingetPackages,
        explorer: explorerSettings,
        fonts,
        wallpaper,
        powershellModules: psModules
      }

      // Determine Target File
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const targetPath =
        customFilePath || path.join(this.backupsDir, `M-Toolbox-Backup-${timestampStr}.json`)

      fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8')
      onProgress?.({
        type: 'exit',
        line: `Backup erfolgreich gespeichert unter: ${targetPath}`
      })

      return { success: true, filePath: targetPath, payload }
    } catch (err: any) {
      console.error('[BackupService] createBackup failed:', err)
      onProgress?.({ type: 'stderr', line: `Fehler beim Erstellen des Backups: ${err?.message}` })
      return { success: false, filePath: '', payload: {} as BackupPayload, error: err?.message }
    }
  }

  /**
   * Generates a summary for a backup file
   */
  public async previewBackup(filePath: string): Promise<BackupSummary> {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data: BackupPayload = JSON.parse(raw)

    return {
      filePath,
      createdAt: data.createdAt,
      computerName: data.computerName,
      osVersion: data.osVersion,
      wingetCount: data.winget?.length || 0,
      explorerSettingsCount: Object.keys(data.explorer || {}).length,
      fontsCount: data.fonts?.length || 0,
      hasWallpaper: !!data.wallpaper,
      powershellModulesCount: data.powershellModules?.length || 0
    }
  }

  /**
   * Lists all local backup JSON files in AppData
   */
  public async listLocalBackups(): Promise<BackupSummary[]> {
    const summaries: BackupSummary[] = []
    if (!fs.existsSync(this.backupsDir)) return []

    const files = fs.readdirSync(this.backupsDir)
    for (const f of files) {
      if (f.endsWith('.json')) {
        const fullPath = path.join(this.backupsDir, f)
        try {
          const s = await this.previewBackup(fullPath)
          summaries.push(s)
        } catch (err) {
          console.warn(`Could not preview backup ${f}:`, err)
        }
      }
    }

    return summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Restores system components from backup file or payload
   */
  public async restoreBackup(
    filePathOrPayload: string | BackupPayload,
    selection: RestoreSelection,
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let payload: BackupPayload
      if (typeof filePathOrPayload === 'string') {
        onProgress({ type: 'info', line: `Lade Sicherungsdatei: ${filePathOrPayload}...` })
        const content = fs.readFileSync(filePathOrPayload, 'utf8')
        payload = JSON.parse(content)
      } else {
        payload = filePathOrPayload
      }

      onProgress({
        type: 'info',
        line: `=== Starte Wiederherstellung (Erstellt am: ${new Date(payload.createdAt).toLocaleString()}) ===`
      })

      // 1. Restore Explorer Settings
      if (selection.explorer && payload.explorer) {
        onProgress({ type: 'info', line: 'Stelle Windows Explorer-Einstellungen wieder her...' })
        const regLines: string[] = []
        for (const [k, v] of Object.entries(payload.explorer)) {
          if (typeof v === 'number') {
            regLines.push(`Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "${k}" -Value ${v} -Type DWord -Force`)
          }
        }

        if (regLines.length > 0) {
          const script = regLines.join('; ')
          await this.ps.executeCommand(script)
          onProgress({ type: 'info', line: `${regLines.length} Explorer-Einstellungen in Registry geschrieben.` })
          // Refresh shell
          await this.ps.executeCommand(`
            Add-Type -MemberDefinition '[DllImport("shell32.dll")] public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);' -Name NativeShell -Namespace WinApi -ErrorAction SilentlyContinue
            [WinApi.NativeShell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
          `)
          onProgress({ type: 'info', line: 'Windows Explorer Shell erfolgreich aktualisiert.' })
        }
      }

      // 2. Restore Wallpaper
      if (selection.wallpaper && payload.wallpaper?.dataBase64) {
        onProgress({ type: 'info', line: 'Stelle Desktop-Hintergrundbild (Wallpaper) wieder her...' })
        const ext = payload.wallpaper.mimeType === 'image/png' ? '.png' : '.jpg'
        const wpTargetPath = path.join(this.backupsDir, `restored_wallpaper${ext}`)

        const imgBuffer = Buffer.from(payload.wallpaper.dataBase64, 'base64')
        fs.writeFileSync(wpTargetPath, imgBuffer)

        const style = payload.wallpaper.style || '10'
        const tile = payload.wallpaper.tile || '0'

        await this.ps.executeCommand(`
          Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name WallpaperStyle -Value "${style}"
          Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name TileWallpaper -Value "${tile}"
          Add-Type -TypeDefinition @"
            using System;
            using System.Runtime.InteropServices;
            public class Wallpaper {
              [DllImport("user32.dll", CharSet = CharSet.Auto)]
              public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
            }
"@ -ErrorAction SilentlyContinue
          [Wallpaper]::SystemParametersInfo(0x0014, 0, "${wpTargetPath.replace(/\\/g, '\\\\')}", 0x01 -bor 0x02)
        `)
        onProgress({ type: 'info', line: 'Desktop-Wallpaper erfolgreich wiederhergestellt und angewendet.' })
      }

      // 3. Restore Fonts
      if (selection.fonts && payload.fonts?.length > 0) {
        onProgress({ type: 'info', line: `Stelle ${payload.fonts.length} Schriftarten wieder her...` })
        const userFontsDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Windows/Fonts')
        if (!fs.existsSync(userFontsDir)) {
          fs.mkdirSync(userFontsDir, { recursive: true })
        }

        let installedCount = 0
        for (const font of payload.fonts) {
          if (font.dataBase64 && font.fileName) {
            const fontPath = path.join(userFontsDir, font.fileName)
            const buf = Buffer.from(font.dataBase64, 'base64')
            fs.writeFileSync(fontPath, buf)

            // Register in HKCU Fonts
            const fontRegName = font.fontName || font.fileName.replace(/\.(ttf|otf)$/i, ' (TrueType)')
            await this.ps.executeCommand(`
              Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" -Name "${fontRegName}" -Value "${fontPath.replace(/\\/g, '\\\\')}" -Force
            `)
            installedCount++
          }
        }

        // Notify Windows of Font Change
        await this.ps.executeCommand(`
          Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern int SendMessage(IntPtr hWnd, int wMsg, IntPtr wParam, IntPtr lParam);' -Name WinUser -Namespace WinApi -ErrorAction SilentlyContinue
          [WinApi.WinUser]::SendMessage([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero)
        `)
        onProgress({ type: 'info', line: `${installedCount} Schriftarten wiederhergestellt und im System registriert.` })
      }

      // 4. Restore PowerShell Modules
      if (selection.powershellModules && payload.powershellModules?.length > 0) {
        onProgress({ type: 'info', line: `Stelle ${payload.powershellModules.length} PowerShell-Module wieder her...` })
        for (const mod of payload.powershellModules) {
          onProgress({ type: 'info', line: `Installiere PowerShell-Modul: ${mod.name}...` })
          await new Promise<void>((res) => {
            this.ps.streamCommand(
              `Install-Module -Name "${mod.name}" -Force -Scope CurrentUser -SkipPublisherCheck -AllowClobber`,
              (data) => onProgress({ type: 'stdout', line: data }),
              (data) => onProgress({ type: 'stderr', line: data }),
              (code) => {
                onProgress({ type: 'info', line: `Modul ${mod.name} beendet mit Code ${code}.` })
                res()
              }
            )
          })
        }
      }

      // 5. Restore Winget Packages
      if (selection.winget && payload.winget?.length > 0) {
        onProgress({ type: 'info', line: `Prüfe und installiere ${payload.winget.length} Winget-Pakete...` })
        const currentInstalled = await this.softwareService.getInstalledPackages()
        const currentMap = new Map(currentInstalled.map((p) => [p.id.toLowerCase(), p]))

        for (const pkg of payload.winget) {
          if (!currentMap.has(pkg.id.toLowerCase())) {
            onProgress({ type: 'info', line: `Installiere fehlendes Paket: ${pkg.name} (${pkg.id})...` })
            await this.softwareService.installPackage(pkg.id, onProgress)
          } else {
            onProgress({ type: 'info', line: `Überspringe: ${pkg.name} ist bereits installiert.` })
          }
        }
      }

      onProgress({ type: 'exit', line: '=== System-Wiederherstellung erfolgreich abgeschlossen! ===' })
      return { success: true }
    } catch (err: any) {
      console.error('[BackupService] restoreBackup failed:', err)
      onProgress({ type: 'stderr', line: `Fehler bei Wiederherstellung: ${err?.message}` })
      return { success: false, error: err?.message }
    }
  }
}


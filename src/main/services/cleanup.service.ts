import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import type {
  CleanupCategoryItem,
  DiskStorageInfo,
  CleanupScanResult,
  CleanupProgressEvent,
  CleanupResult
} from '../../shared/types'

const execAsync = promisify(exec)

interface CategoryDefinition {
  id: string
  name: string
  description: string
  group: 'system' | 'browsers' | 'dumps' | 'cache'
  riskLevel: 'safe' | 'normal'
  getPaths: () => string[]
  filter?: (filename: string) => boolean
  isRecycleBin?: boolean
}

export class CleanupService {
  private static instance: CleanupService

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService()
    }
    return CleanupService.instance
  }

  private getCategoryDefinitions(): CategoryDefinition[] {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local')
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Roaming')
    const systemRoot = process.env.SystemRoot || 'C:\\Windows'
    const programData = process.env.ProgramData || 'C:\\ProgramData'

    return [
      {
        id: 'user_temp',
        name: 'Benutzer-Temporärdateien',
        description: 'Temporäre Dateien, Anwendungs-Caches und Entpackungsreste im Benutzerprofil (%TEMP%).',
        group: 'system',
        riskLevel: 'safe',
        getPaths: () => [path.join(localAppData, 'Temp')]
      },
      {
        id: 'system_temp',
        name: 'Windows System-Temp',
        description: 'Temporäre Dateien von Windows-Diensten und System-Installationsroutinen.',
        group: 'system',
        riskLevel: 'safe',
        getPaths: () => [path.join(systemRoot, 'Temp')]
      },
      {
        id: 'recycle_bin',
        name: 'Papierkorb',
        description: 'Gelöschte Dateien im Papierkorb aller lokalen Laufwerke.',
        group: 'system',
        riskLevel: 'safe',
        isRecycleBin: true,
        getPaths: () => []
      },
      {
        id: 'windows_update_cache',
        name: 'Windows Update Cache',
        description: 'Bereits heruntergeladene und installierte Windows-Update-Pakete.',
        group: 'system',
        riskLevel: 'safe',
        getPaths: () => [path.join(systemRoot, 'SoftwareDistribution', 'Download')]
      },
      {
        id: 'crash_dumps',
        name: 'Crash Dumps & Fehlerberichte',
        description: 'Speicherabbilder abgestürzter Programme und Windows-Fehlerberichte (WER).',
        group: 'dumps',
        riskLevel: 'safe',
        getPaths: () => [
          path.join(localAppData, 'CrashDumps'),
          path.join(programData, 'Microsoft', 'Windows', 'WER', 'ReportArchive'),
          path.join(programData, 'Microsoft', 'Windows', 'WER', 'ReportQueue'),
          path.join(systemRoot, 'Minidump')
        ]
      },
      {
        id: 'system_logs',
        name: 'System- & Wartungs-Logs',
        description: 'Veraltete Windows-Wartungsprotokolle (CBS-, DISM- und Setup-Logs).',
        group: 'dumps',
        riskLevel: 'safe',
        getPaths: () => [
          path.join(systemRoot, 'Logs', 'CBS'),
          path.join(systemRoot, 'Logs', 'DISM'),
          path.join(systemRoot, 'Panther')
        ]
      },
      {
        id: 'thumbnail_cache',
        name: 'Explorer Miniaturansichten (Thumbnails)',
        description: 'Vorschaubilder-Datenbank des Windows Explorers. Wird bei Bedarf automatisch neu erstellt.',
        group: 'cache',
        riskLevel: 'safe',
        getPaths: () => [path.join(localAppData, 'Microsoft', 'Windows', 'Explorer')],
        filter: (file: string) => file.startsWith('thumbcache_') || file.startsWith('iconcache_')
      },
      {
        id: 'browser_chrome',
        name: 'Google Chrome Cache',
        description: 'Temporärer Webseiten-Cache. Passwörter, Verlauf und Lesezeichen bleiben unangetastet.',
        group: 'browsers',
        riskLevel: 'safe',
        getPaths: () => [
          path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
          path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache')
        ]
      },
      {
        id: 'browser_edge',
        name: 'Microsoft Edge Cache',
        description: 'Temporärer Webseiten-Cache. Passwörter, Verlauf und Lesezeichen bleiben unangetastet.',
        group: 'browsers',
        riskLevel: 'safe',
        getPaths: () => [
          path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
          path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache')
        ]
      },
      {
        id: 'browser_firefox',
        name: 'Mozilla Firefox Cache',
        description: 'Temporärer Webseiten-Cache. Passwörter, Verlauf und Lesezeichen bleiben unangetastet.',
        group: 'browsers',
        riskLevel: 'safe',
        getPaths: () => {
          const profilesDir = path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles')
          if (!fs.existsSync(profilesDir)) return []
          try {
            const entries = fs.readdirSync(profilesDir, { withFileTypes: true })
            return entries
              .filter((e) => e.isDirectory())
              .map((e) => path.join(profilesDir, e.name, 'cache2'))
              .filter((p) => fs.existsSync(p))
          } catch {
            return []
          }
        }
      }
    ]
  }

  /**
   * Rekursive Dateigrößen- und Mengenerfassung für ein Verzeichnis
   */
  private async scanDirectory(
    dirPath: string,
    filter?: (filename: string) => boolean
  ): Promise<{ sizeBytes: number; fileCount: number }> {
    let sizeBytes = 0
    let fileCount = 0

    if (!fs.existsSync(dirPath)) {
      return { sizeBytes, fileCount }
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          // Rekursiver Abstieg in Unterordner
          const sub = await this.scanDirectory(fullPath, filter)
          sizeBytes += sub.sizeBytes
          fileCount += sub.fileCount
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          if (filter && !filter(entry.name)) {
            continue
          }
          try {
            const stat = await fs.promises.stat(fullPath)
            sizeBytes += stat.size
            fileCount++
          } catch {
            // Einzelne gesperrte Datei ignorieren
          }
        }
      }
    } catch {
      // Verzeichnis nicht lesbar / Berechtigung fehlt
    }

    return { sizeBytes, fileCount }
  }

  /**
   * Papierkorb-Größe und Anzahl auslesen
   */
  private async scanRecycleBin(): Promise<{ sizeBytes: number; fileCount: number }> {
    try {
      const psCmd = `
        $bin = (New-Object -ComObject Shell.Application).NameSpace(10)
        $count = $bin.Items().Count
        $total = 0
        foreach ($item in $bin.Items()) { $total += $item.Size }
        Write-Output "$count,$total"
      `.trim()

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd.replace(/\r?\n/g, ' ')}"`, {
        timeout: 8000
      })

      const parts = stdout.trim().split(',')
      if (parts.length === 2) {
        const fileCount = parseInt(parts[0], 10) || 0
        const sizeBytes = parseInt(parts[1], 10) || 0
        return { sizeBytes, fileCount }
      }
    } catch (err) {
      console.warn('[CleanupService] Konnte Papierkorb nicht auslesen:', err)
    }

    return { sizeBytes: 0, fileCount: 0 }
  }

  /**
   * Festplatten-Speicherbelegung abfragen
   */
  async getDisksStorage(): Promise<DiskStorageInfo[]> {
    try {
      const psCmd = `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, VolumeName, Size, FreeSpace | ConvertTo-Json -Compress`
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 8000 })
      if (!stdout || !stdout.trim()) return []

      const parsed = JSON.parse(stdout.trim())
      const list = Array.isArray(parsed) ? parsed : [parsed]

      return list
        .filter((d) => d && d.DeviceID && d.Size)
        .map((d) => {
          const total = Number(d.Size) || 1
          const free = Number(d.FreeSpace) || 0
          const used = Math.max(0, total - free)
          const usagePercent = Math.min(100, Math.round((used / total) * 100))

          return {
            drive: d.DeviceID,
            volumeName: d.VolumeName ? `${d.VolumeName} (${d.DeviceID})` : `Lokaler Datenträger (${d.DeviceID})`,
            totalBytes: total,
            freeBytes: free,
            usedBytes: used,
            usagePercent
          }
        })
    } catch (err) {
      console.error('[CleanupService] Fehler beim Auslesen der Festplatten:', err)
      return []
    }
  }

  /**
   * Vollständiger Scan aller Bereinigungskategorien
   */
  async scan(): Promise<CleanupScanResult> {
    const definitions = this.getCategoryDefinitions()
    const categories: CleanupCategoryItem[] = []
    let totalSizeBytes = 0
    let totalFileCount = 0

    for (const def of definitions) {
      let sizeBytes = 0
      let fileCount = 0
      const validPaths: string[] = []

      if (def.isRecycleBin) {
        const bin = await this.scanRecycleBin()
        sizeBytes = bin.sizeBytes
        fileCount = bin.fileCount
      } else {
        const paths = def.getPaths()
        for (const p of paths) {
          if (fs.existsSync(p)) {
            validPaths.push(p)
            const res = await this.scanDirectory(p, def.filter)
            sizeBytes += res.sizeBytes
            fileCount += res.fileCount
          }
        }
      }

      totalSizeBytes += sizeBytes
      totalFileCount += fileCount

      categories.push({
        id: def.id,
        name: def.name,
        description: def.description,
        group: def.group,
        sizeBytes,
        fileCount,
        paths: validPaths,
        riskLevel: def.riskLevel,
        selected: sizeBytes > 0
      })
    }

    const disks = await this.getDisksStorage()

    return {
      categories,
      totalSizeBytes,
      totalFileCount,
      disks,
      scannedAt: new Date().toISOString()
    }
  }

  /**
   * Rekursives Löschen eines Verzeichnisses (Dateien entfernen, gesperrte Dateien überspringen)
   */
  private async cleanDirectory(
    dirPath: string,
    filter?: (filename: string) => boolean,
    onProgress?: (freedBytes: number) => void
  ): Promise<{ freedBytes: number; deletedCount: number; skippedCount: number }> {
    let freedBytes = 0
    let deletedCount = 0
    let skippedCount = 0

    if (!fs.existsSync(dirPath)) {
      return { freedBytes, deletedCount, skippedCount }
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          const sub = await this.cleanDirectory(fullPath, filter, onProgress)
          freedBytes += sub.freedBytes
          deletedCount += sub.deletedCount
          skippedCount += sub.skippedCount

          // Versuche leeren Unterordner zu entfernen
          try {
            await fs.promises.rmdir(fullPath)
          } catch {
            // Wenn nicht leer oder gesperrt, behalten
          }
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          if (filter && !filter(entry.name)) {
            continue
          }

          try {
            const stat = await fs.promises.stat(fullPath)
            await fs.promises.unlink(fullPath)
            freedBytes += stat.size
            deletedCount++
            onProgress?.(stat.size)
          } catch {
            // Datei in Benutzung (EBUSY / EPERM) -> sicher überspringen
            skippedCount++
          }
        }
      }
    } catch {
      // Ordner gesperrt
    }

    return { freedBytes, deletedCount, skippedCount }
  }

  /**
   * Führt die Bereinigung für die gewählten Kategorien aus
   */
  async clean(
    selectedCategoryIds: string[],
    onProgress?: (event: CleanupProgressEvent) => void
  ): Promise<CleanupResult> {
    const startTime = Date.now()
    const definitions = this.getCategoryDefinitions()
    const selectedDefs = definitions.filter((d) => selectedCategoryIds.includes(d.id))

    let totalFreedBytes = 0
    let totalDeletedFiles = 0
    let totalSkippedFiles = 0
    const cleanedCategories: string[] = []

    const totalSteps = selectedDefs.length
    let currentStep = 0

    for (const def of selectedDefs) {
      currentStep++
      const percent = Math.round((currentStep / totalSteps) * 100)

      onProgress?.({
        categoryId: def.id,
        currentAction: `Bereinige: ${def.name}...`,
        freedBytes: totalFreedBytes,
        percent
      })

      if (def.isRecycleBin) {
        try {
          // Papierkorb entleeren
          const before = await this.scanRecycleBin()
          await execAsync('powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', {
            timeout: 15000
          })
          totalFreedBytes += before.sizeBytes
          totalDeletedFiles += before.fileCount
          cleanedCategories.push(def.name)
        } catch (err) {
          console.warn('[CleanupService] Fehler beim Leeren des Papierkorbs:', err)
        }
      } else {
        const paths = def.getPaths()
        let catFreed = 0
        let catDeleted = 0
        let catSkipped = 0

        for (const p of paths) {
          if (fs.existsSync(p)) {
            const res = await this.cleanDirectory(p, def.filter, (bytes) => {
              totalFreedBytes += bytes
            })
            catFreed += res.freedBytes
            catDeleted += res.deletedCount
            catSkipped += res.skippedCount
          }
        }

        totalDeletedFiles += catDeleted
        totalSkippedFiles += catSkipped
        if (catDeleted > 0 || catFreed > 0) {
          cleanedCategories.push(def.name)
        }
      }
    }

    onProgress?.({
      categoryId: 'done',
      currentAction: 'Bereinigung erfolgreich abgeschlossen.',
      freedBytes: totalFreedBytes,
      percent: 100
    })

    return {
      success: true,
      freedBytes: totalFreedBytes,
      deletedFilesCount: totalDeletedFiles,
      skippedFilesCount: totalSkippedFiles,
      cleanedCategories,
      durationMs: Date.now() - startTime
    }
  }

  /**
   * Öffnet die nativen Windows 11 Speichereinstellungen (Storage Sense)
   */
  openStorageSense(): void {
    exec('start ms-settings:storagesense')
  }
}

export const cleanupService = CleanupService.getInstance()

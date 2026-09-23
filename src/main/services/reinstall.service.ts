import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { app } from 'electron'
import { PowerShellService } from './powershell.service'
import { SoftwareService } from './software.service'
import { driverService } from './driver.service'
import { DatabaseService } from './database.service'
import { tweakService } from './tweak.service'
import type {
  ReinstallArchiveSummary,
  ReinstallCreateOptions,
  ReinstallManifest,
  ReinstallProgress,
  ReinstallRestoreOptions,
  ReinstallResult
} from '../../shared/reinstall.types'

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
  } catch {
    return fallback
  }
}

export class ReinstallService {
  private readonly powershell = PowerShellService.getInstance()
  private readonly software = SoftwareService.getInstance()
  private readonly database = DatabaseService.getInstance()

  static getInstance(): ReinstallService {
    return reinstallService
  }

  async discover(onProgress?: (event: ReinstallProgress) => void): Promise<{
    apps: Awaited<ReturnType<SoftwareService['getInstalledPackages']>>
    drivers: Awaited<ReturnType<typeof driverService.getDevicesAndDrivers>>
    system: Record<string, unknown>
    tweaks: string[]
  }> {
    onProgress?.({ phase: 'discover', percent: 10, message: 'Installierte Anwendungen werden ermittelt …' })
    const apps = await this.software.getInstalledPackages('winget')

    onProgress?.({ phase: 'discover', percent: 50, message: 'Treiber & Hardware werden ermittelt …' })
    const drivers = await driverService.getDevicesAndDrivers()

    onProgress?.({ phase: 'discover', percent: 75, message: 'Aktive Windows-Tweaks werden abgefragt …' })
    let activeTweaks: string[] = []
    try {
      const allTweaks = await tweakService.getAllTweaks()
      activeTweaks = allTweaks.filter((t) => t.value === true).map((t) => t.id)
    } catch {
      // ignore
    }

    onProgress?.({ phase: 'discover', percent: 90, message: 'Systeminformationen werden ermittelt …' })
    const result = await this.powershell.executeCommand(
      'Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,InstallDate,LastBootUpTime,OSArchitecture,CSName | ConvertTo-Json -Compress'
    )
    const system = await readJson<Record<string, unknown>>(result.stdout || '', {})
    onProgress?.({ phase: 'discover', percent: 100, message: 'Ermittlung abgeschlossen.' })
    return { apps, drivers, system, tweaks: activeTweaks }
  }

  async createArchive(
    filePath: string,
    options: ReinstallCreateOptions = {},
    onProgress?: (event: ReinstallProgress) => void
  ): Promise<ReinstallResult> {
    const root = path.join(app.getPath('userData'), 'reinstall-temp', `create-${Date.now()}`)
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.mkdir(root, { recursive: true })

      const discovered = await this.discover(onProgress)
      const selectedIds = options.selectedAppIds ? new Set(options.selectedAppIds) : null
      const selectedApps = selectedIds ? discovered.apps.filter((app) => selectedIds.has(app.id)) : discovered.apps

      const includeDrivers = options.includeDrivers !== false
      const includeTweaks = options.includeTweaks !== false
      const includeWifi = options.includeWifi !== false

      const sections: ReinstallManifest['sections'] = ['apps', 'system']
      let hasPhysicalDrivers = false

      // 1. Physischer OEM-Treiber-Export (pnputil)
      if (includeDrivers) {
        sections.push('drivers')
        onProgress?.({ phase: 'drivers', percent: 25, message: 'Exportiere OEM-Treiber für Offline-Installation …' })
        const driversDir = path.join(root, 'drivers')
        await fs.mkdir(driversDir, { recursive: true })

        try {
          const exportResult = await driverService.exportDrivers(driversDir, '*')
          hasPhysicalDrivers = exportResult.success && exportResult.exportedCount > 0
        } catch (err) {
          console.warn('[ReinstallService] Fehler beim Treiber-Export:', err)
        }
      }

      // 2. Windows-Tweaks
      if (includeTweaks) {
        sections.push('tweaks')
        await fs.writeFile(path.join(root, 'tweaks.json'), JSON.stringify(discovered.tweaks, null, 2), 'utf8')
      }

      // 3. WLAN-Profile
      if (includeWifi) {
        sections.push('wifi')
        const wifiDir = path.join(root, 'wifi')
        await fs.mkdir(wifiDir, { recursive: true })
        await this.powershell.executeCommand(`netsh wlan export profile folder=${quote(wifiDir)} key=clear`).catch(() => undefined)
      }

      // 4. Manifest & Metadaten
      const manifest: ReinstallManifest = {
        format: 'mtoolbox-reinstall',
        formatVersion: '2.0',
        createdBy: 'M-Toolbox 2.0.0',
        createdAt: new Date().toISOString(),
        computerName: os.hostname(),
        windowsVersion: String(discovered.system.Caption || ''),
        build: String(discovered.system.BuildNumber || ''),
        backupId: crypto.randomUUID(),
        appCount: selectedApps.length,
        driverCount: discovered.drivers.packages.length,
        tweakCount: discovered.tweaks.length,
        hasPhysicalDrivers,
        sections
      }

      await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
      await fs.writeFile(path.join(root, 'apps.json'), JSON.stringify(selectedApps, null, 2), 'utf8')
      await fs.writeFile(path.join(root, 'drivers.json'), JSON.stringify(discovered.drivers, null, 2), 'utf8')
      await fs.writeFile(path.join(root, 'system.json'), JSON.stringify(discovered.system, null, 2), 'utf8')

      // 5. ZIP-Kompression
      onProgress?.({ phase: 'archive', percent: 85, message: 'Installationsplan wird komprimiert …' })
      const result = await this.powershell.executeCommand(
        `Compress-Archive -Path ${quote(path.join(root, '*'))} -DestinationPath ${quote(filePath)} -Force`,
        300000
      )
      if (result.exitCode !== 0) throw new Error(result.stderr || 'Archiv konnte nicht erstellt werden.')

      this.database.logActivity('reinstall', 'create', 'success', filePath)
      onProgress?.({ phase: 'archive', percent: 100, message: 'Archiv erfolgreich erstellt.' })
      return { success: true, filePath }
    } catch (error) {
      this.database.logActivity('reinstall', 'create', 'error', String(error))
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    } finally {
      await fs.rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  async preview(filePath: string): Promise<ReinstallArchiveSummary> {
    const root = await this.extract(filePath)
    try {
      const manifest = await this.readManifest(root)
      const apps = await readJson<Array<{ id: string; name: string; version?: string }>>(path.join(root, 'apps.json'), [])
      const drivers = await readJson<{ packages?: unknown[] }>(path.join(root, 'drivers.json'), {})
      const systemInfo = await readJson<Record<string, unknown>>(path.join(root, 'system.json'), {})
      const tweaks = await readJson<string[]>(path.join(root, 'tweaks.json'), [])

      let hasPhysicalDrivers = false
      try {
        const driverEntries = await fs.readdir(path.join(root, 'drivers'))
        hasPhysicalDrivers = driverEntries.length > 0
      } catch {
        hasPhysicalDrivers = false
      }

      return {
        filePath,
        manifest,
        appCount: apps.length,
        driverCount: drivers.packages?.length ?? 0,
        tweakCount: tweaks.length,
        hasPhysicalDrivers,
        systemInfo,
        apps,
        tweaks
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  }

  async restore(
    filePath: string,
    options: ReinstallRestoreOptions = {},
    onProgress?: (event: ReinstallProgress) => void
  ): Promise<ReinstallResult> {
    const root = await this.extract(filePath)
    let installedApps = 0
    let installedDrivers = 0
    let appliedTweaks = 0

    try {
      const manifest = await this.readManifest(root)

      // 1. Treiber-Installation (pnputil)
      if (options.drivers !== false && manifest.hasPhysicalDrivers) {
        const driversDir = path.join(root, 'drivers')
        try {
          const stats = await fs.stat(driversDir)
          if (stats.isDirectory()) {
            onProgress?.({ phase: 'drivers', percent: 15, message: 'Installiere OEM-Treiber (pnputil) …' })
            await this.powershell.executeCommand(
              `pnputil /add-driver ${quote(path.join(driversDir, '*.inf'))} /subdirs /install`,
              300000
            )
            installedDrivers = manifest.driverCount
            onProgress?.({ phase: 'drivers', percent: 30, message: 'OEM-Treiber erfolgreich installiert.' })
          }
        } catch (err) {
          console.warn('[ReinstallService] Fehler bei Treiber-Installation:', err)
        }
      }

      // 2. WLAN-Profile wiederherstellen
      const wifiDir = path.join(root, 'wifi')
      try {
        const wifiProfiles = await fs.readdir(wifiDir)
        for (const profileFile of wifiProfiles) {
          if (profileFile.endsWith('.xml')) {
            await this.powershell.executeCommand(`netsh wlan add profile filename=${quote(path.join(wifiDir, profileFile))} user=all`).catch(() => undefined)
          }
        }
      } catch {
        // ignore
      }

      // 3. Windows-Tweaks anwenden
      if (options.tweaks !== false) {
        try {
          const tweaks = await readJson<string[]>(path.join(root, 'tweaks.json'), [])
          onProgress?.({ phase: 'tweaks', percent: 40, message: 'Wende gespeicherte Windows-Tweaks an …' })
          let restartExplorerNeeded = false
          for (const tweakId of tweaks) {
            const res = await tweakService.setTweak(tweakId, true)
            if (res.success) {
              appliedTweaks++
              if (res.requiresRestart === 'explorer') restartExplorerNeeded = true
            }
          }
          if (restartExplorerNeeded) {
            await tweakService.restartExplorer().catch(() => undefined)
          }
        } catch {
          // ignore
        }
      }

      // 4. Programme über Winget installieren
      if (options.apps !== false) {
        const apps = await readJson<Array<{ id?: string; name?: string }>>(path.join(root, 'apps.json'), [])
        const selectedSet = options.selectedAppIds ? new Set(options.selectedAppIds) : null
        const targetApps = selectedSet ? apps.filter((a) => a.id && selectedSet.has(a.id)) : apps

        for (let i = 0; i < targetApps.length; i++) {
          const appItem = targetApps[i]
          if (!appItem.id) continue
          const currentPercent = 50 + Math.round((i / Math.max(targetApps.length, 1)) * 48)
          onProgress?.({
            phase: 'apps',
            percent: currentPercent,
            message: `Installiere: ${appItem.name || appItem.id} (${i + 1}/${targetApps.length}) …`
          })

          const installRes = await this.software.installPackage(appItem.id, (event) => {
            if (event.type === 'info') {
              onProgress?.({ phase: 'apps', percent: currentPercent, message: event.line })
            }
          })

          if (installRes.success) {
            installedApps++
          }
        }
      }

      this.database.logActivity('reinstall', 'restore', 'success', filePath)
      onProgress?.({ phase: 'restore', percent: 100, message: 'Wiederherstellung erfolgreich abgeschlossen!' })
      return {
        success: true,
        filePath,
        installedApps,
        installedDrivers,
        appliedTweaks
      }
    } catch (error) {
      this.database.logActivity('reinstall', 'restore', 'error', String(error))
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    } finally {
      await fs.rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  getHistory(): Array<{ createdAt: string; status: string; details?: string }> {
    return this.database.getActivity('reinstall', 'restore')
  }

  private async extract(filePath: string): Promise<string> {
    const root = path.join(app.getPath('userData'), 'reinstall-temp', `read-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await fs.mkdir(root, { recursive: true })
    const result = await this.powershell.executeCommand(
      `Expand-Archive -LiteralPath ${quote(filePath)} -DestinationPath ${quote(root)} -Force`,
      300000
    )
    if (result.exitCode !== 0) {
      await fs.rm(root, { recursive: true, force: true })
      throw new Error(result.stderr || 'Archiv konnte nicht gelesen werden.')
    }
    return root
  }

  private async readManifest(root: string): Promise<ReinstallManifest> {
    const manifest = await readJson<Partial<ReinstallManifest> | null>(path.join(root, 'manifest.json'), null)
    if (!manifest?.format?.startsWith('mtoolbox-reinstall')) {
      throw new Error('Ungültiges oder nicht unterstütztes M-Toolbox-Archiv.')
    }
    return manifest as ReinstallManifest
  }
}

export const reinstallService = new ReinstallService()

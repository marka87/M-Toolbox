import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import type {
  DeviceItem,
  DriverPackage,
  DriverCategory,
  DriverStats,
  DriverExportResult,
  DriverOperationResult,
  DeviceStatus,
  GpuInfo,
  GpuVendor,
  WindowsUpdateDriver
} from '../../shared/types'

const execAsync = promisify(exec)

const PROBLEM_DESCRIPTIONS: Record<string, string> = {
  '1': 'Dieses Gerät ist nicht richtig konfiguriert (Code 1).',
  '3': 'Der Treiber für dieses Gerät ist möglicherweise beschädigt (Code 3).',
  '9': 'Windows kann dieses Hardwaregerät nicht identifizieren (Code 9).',
  '10': 'Das Gerät kann nicht gestartet werden. Bitte Treiber aktualisieren (Code 10).',
  '12': 'Für dieses Gerät sind nicht genügend freie Systemressourcen verfügbar (Code 12).',
  '14': 'Das Gerät funktioniert erst nach einem Computer-Neustart ordnungsgemäß (Code 14).',
  '18': 'Die Treiber für dieses Gerät müssen neu installiert werden (Code 18).',
  '21': 'Windows entfernt dieses Gerät gerade aus dem System (Code 21).',
  '22': 'Dieses Gerät ist im Geräte-Manager deaktiviert (Code 22).',
  '24': 'Das Gerät ist nicht vorhanden, funktioniert nicht oder es fehlen Treiber (Code 24).',
  '28': 'Die Treiber für dieses Gerät sind nicht installiert (Code 28).',
  '29': 'Dieses Gerät ist deaktiviert, da die Firmware keine Ressourcen zuwies (Code 29).',
  '31': 'Das Gerät funktioniert nicht ordnungsgemäß, da Windows die Treiber nicht laden kann (Code 31).',
  '32': 'Ein Treiberdienst für dieses Gerät wurde deaktiviert (Code 32).',
  '37': 'Windows kann den Treiber für diese Hardware nicht initialisieren (Code 37).',
  '38': 'Der Gerätetreiber konnte nicht geladen werden, weil noch eine Instanz aktiv ist (Code 38).',
  '39': 'Windows kann den Treiber nicht laden. Die Treiberdatei ist möglicherweise beschädigt (Code 39).',
  '43': 'Dieses Gerät wurde angehalten, weil es Fehler gemeldet hat (Code 43).',
  '48': 'Die Ausführung der Treibersoftware für dieses Gerät wurde blockiert (Code 48).',
  '52': 'Die digitale Signatur der Treiber für dieses Gerät kann nicht überprüft werden (Code 52).'
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

function categorizeClass(className: string): DriverCategory {
  const c = (className || '').toLowerCase()
  if (c === 'display' || c === 'monitor') return 'display'
  if (c === 'net') return 'net'
  if (c === 'media' || c === 'audioendpoint' || c === 'audioprocessingobject') return 'media'
  if (c === 'keyboard' || c === 'mouse' || c === 'hidclass' || c === 'barcodescanner') return 'input'
  if (c === 'diskdrive' || c === 'scsiadapter' || c === 'volume' || c === 'hdc' || c === 'cdrom') return 'storage'
  if (c === 'usb' || c === 'ports' || c === 'usbdevice' || c === 'smartcardreader') return 'usb'
  if (c === 'system' || c === 'firmware' || c === 'processor' || c === 'computer') return 'system'
  return 'other'
}

export class DriverService {
  /**
   * Liest alle angeschlossenen Geräte sowie alle Treiberpakete (Drittanbieter/OEM) aus
   */
  async getDevicesAndDrivers(): Promise<{
    devices: DeviceItem[]
    packages: DriverPackage[]
    stats: DriverStats
  }> {
    // 1. Drittanbieter-Treiberpakete abfragen
    const packages: DriverPackage[] = []
    const packageMap = new Map<string, DriverPackage>()

    try {
      const { stdout: pkgStdout } = await execAsync('pnputil /enum-drivers /format csv', {
        maxBuffer: 1024 * 1024 * 16,
        encoding: 'utf8'
      })

      const pkgLines = pkgStdout.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (pkgLines.length > 1) {
        // Erste Zeile ist Header
        for (let i = 1; i < pkgLines.length; i++) {
          const cols = parseCsvLine(pkgLines[i])
          if (cols.length < 5) continue

          const rawVersion = cols[7] || ''
          const parts = rawVersion.split(' ')
          const driverDate = parts.length > 1 ? parts[0] : ''
          const driverVersion = parts.length > 1 ? parts.slice(1).join(' ') : rawVersion

          const pkg: DriverPackage = {
            driverName: cols[0] || '',
            originalName: cols[1] || '',
            providerName: cols[2] || 'Unbekannt',
            className: cols[3] || '',
            classGuid: cols[4] || '',
            driverVersion: driverVersion,
            driverDate: driverDate,
            signerName: cols[8] || '',
            catalogAttributes: cols[9] || ''
          }

          packages.push(pkg)
          packageMap.set(pkg.driverName.toLowerCase(), pkg)
          if (pkg.originalName) {
            packageMap.set(pkg.originalName.toLowerCase(), pkg)
          }
        }
      }
    } catch (err) {
      console.error('[DriverService] Fehler beim Abrufen der Treiberpakete:', err)
    }

    // 2. Angeschlossene Geräte abfragen
    const devices: DeviceItem[] = []
    const seenInstances = new Set<string>()

    try {
      const { stdout: devStdout } = await execAsync('pnputil /enum-devices /connected /format csv', {
        maxBuffer: 1024 * 1024 * 32,
        encoding: 'utf8'
      })

      const devLines = devStdout.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (devLines.length > 1) {
        for (let i = 1; i < devLines.length; i++) {
          const cols = parseCsvLine(devLines[i])
          if (cols.length < 6) continue

          const instanceId = cols[0] || ''
          if (!instanceId || seenInstances.has(instanceId)) continue
          seenInstances.add(instanceId)

          const deviceDescription = cols[1] || 'Unbekanntes Gerät'
          const className = cols[2] || ''
          const classGuid = cols[3] || ''
          const manufacturerName = cols[4] || 'Unbekannt'
          const rawStatus = (cols[5] || 'Unknown') as DeviceStatus
          const problemCode = cols[6] || ''
          const driverName = cols[8] || ''

          const matchedPkg =
            packageMap.get(driverName.toLowerCase()) ||
            (driverName.includes('.') ? packageMap.get(path.basename(driverName).toLowerCase()) : undefined)

          const isThirdParty = Boolean(
            matchedPkg ||
            driverName.toLowerCase().startsWith('oem') ||
            (manufacturerName && !manufacturerName.toLowerCase().includes('microsoft') && !manufacturerName.toLowerCase().includes('(standard'))
          )

          const category = categorizeClass(className)

          let problemDescription: string | undefined
          if (problemCode && PROBLEM_DESCRIPTIONS[problemCode]) {
            problemDescription = PROBLEM_DESCRIPTIONS[problemCode]
          } else if (problemCode) {
            problemDescription = `Geräteproblem erkannt (Problem-Code ${problemCode})`
          } else if (rawStatus === 'Problem') {
            problemDescription = 'Windows meldet einen Fehler für dieses Gerät.'
          }

          devices.push({
            instanceId,
            deviceDescription,
            className,
            classGuid,
            manufacturerName,
            status: rawStatus,
            problemCode,
            problemDescription,
            driverName: matchedPkg ? `${matchedPkg.driverName} (${matchedPkg.originalName})` : driverName,
            driverVersion: matchedPkg?.driverVersion,
            driverDate: matchedPkg?.driverDate,
            driverProvider: matchedPkg?.providerName || (isThirdParty ? manufacturerName : 'Microsoft'),
            signerName: matchedPkg?.signerName,
            category,
            isThirdParty
          })
        }
      }
    } catch (err) {
      console.error('[DriverService] Fehler beim Abrufen der Geräte:', err)
    }

    // 3. Auch Geräte mit Problemen abfragen (um nicht verbundene oder blockierte Geräte zu erfassen)
    try {
      const { stdout: probStdout } = await execAsync('pnputil /enum-devices /problem /format csv', {
        maxBuffer: 1024 * 1024 * 16,
        encoding: 'utf8'
      })
      const probLines = probStdout.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (probLines.length > 1) {
        for (let i = 1; i < probLines.length; i++) {
          const cols = parseCsvLine(probLines[i])
          if (cols.length < 6) continue
          const instanceId = cols[0] || ''
          if (!instanceId) continue

          // Falls bereits in connected enthalten, aktualisiere ggf. den Problemstatus
          const existing = devices.find((d) => d.instanceId === instanceId)
          if (existing) {
            existing.status = 'Problem'
            existing.problemCode = cols[6] || existing.problemCode
            if (existing.problemCode && PROBLEM_DESCRIPTIONS[existing.problemCode]) {
              existing.problemDescription = PROBLEM_DESCRIPTIONS[existing.problemCode]
            }
          } else {
            // Neues Problemgerät hinzufügen
            const deviceDescription = cols[1] || 'Unbekanntes Gerät'
            const className = cols[2] || ''
            const classGuid = cols[3] || ''
            const manufacturerName = cols[4] || 'Unbekannt'
            const rawStatus: DeviceStatus = 'Problem'
            const problemCode = cols[6] || ''
            const driverName = cols[8] || ''
            const matchedPkg = packageMap.get(driverName.toLowerCase())

            devices.unshift({
              instanceId,
              deviceDescription,
              className,
              classGuid,
              manufacturerName,
              status: rawStatus,
              problemCode,
              problemDescription:
                PROBLEM_DESCRIPTIONS[problemCode] || `Geräteproblem erkannt (Code ${problemCode})`,
              driverName: matchedPkg ? `${matchedPkg.driverName} (${matchedPkg.originalName})` : driverName,
              driverVersion: matchedPkg?.driverVersion,
              driverDate: matchedPkg?.driverDate,
              driverProvider: matchedPkg?.providerName || manufacturerName,
              signerName: matchedPkg?.signerName,
              category: categorizeClass(className),
              isThirdParty: Boolean(matchedPkg || driverName.toLowerCase().startsWith('oem'))
            })
          }
        }
      }
    } catch (err) {
      console.warn('[DriverService] Hinweis: Keine zusätzlichen Problemgeräte abrufbar:', err)
    }

    // Statistiken berechnen
    const totalDevices = devices.length
    const problemDevices = devices.filter((d) => d.status === 'Problem' || d.problemCode !== '').length
    const thirdPartyDrivers = packages.length
    const whqlDrivers = packages.filter(
      (p) => p.signerName.toLowerCase().includes('microsoft') || p.signerName.toLowerCase().includes('compatibility')
    ).length

    const stats: DriverStats = {
      totalDevices,
      problemDevices,
      thirdPartyDrivers,
      whqlDrivers
    }

    return { devices, packages, stats }
  }

  /**
   * Exportiert Drittanbieter-Treiberpakete in einen Zielordner
   */
  async exportDrivers(
    targetDirectory: string,
    infName: string = '*',
    onProgress?: (message: string) => void
  ): Promise<DriverExportResult> {
    if (!fs.existsSync(targetDirectory)) {
      try {
        fs.mkdirSync(targetDirectory, { recursive: true })
      } catch (err) {
        return {
          success: false,
          exportedCount: 0,
          targetDirectory,
          error: `Zielordner konnte nicht erstellt werden: ${err instanceof Error ? err.message : String(err)}`
        }
      }
    }

    onProgress?.(`Starte Treiber-Export nach: ${targetDirectory}...`)

    return new Promise((resolve) => {
      const child = spawn('pnputil', ['/export-driver', infName, targetDirectory], {
        windowsHide: true
      })

      let exportedCount = 0
      let fullOutput = ''

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf8')
        fullOutput += text
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

        for (const line of lines) {
          onProgress?.(line)
          // Zähle Exportierte Treiberpakete
          if (line.toLowerCase().includes('erfolgreich exportiert') || line.toLowerCase().includes('exporting')) {
            exportedCount++
          }
        }
      })

      child.stderr.on('data', (data: Buffer) => {
        const errText = data.toString('utf8').trim()
        if (errText) {
          onProgress?.(`[WARNUNG] ${errText}`)
        }
      })

      child.on('close', (code) => {
        // Versuche die exakte Zahl aus der pnputil Zusammenfassung zu lesen
        const match = fullOutput.match(/Exportierte Treiberpakete:\s+(\d+)/i)
        if (match && match[1]) {
          exportedCount = parseInt(match[1], 10)
        }

        if (code === 0 || exportedCount > 0) {
          onProgress?.(`Treiber-Export abgeschlossen: ${exportedCount} Pakete gesichert in ${targetDirectory}.`)
          resolve({
            success: true,
            exportedCount,
            targetDirectory
          })
        } else {
          resolve({
            success: false,
            exportedCount: 0,
            targetDirectory,
            error: `Export beendet mit Exit-Code ${code}. Keine Pakete exportiert.`
          })
        }
      })

      child.on('error', (err) => {
        onProgress?.(`[FEHLER] ${err.message}`)
        resolve({
          success: false,
          exportedCount: 0,
          targetDirectory,
          error: err.message
        })
      })
    })
  }

  /**
   * Startet den Hardware-Scan nach neuer/geänderter Hardware
   */
  async scanHardware(): Promise<DriverOperationResult> {
    try {
      const { stdout } = await execAsync('pnputil /scan-devices', { timeout: 15000 })
      return {
        success: true,
        message: stdout.trim() || 'Hardware-Scan erfolgreich abgeschlossen.'
      }
    } catch (err: any) {
      // Wenn Administratorrechte fehlen, informiere den Nutzer
      if (err.stdout && err.stdout.includes('Zugriff verweigert')) {
        return {
          success: false,
          message: 'Hardware-Scan erfordert Administratorrechte. Bitte starte M-Toolbox als Administrator oder nutze den Geräte-Manager.'
        }
      }
      return {
        success: false,
        message: `Hardware-Scan fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`
      }
    }
  }

  /**
   * Öffnet die native Windows Geräte-Manager-Konsole (devmgmt.msc)
   */
  openDeviceManager(): void {
    exec('start devmgmt.msc')
  }

  /**
   * Startet ein Gerät per pnputil neu
   */
  async restartDevice(instanceId: string): Promise<DriverOperationResult> {
    try {
      const { stdout } = await execAsync(`pnputil /restart-device "${instanceId}"`, { timeout: 15000 })
      return {
        success: true,
        message: stdout.trim() || 'Gerät wurde erfolgreich neu gestartet.'
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Geräte-Neustart fehlgeschlagen: ${err.message || 'Zugriff verweigert oder ungültige Instanz-ID'}`
      }
    }
  }

  /**
   * Erkennt die verbaute GPU, Treiberversion, Datum und prüft auf Aktualität
   */
  async getGpuInfo(): Promise<GpuInfo | null> {
    try {
      const psCommand = `Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, @{Name='DriverDateStr';Expression={$_.DriverDate.ToString('yyyy-MM-dd')}} | ConvertTo-Json -Compress`
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCommand}"`, { timeout: 10000 })
      if (!stdout || !stdout.trim()) return null

      let data: any
      try {
        data = JSON.parse(stdout.trim())
      } catch {
        return null
      }

      const rawGpu = Array.isArray(data)
        ? (data.find((g: any) => /nvidia|amd|radeon|geforce|quadro/i.test(g.Name)) || data[0])
        : data

      if (!rawGpu || !rawGpu.Name) return null

      const name = String(rawGpu.Name || '').trim()
      const driverVersion = String(rawGpu.DriverVersion || '').trim()
      const driverDate = String(rawGpu.DriverDateStr || '').trim()

      const nameLower = name.toLowerCase()
      let vendor: GpuVendor = 'other'
      let vendorDownloadUrl = `https://www.catalog.update.microsoft.com/Search.aspx?q=${encodeURIComponent(name)}`
      let vendorToolName = 'Microsoft Update-Katalog'

      if (nameLower.includes('nvidia') || nameLower.includes('geforce') || nameLower.includes('quadro')) {
        vendor = 'nvidia'
        vendorDownloadUrl = 'https://www.nvidia.com/Download/index.aspx'
        vendorToolName = 'NVIDIA Treiber-Portal & NVIDIA App'
      } else if (nameLower.includes('amd') || nameLower.includes('radeon')) {
        vendor = 'amd'
        vendorDownloadUrl = 'https://www.amd.com/en/support'
        vendorToolName = 'AMD Software: Adrenalin Edition'
      } else if (
        nameLower.includes('intel') ||
        nameLower.includes('arc') ||
        nameLower.includes('iris') ||
        nameLower.includes('uhd')
      ) {
        vendor = 'intel'
        vendorDownloadUrl = 'https://www.intel.com/content/www/us/en/support/detect.html'
        vendorToolName = 'Intel Driver & Support Assistant'
      }

      let ageYears = 0
      let isOutdated = false
      if (driverDate) {
        const parts = driverDate.split('-')
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10)
          const currentYear = new Date().getFullYear()
          ageYears = Math.max(0, currentYear - year)
          if (ageYears >= 1) {
            isOutdated = true
          }
        }
      }

      return {
        name,
        driverVersion,
        driverDate,
        vendor,
        isOutdated,
        ageYears,
        vendorDownloadUrl,
        vendorToolName
      }
    } catch (err) {
      console.error('[DriverService] Fehler beim Auslesen der GPU-Info:', err)
      return null
    }
  }

  /**
   * Sucht nach anstehenden Treiber-Updates über die Microsoft Windows Update API
   */
  async checkWindowsUpdateDrivers(): Promise<WindowsUpdateDriver[]> {
    try {
      const psCmd = `$session = New-Object -ComObject Microsoft.Update.Session; $searcher = $session.CreateUpdateSearcher(); $res = $searcher.Search("IsInstalled=0 and Type=''Driver''"); $updates = @(); foreach ($item in $res.Updates) { $updates += @{ title = $item.Title; description = $item.Description } }; $updates | ConvertTo-Json -Compress`
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 45000 })
      if (!stdout || !stdout.trim()) return []

      const parsed = JSON.parse(stdout.trim())
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          title: item.title || 'Unbekanntes Treiber-Update',
          description: item.description || ''
        }))
      } else if (parsed && parsed.title) {
        return [
          {
            title: parsed.title,
            description: parsed.description || ''
          }
        ]
      }
      return []
    } catch (err) {
      console.warn('[DriverService] Fehler oder Timeout bei Windows Update Treiber-Suche:', err)
      return []
    }
  }

  /**
   * Erzeugt die Such-URL für den Microsoft Update-Katalog
   */
  getDriverSearchUrl(query: string): string {
    return `https://www.catalog.update.microsoft.com/Search.aspx?q=${encodeURIComponent(query)}`
  }
}

export const driverService = new DriverService()


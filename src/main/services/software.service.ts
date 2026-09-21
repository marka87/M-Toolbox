import { PowerShellService } from './powershell.service'
import type {
  SoftwarePackage,
  InstalledPackage,
  PackageUpdate,
  OperationLogEvent,
  SoftwareCategory
} from '../../shared/types'

interface CuratedPackageDef {
  id: string
  name: string
  description: string
  category: SoftwareCategory
  publisher?: string
}

const CURATED_PACKAGES: CuratedPackageDef[] = [
  // Browser
  {
    id: 'Google.Chrome',
    name: 'Google Chrome',
    description: 'Schneller, sicherer und weit verbreiteter Webbrowser von Google.',
    category: 'browser',
    publisher: 'Google LLC'
  },
  {
    id: 'Mozilla.Firefox',
    name: 'Mozilla Firefox',
    description: 'Freier, datenschutzorientierter Webbrowser mit hoher Anpassbarkeit.',
    category: 'browser',
    publisher: 'Mozilla'
  },
  {
    id: 'Brave.Brave',
    name: 'Brave Browser',
    description: 'Privatsphäre-fokussierter Browser mit integriertem Ad- & Tracker-Blocker.',
    category: 'browser',
    publisher: 'Brave Software'
  },
  {
    id: 'Microsoft.Edge',
    name: 'Microsoft Edge',
    description: 'Windows 11 Standard-Browser auf Chromium-Basis mit tiefer Integration.',
    category: 'browser',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Opera.Opera',
    name: 'Opera Browser',
    description: 'Feature-reicher Browser mit integriertem VPN, Messengern und KI-Assistenten.',
    category: 'browser',
    publisher: 'Opera'
  },
  {
    id: 'Opera.OperaGX',
    name: 'Opera GX',
    description: 'Spezialisierter Gaming-Browser mit CPU-, RAM- und Netzwerk-Limitern.',
    category: 'browser',
    publisher: 'Opera'
  },
  {
    id: 'Vivaldi.Vivaldi',
    name: 'Vivaldi Browser',
    description: 'Extrem anpassbarer Browser mit Tab-Stacking, Notizen und Mail-Client.',
    category: 'browser',
    publisher: 'Vivaldi Technologies'
  },
  {
    id: 'LibreWolf.LibreWolf',
    name: 'LibreWolf',
    description: 'Fokussiert auf Privatsphäre und Sicherheit, befreit von Telemetrie.',
    category: 'browser',
    publisher: 'LibreWolf Community'
  },
  {
    id: 'TorProject.TorBrowser',
    name: 'Tor Browser',
    description: 'Anonymes Surfen über das dezentrale Onion-Routing-Netzwerk.',
    category: 'browser',
    publisher: 'The Tor Project'
  },

  // Developer Tools
  {
    id: 'Microsoft.VisualStudioCode',
    name: 'Visual Studio Code',
    description: 'Mächtiger, erweiterbarer Code-Editor für nahezu alle Programmiersprachen.',
    category: 'dev',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Git.Git',
    name: 'Git for Windows',
    description: 'Versionsverwaltungssystem inklusive Git Bash und GUI-Integration.',
    category: 'dev',
    publisher: 'The Git Development Community'
  },
  {
    id: 'OpenJS.NodeJS.LTS',
    name: 'Node.js (LTS)',
    description: 'JavaScript-Laufzeitumgebung auf V8-Basis für Server- und Tool-Entwicklung.',
    category: 'dev',
    publisher: 'OpenJS Foundation'
  },
  {
    id: 'Python.Python.3.12',
    name: 'Python 3.12',
    description: 'Moderne, universelle Programmiersprache für Skripte, KI und Web-Apps.',
    category: 'dev',
    publisher: 'Python Software Foundation'
  },
  {
    id: 'Microsoft.WindowsTerminal',
    name: 'Windows Terminal',
    description: 'Moderne Tab-Terminal-Anwendung für PowerShell, CMD und WSL.',
    category: 'dev',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Notepad++.Notepad++',
    name: 'Notepad++',
    description: 'Extrem schneller Text- und Quellcode-Editor mit Syntax-Highlighting.',
    category: 'dev',
    publisher: 'Don HO'
  },
  {
    id: 'Docker.DockerDesktop',
    name: 'Docker Desktop',
    description: 'Container-Plattform zum Erstellen, Teilen und Ausführen von Anwendungen.',
    category: 'dev',
    publisher: 'Docker Inc.'
  },
  {
    id: 'Postman.Postman',
    name: 'Postman',
    description: 'Umfassende Entwicklungs- und Test-Plattform für REST- und GraphQL-APIs.',
    category: 'dev',
    publisher: 'Postman Inc.'
  },
  {
    id: 'Neovim.Neovim',
    name: 'Neovim',
    description: 'Hypereffizienter, erweiterbarer modal-basierter Texteditor.',
    category: 'dev',
    publisher: 'Neovim'
  },
  {
    id: 'Rustlang.Rustup',
    name: 'Rust (Rustup)',
    description: 'Offizieller Installer und Versionsverwalter für die Programmiersprache Rust.',
    category: 'dev',
    publisher: 'Rust Foundation'
  },
  {
    id: 'GoLang.Go',
    name: 'Go Programming Language',
    description: 'Einfache, schnelle und zuverlässige Programmiersprache von Google.',
    category: 'dev',
    publisher: 'Google LLC'
  },

  // Utilities
  {
    id: '7zip.7zip',
    name: '7-Zip',
    description: 'Leistungsfähiges, kostenloses Packprogramm mit hoher Kompressionsrate.',
    category: 'utilities',
    publisher: 'Igor Pavlov'
  },
  {
    id: 'M2Team.NanaZip',
    name: 'NanaZip',
    description: 'Modernes 7-Zip-Derivat mit nativem Windows 11 Kontextmenü.',
    category: 'utilities',
    publisher: 'M2-Team'
  },
  {
    id: 'Microsoft.PowerToys',
    name: 'Microsoft PowerToys',
    description: 'Offizielle System-Tweaks für Produktivität (FancyZones, ColorPicker, Run).',
    category: 'utilities',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'voidtools.Everything',
    name: 'Everything',
    description: 'Blitzschnelle Datei- und Ordnersuche für Windows über NTFS-Index.',
    category: 'utilities',
    publisher: 'voidtools'
  },
  {
    id: 'AntibodySoftware.WizTree',
    name: 'WizTree',
    description: 'Ultraschneller Speicherplatz-Finder über MFT-Dateisystemscan.',
    category: 'utilities',
    publisher: 'Antibody Software'
  },
  {
    id: 'JAMSoftware.TreeSize.Free',
    name: 'TreeSize Free',
    description: 'Speicherplatz-Manager zur grafischen Analyse von Festplattenbelegung.',
    category: 'utilities',
    publisher: 'JAM Software'
  },
  {
    id: 'RevoUninstaller.RevoUninstaller',
    name: 'Revo Uninstaller',
    description: 'Saubere Deinstallation inklusive Beseitigung von Registry- & Datei-Überresten.',
    category: 'utilities',
    publisher: 'VS REVO GROUP'
  },
  {
    id: 'Klocman.BulkCrapUninstaller',
    name: 'Bulk Crap Uninstaller',
    description: 'Mächtiges Open-Source-Tool zum schnellen Batch-Deinstallieren von Programmen.',
    category: 'utilities',
    publisher: 'Klocman Software'
  },
  {
    id: 'BleachBit.BleachBit',
    name: 'BleachBit',
    description: 'Open-Source Systembereiniger, löscht unnötige Caches und schützt Privatsphäre.',
    category: 'utilities',
    publisher: 'Andrew Ziem'
  },
  {
    id: 'CrystalDewWorld.CrystalDiskInfo',
    name: 'CrystalDiskInfo',
    description: 'S.M.A.R.T.-Festplatten- und SSD-Zustandsüberwachung mit Temperaturanzeige.',
    category: 'utilities',
    publisher: 'Crystal Dew World'
  },
  {
    id: 'CrystalDewWorld.CrystalDiskMark',
    name: 'CrystalDiskMark',
    description: 'Standard-Benchmark für Lese- und Schreibgeschwindigkeiten von Speichermedien.',
    category: 'utilities',
    publisher: 'Crystal Dew World'
  },
  {
    id: 'CPUID.CPU-Z',
    name: 'CPU-Z',
    description: 'Detaillierte Hardware-Erkennung für Prozessor, Mainboard, RAM und SPD.',
    category: 'utilities',
    publisher: 'CPUID'
  },
  {
    id: 'TechPowerUp.GPU-Z',
    name: 'GPU-Z',
    description: 'Präzises Diagnose- und Sensor-Tool für Grafikkarten aller Hersteller.',
    category: 'utilities',
    publisher: 'TechPowerUp'
  },
  {
    id: 'Rufus.Rufus',
    name: 'Rufus',
    description: 'Erstellt im Handumdrehen bootfähige USB-Sticks (Windows, Linux, UEFI).',
    category: 'utilities',
    publisher: 'Pete Batard'
  },
  {
    id: 'Balena.Etcher',
    name: 'balenaEtcher',
    description: 'Sicheres Flashen von OS-Images auf SD-Karten und USB-Laufwerke.',
    category: 'utilities',
    publisher: 'Balena'
  },
  {
    id: 'AutoHotkey.AutoHotkey',
    name: 'AutoHotkey',
    description: 'Leistungsfähige Skriptsprache für Windows-Automatisierung und Hotkeys.',
    category: 'utilities',
    publisher: 'AutoHotkey'
  },
  {
    id: 'ShareX.ShareX',
    name: 'ShareX',
    description: 'Erweiterte Bildschirmaufnahme, OCR-Texterkennung und Workflow-Tool.',
    category: 'utilities',
    publisher: 'ShareX Team'
  },

  // Media
  {
    id: 'VideoLAN.VLC',
    name: 'VLC Media Player',
    description: 'Allround-Mediaplayer, spielt nahezu jedes Audio- und Video-Format ab.',
    category: 'media',
    publisher: 'VideoLAN'
  },
  {
    id: 'Spotify.Spotify',
    name: 'Spotify',
    description: 'Musik- und Podcast-Streamingdienst für Desktop.',
    category: 'media',
    publisher: 'Spotify AB'
  },
  {
    id: 'OBSProject.OBSStudio',
    name: 'OBS Studio',
    description: 'Software für Videoaufnahme, Bildschirmübertragung und Live-Streaming.',
    category: 'media',
    publisher: 'OBS Project'
  },
  {
    id: 'GIMP.GIMP',
    name: 'GIMP',
    description: 'Professionelles Open-Source-Bildbearbeitungsprogramm.',
    category: 'media',
    publisher: 'The GIMP Team'
  },
  {
    id: 'dotPDN.PaintDotNet',
    name: 'Paint.NET',
    description: 'Schnelle, benutzerfreundliche Bild- und Fotobearbeitung mit Ebenen.',
    category: 'media',
    publisher: 'dotPDN LLC'
  },
  {
    id: 'Audacity.Audacity',
    name: 'Audacity',
    description: 'Mehrspur-Audioeditor und Aufnahme-Werkzeug.',
    category: 'media',
    publisher: 'Audacity Team'
  },
  {
    id: 'HandBrake.HandBrake',
    name: 'HandBrake',
    description: 'Konverter zum Umwandeln von Videos in moderne Formate und Codecs.',
    category: 'media',
    publisher: 'The HandBrake Team'
  },
  {
    id: 'CodecGuide.K-LiteCodecPack.Full',
    name: 'K-Lite Codec Pack Full',
    description: 'Komplettes Paket von Audio- und Video-Codecs inklusive MPC-HC Player.',
    category: 'media',
    publisher: 'Codec Guide'
  },

  // Communication
  {
    id: 'Discord.Discord',
    name: 'Discord',
    description: 'Sprach-, Video- und Text-Kommunikationsplattform für Communities & Gaming.',
    category: 'communication',
    publisher: 'Discord Inc.'
  },
  {
    id: 'Telegram.TelegramDesktop',
    name: 'Telegram Desktop',
    description: 'Schneller, sicherer und cloudbasierter Instant-Messenger.',
    category: 'communication',
    publisher: 'Telegram FZ-LLC'
  },
  {
    id: 'WhatsApp.WhatsApp',
    name: 'WhatsApp Desktop',
    description: 'Offizielle WhatsApp Desktop-Anwendung für Windows.',
    category: 'communication',
    publisher: 'Meta / WhatsApp LLC'
  },
  {
    id: 'OpenWhisperSystems.Signal',
    name: 'Signal',
    description: 'Ende-zu-Ende verschlüsselter Messenger mit Fokus auf Datenschutz.',
    category: 'communication',
    publisher: 'Signal Messenger LLC'
  },
  {
    id: 'SlackTechnologies.Slack',
    name: 'Slack',
    description: 'Kollaborationsplattform für Teams und Arbeitsgruppen.',
    category: 'communication',
    publisher: 'Slack Technologies'
  },
  {
    id: 'Zoom.Zoom',
    name: 'Zoom Workplace',
    description: 'Videokonferenz- und Chat-Anwendung für Online-Meetings.',
    category: 'communication',
    publisher: 'Zoom Video Communications'
  },

  // Gaming
  {
    id: 'Valve.Steam',
    name: 'Steam',
    description: 'Digitale Vertriebs- und Community-Plattform für PC-Spiele.',
    category: 'gaming',
    publisher: 'Valve Corporation'
  },
  {
    id: 'EpicGames.EpicGamesLauncher',
    name: 'Epic Games Launcher',
    description: 'Launcher für Epic Games Titel wie Fortnite und die Unreal Engine.',
    category: 'gaming',
    publisher: 'Epic Games Inc.'
  },
  {
    id: 'GOG.Galaxy',
    name: 'GOG GALAXY',
    description: 'DRM-freie Spieleplattform und universaler Spielebibliotheks-Verwalter.',
    category: 'gaming',
    publisher: 'GOG.com'
  },
  {
    id: 'ElectronicArts.EADesktop',
    name: 'EA App',
    description: 'Offizielle Plattform für Spiele von Electronic Arts.',
    category: 'gaming',
    publisher: 'Electronic Arts'
  },
  {
    id: 'Ubisoft.Connect',
    name: 'Ubisoft Connect',
    description: 'Spielebibliothek und Launcher für Ubisoft-Titel.',
    category: 'gaming',
    publisher: 'Ubisoft'
  },
  {
    id: 'PrismLauncher.PrismLauncher',
    name: 'Prism Launcher',
    description: 'Schneller, moderner Open-Source-Launcher für Minecraft mit Mod-Support.',
    category: 'gaming',
    publisher: 'Prism Launcher Community'
  },

  // Runtimes
  {
    id: 'Microsoft.VCRedist.2015+.x64',
    name: 'Visual C++ 2015-2022 (x64)',
    description: 'Laufzeitkomponenten für unzählige Windows-Anwendungen und Spiele.',
    category: 'runtimes',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Microsoft.VCRedist.2015+.x86',
    name: 'Visual C++ 2015-2022 (x86)',
    description: '32-Bit Laufzeitkomponenten für ältere Windows-Software.',
    category: 'runtimes',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Microsoft.DotNet.DesktopRuntime.8',
    name: '.NET Desktop Runtime 8',
    description: 'Offizielle Microsoft .NET 8 Laufzeitumgebung für Desktop-Anwendungen.',
    category: 'runtimes',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Microsoft.DirectX',
    name: 'DirectX End-User Runtimes',
    description: 'Legacy DirectX-Bibliotheken für optimale Kompatibilität älterer Spiele.',
    category: 'runtimes',
    publisher: 'Microsoft Corporation'
  }
]

export class SoftwareService {
  private static instance: SoftwareService
  private ps: PowerShellService

  private constructor() {
    this.ps = PowerShellService.getInstance()
  }

  public static getInstance(): SoftwareService {
    if (!SoftwareService.instance) {
      SoftwareService.instance = new SoftwareService()
    }
    return SoftwareService.instance
  }

  /**
   * Parses standard winget table output (fixed column layout)
   */
  private parseWingetTable(output: string): Array<Record<string, string>> {
    // Strip ANSI escape codes
    const cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    const lines = cleanOutput.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    // Locate separator line containing dashes (e.g. '---------------------  -------')
    let sepIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^[-]{3,}/.test(lines[i])) {
        sepIndex = i
        break
      }
    }

    if (sepIndex <= 0) return []

    const headerLine = lines[sepIndex - 1]
    const separatorLine = lines[sepIndex]

    // In winget CLI, column headers are separated by 2 or more spaces
    // e.g. "Name                                                         ID                                                    Version            Quelle"
    const colRegex = /\S+(?:\s(?!\s)\S+)*/g
    const headerMatches = [...headerLine.matchAll(colRegex)]
    if (headerMatches.length === 0) return []

    const cols: Array<{ name: string; start: number; end: number }> = []
    for (let i = 0; i < headerMatches.length; i++) {
      const current = headerMatches[i]
      const start = current.index!
      const end = i < headerMatches.length - 1 ? headerMatches[i + 1].index! : Math.max(separatorLine.length, headerLine.length, 500)
      cols.push({
        name: current[0].trim().toLowerCase(),
        start,
        end
      })
    }

    const rows: Array<Record<string, string>> = []

    for (let i = sepIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || line.startsWith('-') || /^\d+\s+Aktualisierung/i.test(line) || /^\d+\s+update/i.test(line)) {
        continue
      }

      const row: Record<string, string> = {}
      for (const col of cols) {
        const val = line.substring(col.start, Math.min(col.end, line.length)).trim()
        row[col.name] = val
      }
      rows.push(row)
    }

    return rows
  }

  /**
   * Retrieves installed packages via winget list
   */
  public async getInstalledPackages(): Promise<InstalledPackage[]> {
    try {
      const res = await this.ps.executeCommand('winget list --accept-source-agreements', 60000)
      const rows = this.parseWingetTable(res.stdout)

      return rows.map((r) => {
        // Look up common header names in English / German
        const name = r['name'] || Object.values(r)[0] || 'Unbekannt'
        const id = r['id'] || Object.values(r)[1] || ''
        const version = r['version'] || Object.values(r)[2] || ''
        const available = r['verfügbar'] || r['available'] || ''
        const source = r['quelle'] || r['source'] || ''

        return {
          id: id || name,
          name,
          version,
          availableVersion: available || undefined,
          source: source || undefined
        }
      }).filter((pkg) => pkg.id.length > 0)
    } catch (err) {
      console.error('[SoftwareService] getInstalledPackages error:', err)
      return []
    }
  }

  /**
   * Retrieves available package updates via winget upgrade
   */
  public async getAvailableUpdates(): Promise<PackageUpdate[]> {
    try {
      const res = await this.ps.executeCommand('winget upgrade --include-unknown --accept-source-agreements', 60000)
      const rows = this.parseWingetTable(res.stdout)

      return rows
        .map((r) => {
          const name = r['name'] || Object.values(r)[0] || ''
          const id = r['id'] || Object.values(r)[1] || ''
          const currentVersion = r['version'] || Object.values(r)[2] || ''
          const availableVersion = r['verfügbar'] || r['available'] || Object.values(r)[3] || ''
          const source = r['quelle'] || r['source'] || ''

          return {
            id,
            name,
            currentVersion,
            availableVersion,
            source: source || undefined
          }
        })
        .filter((pkg) => pkg.id.length > 0 && pkg.availableVersion && pkg.availableVersion !== pkg.currentVersion)
    } catch (err) {
      console.error('[SoftwareService] getAvailableUpdates error:', err)
      return []
    }
  }

  /**
   * Combines curated catalog with installed packages and available updates
   */
  public async getCatalog(): Promise<SoftwarePackage[]> {
    const [installedList, updatesList] = await Promise.all([
      this.getInstalledPackages(),
      this.getAvailableUpdates()
    ])

    const installedMap = new Map<string, InstalledPackage>()
    for (const item of installedList) {
      installedMap.set(item.id.toLowerCase(), item)
    }

    const updatesMap = new Map<string, PackageUpdate>()
    for (const item of updatesList) {
      updatesMap.set(item.id.toLowerCase(), item)
    }

    return CURATED_PACKAGES.map((cPkg) => {
      const lowerId = cPkg.id.toLowerCase()
      const installed = installedMap.get(lowerId)
      const update = updatesMap.get(lowerId)

      let status: SoftwarePackage['status'] = 'not_installed'
      let installedVersion: string | undefined
      let latestVersion: string | undefined

      if (installed) {
        installedVersion = installed.version
        if (update) {
          status = 'update_available'
          latestVersion = update.availableVersion
        } else {
          status = 'installed'
          latestVersion = installed.version
        }
      }

      return {
        id: cPkg.id,
        name: cPkg.name,
        description: cPkg.description,
        category: cPkg.category,
        publisher: cPkg.publisher,
        installedVersion,
        latestVersion,
        status
      }
    })
  }

  /**
   * Installs a single winget package with real-time log streaming
   */
  public async installPackage(
    packageId: string,
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const command = `winget install --id "${packageId}" --silent --accept-package-agreements --accept-source-agreements`
      onProgress({ type: 'info', line: `> Starte Installation: ${packageId}...`, packageId })

      this.ps.streamCommand(
        command,
        (data) => onProgress({ type: 'stdout', line: data, packageId }),
        (data) => onProgress({ type: 'stderr', line: data, packageId }),
        (code) => {
          const success = code === 0
          onProgress({
            type: 'exit',
            line: success ? `Installation von ${packageId} erfolgreich abgeschlossen.` : `Installation von ${packageId} beendet mit Code ${code}.`,
            packageId,
            exitCode: code ?? undefined
          })
          resolve({ success, error: success ? undefined : `Installation fehlgeschlagen mit Exit-Code ${code}` })
        }
      )
    })
  }

  /**
   * Uninstalls a package with real-time log streaming
   */
  public async uninstallPackage(
    packageId: string,
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const cleanId = packageId.trim()
      const isExactWingetId = !cleanId.startsWith('ARP\\') && !cleanId.startsWith('MSIX\\') && !cleanId.includes('\\')
      const exactFlag = isExactWingetId ? '-e ' : ''
      const command = `winget uninstall --id "${cleanId}" ${exactFlag}--silent --accept-source-agreements --nowarn --disable-interactivity`
      onProgress({ type: 'info', line: `> Starte Deinstallation: ${cleanId}...`, packageId: cleanId })

      this.ps.streamCommand(
        command,
        (data) => onProgress({ type: 'stdout', line: data, packageId: cleanId }),
        (data) => onProgress({ type: 'stderr', line: data, packageId: cleanId }),
        (code) => {
          const success = code === 0
          onProgress({
            type: 'exit',
            line: success ? `Deinstallation von ${cleanId} erfolgreich abgeschlossen.` : `Deinstallation beendet mit Code ${code}.`,
            packageId: cleanId,
            exitCode: code ?? undefined
          })
          resolve({ success, error: success ? undefined : `Deinstallation fehlgeschlagen mit Exit-Code ${code}` })
        }
      )
    })
  }

  /**
   * Upgrades a single package with real-time log streaming
   */
  public async upgradePackage(
    packageId: string,
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const command = `winget upgrade --id "${packageId}" --silent --accept-package-agreements --accept-source-agreements`
      onProgress({ type: 'info', line: `> Starte Aktualisierung von ${packageId}...`, packageId })

      this.ps.streamCommand(
        command,
        (data) => onProgress({ type: 'stdout', line: data, packageId }),
        (data) => onProgress({ type: 'stderr', line: data, packageId }),
        (code) => {
          const success = code === 0
          onProgress({
            type: 'exit',
            line: success ? `Aktualisierung von ${packageId} erfolgreich abgeschlossen.` : `Aktualisierung beendet mit Code ${code}.`,
            packageId,
            exitCode: code ?? undefined
          })
          resolve({ success, error: success ? undefined : `Aktualisierung fehlgeschlagen mit Exit-Code ${code}` })
        }
      )
    })
  }

  /**
   * Upgrades all packages with real-time log streaming
   */
  public async upgradeAll(
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const command = `winget upgrade --all --silent --accept-package-agreements --accept-source-agreements`
      onProgress({ type: 'info', line: '> Starte Aktualisierung aller verfügbaren Pakete...' })

      this.ps.streamCommand(
        command,
        (data) => onProgress({ type: 'stdout', line: data }),
        (data) => onProgress({ type: 'stderr', line: data }),
        (code) => {
          const success = code === 0
          onProgress({
            type: 'exit',
            line: success ? 'Alle Pakete wurden erfolgreich aktualisiert.' : `Aktualisierungsprozess beendet mit Code ${code}.`,
            exitCode: code ?? undefined
          })
          resolve({ success, error: success ? undefined : `Upgrade All beendet mit Exit-Code ${code}` })
        }
      )
    })
  }
}


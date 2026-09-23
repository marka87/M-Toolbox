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
  {
    id: 'WinSCP.WinSCP',
    name: 'WinSCP',
    description: 'Sicherer Dateiübertragungs-Client für SFTP, SCP, FTP und WebDAV.',
    category: 'utilities',
    publisher: 'Martin Prikryl'
  },
  {
    id: 'JanDeDobbeleer.OhMyPosh',
    name: 'Oh My Posh',
    description: 'Anpassbare Prompt-Engine für PowerShell, Windows Terminal und weitere Shells.',
    category: 'utilities',
    publisher: 'Jan De Dobbeleer'
  },
  {
    id: 'Microsoft.Sysinternals.Autoruns',
    name: 'Autoruns',
    description: 'Zeigt detailliert, welche Programme und Dienste beim Windows-Start geladen werden.',
    category: 'utilities',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Microsoft.Sysinternals.ProcessExplorer',
    name: 'Process Explorer',
    description: 'Erweiterte Prozess- und Handle-Analyse als leistungsfähige Task-Manager-Alternative.',
    category: 'utilities',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Microsoft.Sysinternals.ProcessMonitor',
    name: 'Process Monitor',
    description: 'Überwacht Datei-, Registry- und Prozesszugriffe in Echtzeit.',
    category: 'utilities',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'FilesCommunity.Files',
    name: 'Files',
    description: 'Moderner Open-Source-Dateimanager mit Tabs und Windows-11-Integration.',
    category: 'utilities',
    publisher: 'Files Community'
  },
  {
    id: 'voidtools.Everything.Lite',
    name: 'Everything Lite',
    description: 'Schlanke Variante der extrem schnellen Dateisuche für Windows.',
    category: 'utilities',
    publisher: 'voidtools'
  },
  {
    id: 'qBittorrent.qBittorrent',
    name: 'qBittorrent',
    description: 'Leistungsfähiger Open-Source-BitTorrent-Client ohne Werbeeinblendungen.',
    category: 'utilities',
    publisher: 'The qBittorrent Project'
  },
  {
    id: 'gerardog.gsudo',
    name: 'gsudo',
    description: 'Sudo-ähnliches Kommandozeilenwerkzeug für erhöhte Windows-Prozesse.',
    category: 'utilities',
    publisher: 'gerardog'
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
  {
    id: 'Daum.PotPlayer',
    name: 'PotPlayer',
    description: 'Flexibler Media-Player mit umfangreicher Format- und Codec-Unterstützung.',
    category: 'media',
    publisher: 'Daum Communications'
  },
  {
    id: 'KDE.Kdenlive',
    name: 'Kdenlive',
    description: 'Leistungsfähiger Open-Source-Videoeditor für mehrspurige Projekte.',
    category: 'media',
    publisher: 'KDE'
  },
  {
    id: 'BlenderFoundation.Blender',
    name: 'Blender',
    description: '3D-Suite für Modellierung, Animation, Rendering und Videobearbeitung.',
    category: 'media',
    publisher: 'Blender Foundation'
  },
  {
    id: 'Inkscape.Inkscape',
    name: 'Inkscape',
    description: 'Vektorgrafik-Editor für Illustrationen, Logos und technische Zeichnungen.',
    category: 'media',
    publisher: 'Inkscape Project'
  },
  {
    id: 'Microsoft.WindowsCamera',
    name: 'Windows Kamera',
    description: 'Microsoft-Kameraanwendung für Webcam-Aufnahmen und Videoanrufe.',
    category: 'media',
    publisher: 'Microsoft Corporation'
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
  {
    id: 'Microsoft.Teams',
    name: 'Microsoft Teams',
    description: 'Arbeitsbereich für Chat, Besprechungen, Dateien und Teamzusammenarbeit.',
    category: 'communication',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Mozilla.Thunderbird',
    name: 'Mozilla Thunderbird',
    description: 'Freier E-Mail-Client mit Kalender, Kontakten und Erweiterungssystem.',
    category: 'communication',
    publisher: 'Mozilla'
  },
  {
    id: 'Element.Element',
    name: 'Element',
    description: 'Sicherer, Matrix-basierter Messenger für Chats, Anrufe und Zusammenarbeit.',
    category: 'communication',
    publisher: 'Element'
  },
  {
    id: 'TeamSpeakSystems.TeamSpeakClient',
    name: 'TeamSpeak Client',
    description: 'Sprachkommunikation mit geringer Latenz für Teams und Gaming.',
    category: 'communication',
    publisher: 'TeamSpeak Systems'
  },
  {
    id: 'Mumble.Mumble',
    name: 'Mumble',
    description: 'Open-Source-Sprachchat mit niedriger Latenz und eigener Serververwaltung.',
    category: 'communication',
    publisher: 'The Mumble Team'
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
    id: 'PrismLauncher.PrismLauncher',
    name: 'Prism Launcher',
    description: 'Schneller, moderner Open-Source-Launcher für Minecraft mit Mod-Support.',
    category: 'gaming',
    publisher: 'Prism Launcher Community'
  },
  {
    id: 'Ubisoft.Connect',
    name: 'Ubisoft Connect',
    description: 'Spielebibliothek und Launcher für Ubisoft-Titel.',
    category: 'gaming',
    publisher: 'Ubisoft'
  },
  {
    id: 'Microsoft.XboxApp',
    name: 'Xbox App',
    description: 'Xbox-Spielebibliothek, PC Game Pass und soziale Funktionen für Windows.',
    category: 'gaming',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Nvidia.GeForceExperience',
    name: 'NVIDIA App',
    description: 'Verwaltet NVIDIA-Treiber, Spieleprofile und Grafikkartenfunktionen.',
    category: 'gaming',
    publisher: 'NVIDIA Corporation'
  },
  {
    id: 'Overwolf.CurseForge',
    name: 'CurseForge',
    description: 'Verwaltung von Mods und Add-ons für beliebte PC-Spiele.',
    category: 'gaming',
    publisher: 'Overwolf'
  },
  {
    id: 'LizardByte.Sunshine',
    name: 'Sunshine',
    description: 'Host-Anwendung für latenzarmes Game-Streaming im lokalen Netzwerk.',
    category: 'gaming',
    publisher: 'LizardByte'
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
  },
  {
    id: 'OpenJS.NodeJS',
    name: 'Node.js (Current)',
    description: 'Aktuelle Node.js-Laufzeit für JavaScript-Anwendungen und Werkzeuge.',
    category: 'runtimes',
    publisher: 'OpenJS Foundation'
  },
  {
    id: 'Python.Python.3.13',
    name: 'Python 3.13',
    description: 'Aktuelle Python-Laufzeit für Automatisierung, Datenverarbeitung und Entwicklung.',
    category: 'runtimes',
    publisher: 'Python Software Foundation'
  },
  {
    id: 'Microsoft.DotNet.Runtime.8',
    name: '.NET Runtime 8',
    description: 'Microsoft-Laufzeit für moderne .NET-Anwendungen ohne Desktop-Framework.',
    category: 'runtimes',
    publisher: 'Microsoft Corporation'
  },
  {
    id: 'Oracle.JavaRuntimeEnvironment',
    name: 'Java Runtime Environment',
    description: 'Java-Laufzeitumgebung für Anwendungen, Tools und ältere Spiele.',
    category: 'runtimes',
    publisher: 'Oracle'
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
    // Split on \r and \n so carriage returns from CLI spinners are separated
    const lines = cleanOutput.split(/[\r\n]+/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    // Locate separator line containing dashes (e.g. '---------------------  -------')
    let sepIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^[-]{3,}/.test(lines[i].trim())) {
        sepIndex = i
        break
      }
    }

    if (sepIndex <= 0) return []

    const headerLine = lines[sepIndex - 1]
    const headerRegex = /\b(name|id|version|available|verfügbar|source|quelle)\b/gi
    const headerMatches = [...headerLine.matchAll(headerRegex)]
    if (headerMatches.length === 0) return []

    const cols: Array<{ name: string; start: number; end: number }> = []
    for (let i = 0; i < headerMatches.length; i++) {
      const current = headerMatches[i]
      const start = current.index!
      const end = i < headerMatches.length - 1 ? headerMatches[i + 1].index! : 1000
      cols.push({
        name: current[0].trim().toLowerCase(),
        start,
        end
      })
    }

    const rows: Array<Record<string, string>> = []

    for (let i = sepIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (
        !line ||
        /^[-]{3,}/.test(line.trim()) ||
        /^\s*\d+\s*(upgrades?|aktualisierung)/i.test(line) ||
        /available\.\s*$/i.test(line)
      ) {
        continue
      }

      const row: Record<string, string> = {}
      for (const col of cols) {
        row[col.name] = line.substring(col.start, Math.min(col.end, line.length)).trim()
      }
      rows.push(row)
    }

    return rows
  }

  /**
   * Retrieves installed packages via winget list
   */
  public async getInstalledPackages(source?: string): Promise<InstalledPackage[]> {
    try {
      const sourceArgument = source ? ` --source ${source}` : ''
      const res = await this.ps.executeCommand(`winget list${sourceArgument} --accept-source-agreements`, 60000)
      const rows = this.parseWingetTable(res.stdout)

      const ignoredId = /(windowsappruntime|vclibs|dotnet|netcore|windowsdesktop|vcredist|xnaredist|redist|runtime|webview2|appinstaller|desktopappinstaller)/i
      const ignoredName = /^(m-toolbox\b|.*(runtime|framework|redistributable|redist|webview|app installer))/i

      const unique = new Map<string, InstalledPackage>()
      for (const r of rows) {
        const name = r['name'] || Object.values(r)[0] || 'Unbekannt'
        const id = r['id'] || Object.values(r)[1] || ''
        if (!id || id.toLowerCase() === name.toLowerCase()) continue
        const key = id.toLowerCase()
        if (unique.has(key) || ignoredId.test(key) || ignoredName.test(name)) continue
        unique.set(key, {
          id,
          name,
          version: r['version'] || Object.values(r)[2] || '',
          availableVersion: r['available'] || r['verfügbar'] || undefined,
          source: r['source'] || r['quelle'] || undefined
        })
      }
      return [...unique.values()]
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
          const availableVersion = r['available'] || r['verfügbar'] || Object.values(r)[3] || ''
          const source = r['source'] || r['quelle'] || ''

          return {
            id,
            name,
            currentVersion,
            availableVersion,
            source: source || undefined
          }
        })
        .filter(
          (pkg) =>
            pkg.id.length > 0 &&
            Boolean(pkg.availableVersion) &&
            pkg.availableVersion !== pkg.currentVersion &&
            !/upgrades?\s+avail/i.test(pkg.name)
        )
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

  private streamWinget(
    command: string,
    packageId: string | undefined,
    onProgress: (event: OperationLogEvent) => void,
    resolve: (res: { success: boolean; error?: string }) => void,
    successMsg: string,
    failMsg: string
  ): void {
    const emitClean = (type: 'stdout' | 'stderr', raw: string) => {
      const clean = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      const lines = clean.split(/[\r\n]+/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || /^[-/\\|]$/.test(trimmed)) continue
        onProgress({ type, line: trimmed, packageId })
      }
    }

    this.ps.streamCommand(
      command,
      (data) => emitClean('stdout', data),
      (data) => emitClean('stderr', data),
      (code) => {
        const success = code === 0
        onProgress({
          type: 'exit',
          line: success ? successMsg : `${failMsg} (Code: ${code}).`,
          packageId,
          exitCode: code ?? undefined
        })
        resolve({ success, error: success ? undefined : `${failMsg} mit Exit-Code ${code}` })
      }
    )
  }

  /**
   * Installs a single winget package with real-time log streaming
   */
  public async installPackage(
    packageId: string,
    onProgress: (event: OperationLogEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const command = `winget install --id "${packageId}" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity`
      onProgress({ type: 'info', line: `> Starte Installation: ${packageId}...`, packageId })
      this.streamWinget(
        command,
        packageId,
        onProgress,
        resolve,
        `Installation von ${packageId} erfolgreich abgeschlossen.`,
        `Installation von ${packageId} fehlgeschlagen`
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
      this.streamWinget(
        command,
        cleanId,
        onProgress,
        resolve,
        `Deinstallation von ${cleanId} erfolgreich abgeschlossen.`,
        `Deinstallation von ${cleanId} fehlgeschlagen`
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
      const command = `winget upgrade --id "${packageId}" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity`
      onProgress({ type: 'info', line: `> Starte Aktualisierung von ${packageId}...`, packageId })
      this.streamWinget(
        command,
        packageId,
        onProgress,
        resolve,
        `Aktualisierung von ${packageId} erfolgreich abgeschlossen.`,
        `Aktualisierung von ${packageId} fehlgeschlagen`
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
      const command = `winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --disable-interactivity`
      onProgress({ type: 'info', line: '> Starte Aktualisierung aller verfügbaren Pakete...' })
      this.streamWinget(
        command,
        undefined,
        onProgress,
        resolve,
        'Alle Pakete wurden erfolgreich aktualisiert.',
        'Aktualisierungsprozess beendet'
      )
    })
  }
}

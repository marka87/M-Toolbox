import { exec } from 'child_process'
import { promisify } from 'util'
import type {
  BloatwareApp,
  BloatwareRemovalResult,
  BloatwareBatchProgress,
  BloatwareSafety,
  BloatwareCategory
} from '../../shared/types'

const execAsync = promisify(exec)

interface KnownAppDefinition {
  id: string
  displayName: string
  description: string
  publisher: string
  category: BloatwareCategory
  safety: BloatwareSafety
}

const KNOWN_BLOATWARE_DATABASE: KnownAppDefinition[] = [
  // --- 1. Sicher zu entfernen (Bloatware & Werbung / Feeds) ---
  {
    id: 'Microsoft.BingNews',
    displayName: 'Microsoft News',
    description: 'Nachrichten- und Schlagzeilen-Feed von MSN mit Werbeeinblendungen.',
    publisher: 'Microsoft Corporation',
    category: 'news',
    safety: 'safe'
  },
  {
    id: 'Microsoft.BingWeather',
    displayName: 'MSN Wetter',
    description: 'Wettervorhersage-App von MSN mit Standort-Tracking und Werbung.',
    publisher: 'Microsoft Corporation',
    category: 'news',
    safety: 'safe'
  },
  {
    id: 'Microsoft.BingFinance',
    displayName: 'MSN Finanzen',
    description: 'Börsen- und Finanznachrichten-App von MSN.',
    publisher: 'Microsoft Corporation',
    category: 'news',
    safety: 'safe'
  },
  {
    id: 'Microsoft.BingSports',
    displayName: 'MSN Sport',
    description: 'Sportergebnisse und Berichterstattung von MSN.',
    publisher: 'Microsoft Corporation',
    category: 'news',
    safety: 'safe'
  },
  {
    id: 'Microsoft.GetHelp',
    displayName: 'Hilfe anfordern',
    description: 'Eingebaute Windows-Support-App für Online-Hilfeartikel.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.Getstarted',
    displayName: 'Tipps & Erste Schritte',
    description: 'Einführungs- und Werbe-Assistent für Windows-Funktionen.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.MicrosoftSolitaireCollection',
    displayName: 'Microsoft Solitaire Collection',
    description: 'Kartenspiel-Sammlung mit Vollbild-Werbung und Abonnement-Käufen.',
    publisher: 'Microsoft Studios',
    category: 'gaming',
    safety: 'safe'
  },
  {
    id: 'Microsoft.WindowsFeedbackHub',
    displayName: 'Feedback-Hub',
    description: 'Sendet Fehlerberichte, Diagnosevorschläge und Telemetriedaten an Microsoft.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.549981C3F5F10',
    displayName: 'Cortana',
    description: 'Veralteter Sprachassistent von Microsoft (wurde durch Copilot abgelöst).',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Clipchamp.Clipchamp',
    displayName: 'Clipchamp Video Editor',
    description: 'Cloud-basierter Video-Editor mit kostenpflichtigem Cloud-Abo-Modell.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.ZuneVideo',
    displayName: 'Filme & TV',
    description: 'Standard-Videoplayer für Microsoft Store Leih- und Kauffilme.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.ZuneMusic',
    displayName: 'Windows Media Player (Groove)',
    description: 'Ältere Groove-Musik Komponente, oft durch moderne Player ersetzt.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'safe'
  },
  {
    id: 'Microsoft.StartExperiencesApp',
    displayName: 'Windows Widget Feed',
    description: 'Widget-Hintergrunddienst für den MSN-Nachrichtenfeed auf der Taskleiste.',
    publisher: 'Microsoft Corporation',
    category: 'news',
    safety: 'safe'
  },
  // Beliebte vorinstallierte Partner-Apps (Stubs / OEM Bloat)
  {
    id: 'ByteDancePte.Ltd.TikTok',
    displayName: 'TikTok',
    description: 'Vorinstallierte Social-Media-App aus dem Microsoft Store.',
    publisher: 'ByteDance',
    category: 'social',
    safety: 'safe'
  },
  {
    id: 'Disney.378530522',
    displayName: 'Disney+',
    description: 'Vorinstallierter Streaming-App-Stub.',
    publisher: 'Disney',
    category: 'social',
    safety: 'safe'
  },
  {
    id: 'Facebook.Facebook',
    displayName: 'Facebook',
    description: 'Vorinstallierte Social-Media-Anwendung.',
    publisher: 'Meta',
    category: 'social',
    safety: 'safe'
  },
  {
    id: 'Instagram.Instagram',
    displayName: 'Instagram',
    description: 'Vorinstallierte Social-Media-Anwendung.',
    publisher: 'Meta',
    category: 'social',
    safety: 'safe'
  },
  {
    id: 'SpotifyAB.SpotifyMusic',
    displayName: 'Spotify (Store-Paket)',
    description: 'Vorinstallierter Musik-Streaming-Stub.',
    publisher: 'Spotify AB',
    category: 'social',
    safety: 'safe'
  },

  // --- 2. Optional (Zusatztools, je nach Bedarf behalten oder entfernen) ---
  {
    id: 'Microsoft.YourPhone',
    displayName: 'Smartphone-Link (Phone Link)',
    description: 'Synchronisiert Anrufe, Benachrichtigungen und Fotos mit Android / iOS.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.SkypeApp',
    displayName: 'Skype',
    description: 'VoIP- und Chat-Anwendung von Microsoft.',
    publisher: 'Microsoft Corporation',
    category: 'social',
    safety: 'optional'
  },
  {
    id: 'Microsoft.Todos',
    displayName: 'Microsoft To Do',
    description: 'Aufgaben- und Notizenverwaltung mit Cloud-Synchronisation.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.MicrosoftStickyNotes',
    displayName: 'Kurznotizen (Sticky Notes)',
    description: 'Desktop-Haftnotizen mit Schnellnotiz-Funktion.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.WindowsMaps',
    displayName: 'Windows Karten',
    description: 'Offline-Karten und Routenplaner auf Bing-Kartenbasis.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.WindowsSoundRecorder',
    displayName: 'Sprachrekorder / Audioaufnahme',
    description: 'Einfaches Mikrofon-Aufnahmewerkzeug für Sprachmemos.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.PowerAutomateDesktop',
    displayName: 'Power Automate',
    description: 'Desktop-Automatisierungstool für wiederkehrende Routineabläufe.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.Windows.DevHome',
    displayName: 'Dev Home',
    description: 'Entwickler-Dashboard zur GitHub-Verwaltung und Maschinenkonfiguration.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'MicrosoftCorporationII.QuickAssist',
    displayName: 'Remotehilfe (Quick Assist)',
    description: 'Microsoft-Fernwartungs-App für Remote-Unterstützung.',
    publisher: 'Microsoft Corporation',
    category: 'tools',
    safety: 'optional'
  },
  {
    id: 'Microsoft.XboxSpeechToTextOverlay',
    displayName: 'Xbox Sprache-zu-Text Overlay',
    description: 'Gaming-Overlay für Untertitel und Sprach-zu-Text-Transkription.',
    publisher: 'Microsoft Corporation',
    category: 'gaming',
    safety: 'optional'
  },
  {
    id: 'Microsoft.XboxIdentityProvider',
    displayName: 'Xbox Identity Provider',
    description: 'Authentifizierungsdienst für Xbox Live Spiele und Profile.',
    publisher: 'Microsoft Corporation',
    category: 'gaming',
    safety: 'optional'
  },
  {
    id: 'Microsoft.Xbox.TCUI',
    displayName: 'Xbox Live Benutzeroberfläche',
    description: 'Oberflächenkomponente für Xbox-Freundeslisten und Party-Chat.',
    publisher: 'Microsoft Corporation',
    category: 'gaming',
    safety: 'optional'
  },
  {
    id: 'Microsoft.XboxGamingOverlay',
    displayName: 'Xbox Game Bar',
    description: 'In-Game-Overlay für Leistungsmessung, Screenshots und Lautstärkeregler.',
    publisher: 'Microsoft Corporation',
    category: 'gaming',
    safety: 'optional'
  },
  {
    id: 'Microsoft.GamingApp',
    displayName: 'Xbox App',
    description: 'Offizieller Launcher für Xbox Game Pass und PC-Spielebibliothek.',
    publisher: 'Microsoft Corporation',
    category: 'gaming',
    safety: 'optional'
  },

  // --- 3. Systemrelevant / Vorsicht (Nicht leichtfertig entfernen) ---
  {
    id: 'Microsoft.WindowsStore',
    displayName: 'Microsoft Store',
    description: 'Zentraler App-Store von Windows – erforderlich für UWP-Updates und System-Apps.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.DesktopAppInstaller',
    displayName: 'Windows App Installer & Winget',
    description: 'Notwendig für die Installation von .msix, .appx und den Winget-Paketmanager.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.WindowsTerminal',
    displayName: 'Windows Terminal',
    description: 'Moderner Terminal-Host für PowerShell, Eingabeaufforderung und WSL.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.WindowsCalculator',
    displayName: 'Windows Rechner',
    description: 'Standard-Rechner für Standard-, Wissenschafts- und Programmierberechnungen.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.WindowsNotepad',
    displayName: 'Editor (Notepad)',
    description: 'Standard-Texteditor von Windows für Text- und Konfigurationsdateien.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.Paint',
    displayName: 'Paint',
    description: 'Standard-Zeichen- und Bildbearbeitungsprogramm von Windows 11.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.ScreenSketch',
    displayName: 'Snipping Tool (Ausschneiden)',
    description: 'Bildschirmfoto- und Videoaufnahme-Werkzeug von Windows 11.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.Windows.Photos',
    displayName: 'Windows Fotos',
    description: 'Standard-Bildbetrachter und Galerie-App von Windows 11.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  },
  {
    id: 'Microsoft.WindowsCamera',
    displayName: 'Kamera',
    description: 'Webcam- und Kamera-Anwendung für Windows.',
    publisher: 'Microsoft Corporation',
    category: 'system',
    safety: 'caution'
  }
]

export class BloatwareService {
  private static instance: BloatwareService

  public static getInstance(): BloatwareService {
    if (!BloatwareService.instance) {
      BloatwareService.instance = new BloatwareService()
    }
    return BloatwareService.instance
  }

  /**
   * Scans installed Appx packages and correlates them with known bloatware definitions
   */
  public async scan(): Promise<BloatwareApp[]> {
    try {
      const psCommand = [
        'Get-AppxPackage -AllUsers',
        'Where-Object { (-not $_.IsFramework) -and (-not $_.NonRemovable) }',
        'Select-Object Name, PackageFullName, Version, Publisher',
        'ConvertTo-Json -Compress'
      ].join(' | ')

      const { stdout } = await execAsync(`powershell.exe -NoProfile -Command "${psCommand}"`, {
        timeout: 20000,
        maxBuffer: 1024 * 1024 * 8
      })

      if (!stdout || !stdout.trim()) {
        return []
      }

      let parsed: any = JSON.parse(stdout.trim())
      if (!Array.isArray(parsed)) {
        parsed = [parsed]
      }

      const knownMap = new Map<string, KnownAppDefinition>()
      for (const def of KNOWN_BLOATWARE_DATABASE) {
        knownMap.set(def.id.toLowerCase(), def)
      }

      const results: BloatwareApp[] = []
      const seenNames = new Set<string>()

      for (const item of parsed) {
        if (!item || !item.Name) continue
        const name = String(item.Name).trim()
        const lowerName = name.toLowerCase()

        if (seenNames.has(lowerName)) continue
        seenNames.add(lowerName)

        // Ignore internal Windows language packages and experience packs
        if (
          lowerName.includes('languageexperiencepack') ||
          lowerName.includes('handwriting') ||
          lowerName.includes('winappruntime') ||
          /^[0-9a-f-]{30,}$/i.test(lowerName)
        ) {
          continue
        }

        const known = knownMap.get(lowerName)

        if (known) {
          results.push({
            id: known.id,
            packageFullName: item.PackageFullName || known.id,
            displayName: known.displayName,
            description: known.description,
            publisher: known.publisher || item.Publisher || 'Microsoft Corporation',
            version: item.Version || '1.0',
            safety: known.safety,
            category: known.category,
            isRemovable: known.safety !== 'caution',
            isInstalled: true
          })
        } else {
          // Dynamic classification for apps not in the predefined database
          let safety: BloatwareSafety = 'optional'
          let category: BloatwareCategory = 'tools'
          let displayName = name.split('.').slice(-1)[0] || name

          if (lowerName.includes('bing') || lowerName.includes('news') || lowerName.includes('feed')) {
            safety = 'safe'
            category = 'news'
          } else if (lowerName.includes('xbox') || lowerName.includes('game')) {
            safety = 'optional'
            category = 'gaming'
          } else if (!lowerName.startsWith('microsoft.')) {
            // Third-party or OEM pre-install
            safety = 'safe'
            category = 'bloatware'
          }

          results.push({
            id: name,
            packageFullName: item.PackageFullName || name,
            displayName,
            description: `Windows Store App (${name})`,
            publisher: item.Publisher || 'Drittanbieter / Microsoft',
            version: item.Version || '1.0',
            safety,
            category,
            isRemovable: true,
            isInstalled: true
          })
        }
      }

      // Sort: Safe to remove first, then optional, then caution
      const safetyWeight: Record<BloatwareSafety, number> = {
        safe: 0,
        optional: 1,
        caution: 2
      }

      return results.sort((a, b) => {
        if (safetyWeight[a.safety] !== safetyWeight[b.safety]) {
          return safetyWeight[a.safety] - safetyWeight[b.safety]
        }
        return a.displayName.localeCompare(b.displayName, 'de')
      })
    } catch (err) {
      console.error('[BloatwareService] Scan error:', err)
      return []
    }
  }

  /**
   * Uninstalls a single UWP / Appx package
   */
  public async uninstallApp(appId: string): Promise<BloatwareRemovalResult> {
    const cleanId = appId.replace(/["`$;]/g, '').trim()
    if (!cleanId) {
      return { success: false, appId, displayName: appId, error: 'Ungültige App-ID' }
    }

    try {
      const psScript = `
        Get-AppxPackage -Name "${cleanId}" -AllUsers -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue;
        Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq "${cleanId}" } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue;
      `.replace(/\r?\n\s*/g, ' ')

      await execAsync(`powershell.exe -NoProfile -Command "${psScript}"`, { timeout: 30000 })
      return { success: true, appId: cleanId, displayName: cleanId }
    } catch (err: any) {
      console.error(`[BloatwareService] Failed to uninstall ${cleanId}:`, err)
      return { success: false, appId: cleanId, displayName: cleanId, error: err?.message || 'Fehler beim Entfernen' }
    }
  }

  /**
   * Batch uninstalls multiple apps with progress callback
   */
  public async batchUninstall(
    appIds: string[],
    onProgress?: (event: BloatwareBatchProgress) => void
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = []
    const failed: string[] = []
    const total = appIds.length

    for (let i = 0; i < total; i++) {
      const id = appIds[i]
      const percent = Math.round(((i + 1) / total) * 100)

      onProgress?.({
        currentApp: id,
        currentStep: i + 1,
        totalSteps: total,
        percent,
        statusText: `Entferne: ${id}...`
      })

      const res = await this.uninstallApp(id)
      if (res.success) {
        succeeded.push(id)
      } else {
        failed.push(id)
      }
    }

    onProgress?.({
      currentApp: 'done',
      currentStep: total,
      totalSteps: total,
      percent: 100,
      statusText: `Abgeschlossen: ${succeeded.length} entfernt, ${failed.length} fehlgeschlagen.`
    })

    return { succeeded, failed }
  }
}

export const bloatwareService = BloatwareService.getInstance()

import { exec } from 'child_process'
import { promisify } from 'util'
import type {
  TweakItem,
  TweakApplyResult,
  BatchTweakResult
} from '../../shared/types'

const execAsync = promisify(exec)

interface TweakDefinition extends Omit<TweakItem, 'value'> {
  psReadExpression: string
  getApplyScript: (value: boolean) => string
}

export const TWEAK_DEFINITIONS: TweakDefinition[] = [
  // --- 1. Datei-Explorer ---
  {
    id: 'classic_context_menu',
    title: 'Klassisches Windows 10 Kontextmenü',
    description: 'Stellt das vollständige Kontextmenü im Explorer wieder her, ohne "Weitere Optionen anzeigen" anklicken zu müssen.',
    category: 'explorer',
    recommendedValue: true,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '[bool](Test-Path "HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32")',
    getApplyScript: (val) =>
      val
        ? 'New-Item -Path "HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" -Value "" -Force | Out-Null'
        : 'Remove-Item -Path "HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" -Recurse -Force -ErrorAction SilentlyContinue'
  },
  {
    id: 'show_file_extensions',
    title: 'Dateinamenerweiterungen immer anzeigen',
    description: 'Zeigt Dateiendungen (.exe, .pdf, .docx etc.) immer an, um getarnte Malware und Ausführungsrisiken sofort zu erkennen.',
    category: 'explorer',
    recommendedValue: true,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).HideFileExt -eq 0)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "HideFileExt" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'show_hidden_files',
    title: 'Versteckte Dateien & Ordner einblenden',
    description: 'Blendet versteckte System- und Anwendungsordner (wie z. B. AppData) im Datei-Explorer standardmäßig ein.',
    category: 'explorer',
    recommendedValue: true,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).Hidden -eq 1)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "Hidden" -Value ${val ? 1 : 2} -Type DWord`
  },
  {
    id: 'compact_mode',
    title: 'Kompaktansicht im Datei-Explorer',
    description: 'Verringert Zeilen- und Elementabstände im Windows 11 Explorer für eine kompaktere und informationsreichere Ansicht.',
    category: 'explorer',
    recommendedValue: false,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).UseCompactMode -eq 1)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "UseCompactMode" -Value ${val ? 1 : 0} -Type DWord`
  },
  {
    id: 'launch_this_pc',
    title: 'Explorer öffnet standardmäßig "Dieser PC"',
    description: 'Öffnet beim Starten des Windows-Explorers direkt die Festplatten- und Laufwerksübersicht statt der Schnellzugriff-/Startseite.',
    category: 'explorer',
    recommendedValue: true,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).LaunchTo -eq 1)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "LaunchTo" -Value ${val ? 1 : 2} -Type DWord`
  },
  {
    id: 'disable_aero_shake',
    title: 'Aero Shake (Fensterminimierung) deaktivieren',
    description: 'Verhindert, dass beim versehentlichen Schütteln eines aktiven Fensters alle anderen Fenster in den Hintergrund minimiert werden.',
    category: 'explorer',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).DisallowShaking -eq 1)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "DisallowShaking" -Value ${val ? 1 : 0} -Type DWord`
  },

  // --- 2. Taskleiste & Startmenü ---
  {
    id: 'taskbar_align_left',
    title: 'Taskleiste linksbündig ausrichten',
    description: 'Positioniert die Taskleistensymbole und das Startmenü linksbündig am Bildschirmrand wie im klassischen Windows-Design.',
    category: 'taskbar',
    recommendedValue: false,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).TaskbarAl -eq 0)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarAl" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'hide_taskbar_widgets',
    title: 'Widgets (Wetter & News) ausblenden',
    description: 'Entfernt das Widgets-Symbol mit Wetter- und Newsfeed-Integration aus der Taskleiste und reduziert Hintergrundlast.',
    category: 'taskbar',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).TaskbarDa -eq 0)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarDa" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'hide_task_view',
    title: 'Taskansicht-Button ausblenden',
    description: 'Blendet die Taskansicht-Schaltfläche (virtuelle Desktops) aus der Taskleiste aus (bleibt via Win+Tab erreichbar).',
    category: 'taskbar',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -ErrorAction SilentlyContinue).ShowTaskViewButton -eq 0)',
    getApplyScript: (val) =>
      `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "ShowTaskViewButton" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'disable_bing_search',
    title: 'Bing-Websuche im Startmenü deaktivieren',
    description: 'Verhindert, dass Windows bei der Startmenü-Suche Websuchergebnisse von Bing nachlädt. Beschleunigt die lokale Dateisuche.',
    category: 'taskbar',
    recommendedValue: true,
    requiresRestart: 'explorer',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -ErrorAction SilentlyContinue).DisableSearchBoxSuggestions -eq 1)',
    getApplyScript: (val) =>
      val
        ? '$p = "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "DisableSearchBoxSuggestions" -Value 1 -Type DWord; Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "BingSearchEnabled" -Value 0 -Type DWord'
        : 'Remove-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableSearchBoxSuggestions" -ErrorAction SilentlyContinue; Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "BingSearchEnabled" -Value 1 -Type DWord'
  },

  // --- 3. Datenschutz & Telemetrie ---
  {
    id: 'disable_advertising_id',
    title: 'Personalisierte Werbe-ID deaktivieren',
    description: 'Verhindert, dass Apps und Microsoft eine geräteübergreifende Werbe-Identifikationsnummer für Verhaltensprofile nutzen.',
    category: 'privacy',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" -ErrorAction SilentlyContinue).Enabled -eq 0)',
    getApplyScript: (val) =>
      `$p = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "Enabled" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'disable_start_suggestions',
    title: 'Windows-Tipps & App-Empfehlungen abschalten',
    description: 'Deaktiviert gesponserte App-Vorschläge und Werbe-Banner im Startmenü, den Windows-Einstellungen und im Sperrbildschirm.',
    category: 'privacy',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -ErrorAction SilentlyContinue)."SubscribedContent-338388Enabled" -eq 0)',
    getApplyScript: (val) => {
      const v = val ? 0 : 1
      return `$p = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "SubscribedContent-338388Enabled" -Value ${v} -Type DWord; Set-ItemProperty -Path $p -Name "SubscribedContent-338389Enabled" -Value ${v} -Type DWord; Set-ItemProperty -Path $p -Name "SystemPaneSuggestionsEnabled" -Value ${v} -Type DWord`
    }
  },
  {
    id: 'disable_activity_history',
    title: 'Windows Aktivitätsverlauf deaktivieren',
    description: 'Unterbindet das Protokollieren des App- und Dokumentverlaufs sowie die Synchronisation mit dem Microsoft-Konto.',
    category: 'privacy',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -ErrorAction SilentlyContinue).TailoredExperiencesWithDiagnosticDataEnabled -eq 0)',
    getApplyScript: (val) =>
      `$p = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "TailoredExperiencesWithDiagnosticDataEnabled" -Value ${val ? 0 : 1} -Type DWord`
  },
  {
    id: 'disable_telemetry',
    title: 'Diagnosedaten & Telemetrie minimieren',
    description: 'Begrenzt die Windows-Diagnosedatenerfassung auf die minimale Sicherheitsstufe (erfordert Administratorrechte).',
    category: 'privacy',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: true,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -ErrorAction SilentlyContinue).AllowTelemetry -eq 0)',
    getApplyScript: (val) =>
      `$p = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "AllowTelemetry" -Value ${val ? 0 : 3} -Type DWord`
  },

  // --- 4. Gaming & Performance ---
  {
    id: 'enable_game_mode',
    title: 'Windows Spielmodus (Game Mode) aktivieren',
    description: 'Priorisiert Systemressourcen (CPU/GPU) für aktive Spiele und drosselt ressourcenintensive Hintergrundprozesse.',
    category: 'gaming',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -ErrorAction SilentlyContinue).AllowAutoGameMode -eq 1)',
    getApplyScript: (val) => {
      const v = val ? 1 : 0
      return `$p = "HKCU:\\Software\\Microsoft\\GameBar"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "AllowAutoGameMode" -Value ${v} -Type DWord; Set-ItemProperty -Path $p -Name "AutoGameModeEnabled" -Value ${v} -Type DWord`
    }
  },
  {
    id: 'disable_game_dvr',
    title: 'Game DVR Hintergrundaufzeichnung deaktivieren',
    description: 'Schaltet die permanente Video-Hintergrundaufzeichnung von Xbox Game DVR ab. Verhindert Mikroruckler und spart Festplattenleistung.',
    category: 'gaming',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -ErrorAction SilentlyContinue).GameDVR_Enabled -eq 0)',
    getApplyScript: (val) => {
      const v = val ? 0 : 1
      return `$p = "HKCU:\\System\\GameConfigStore"; if (Test-Path $p) { Set-ItemProperty -Path $p -Name "GameDVR_Enabled" -Value ${v} -Type DWord }; $p2 = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR"; if (!(Test-Path $p2)) { New-Item -Path $p2 -Force | Out-Null }; Set-ItemProperty -Path $p2 -Name "AppCaptureEnabled" -Value ${v} -Type DWord`
    }
  },
  {
    id: 'optimize_visual_effects',
    title: 'Fenster-Animationen für flüssiges Arbeiten reduzieren',
    description: 'Deaktiviert die Verzögerungen bei Fenster-Minimierungs- und Öffnungsanimationen für eine unmittelbarere Reaktion der Oberfläche.',
    category: 'gaming',
    recommendedValue: false,
    requiresRestart: 'none',
    requiresAdmin: false,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -ErrorAction SilentlyContinue).MinAnimate -eq "0")',
    getApplyScript: (val) =>
      `$p = "HKCU:\\Control Panel\\Desktop\\WindowMetrics"; if (Test-Path $p) { Set-ItemProperty -Path $p -Name "MinAnimate" -Value "${val ? '0' : '1'}" -Type String }`
  },

  // --- 5. System & Komfort ---
  {
    id: 'prevent_auto_reboot_update',
    title: 'Automatischen Neustart nach Windows Update verhindern',
    description: 'Verhindert, dass Windows bei einem angemeldeten Benutzer nach automatischen Updates ungefragt einen Neustart erzwingt.',
    category: 'system',
    recommendedValue: true,
    requiresRestart: 'none',
    requiresAdmin: true,
    dangerLevel: 'safe',
    psReadExpression: '((Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -ErrorAction SilentlyContinue).NoAutoRebootWithLoggedOnUsers -eq 1)',
    getApplyScript: (val) =>
      val
        ? '$p = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"; if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type DWord'
        : '$p = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"; if (Test-Path $p) { Remove-ItemProperty -Path $p -Name "NoAutoRebootWithLoggedOnUsers" -ErrorAction SilentlyContinue }'
  }
]

export class TweakService {
  private static instance: TweakService

  public static getInstance(): TweakService {
    if (!TweakService.instance) {
      TweakService.instance = new TweakService()
    }
    return TweakService.instance
  }

  /**
   * Reads the current state of all tweaks in a single fast PowerShell execution.
   */
  public async getAllTweaks(): Promise<TweakItem[]> {
    try {
      // Build a unified PowerShell expression that evaluates every tweak into a JSON object
      const expressions = TWEAK_DEFINITIONS.map(
        (t) => `"${t.id}" = (${t.psReadExpression})`
      ).join('; ')

      const psScript = `& { [PSCustomObject]@{ ${expressions} } | ConvertTo-Json -Compress }`
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 15000 }
      )

      const valuesMap: Record<string, boolean> = JSON.parse(stdout.trim())

      return TWEAK_DEFINITIONS.map((def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        value: Boolean(valuesMap[def.id]),
        recommendedValue: def.recommendedValue,
        requiresRestart: def.requiresRestart,
        requiresAdmin: def.requiresAdmin,
        dangerLevel: def.dangerLevel
      }))
    } catch (err) {
      console.error('Failed to read all tweaks via batch PowerShell:', err)
      // Fallback: return default items with false
      return TWEAK_DEFINITIONS.map((def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        value: false,
        recommendedValue: def.recommendedValue,
        requiresRestart: def.requiresRestart,
        requiresAdmin: def.requiresAdmin,
        dangerLevel: def.dangerLevel
      }))
    }
  }

  /**
   * Applies or reverts a single tweak by ID.
   */
  public async setTweak(tweakId: string, value: boolean): Promise<TweakApplyResult> {
    const def = TWEAK_DEFINITIONS.find((t) => t.id === tweakId)
    if (!def) {
      return {
        tweakId,
        success: false,
        newValue: false,
        message: `Tweak mit ID "${tweakId}" nicht gefunden.`,
        requiresRestart: 'none'
      }
    }

    try {
      const script = def.getApplyScript(value)
      const encoded = Buffer.from(script, 'utf16le').toString('base64')

      await execAsync(
        `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 10000 }
      )

      return {
        tweakId,
        success: true,
        newValue: value,
        message: `Tweak "${def.title}" erfolgreich ${value ? 'aktiviert' : 'deaktiviert'}.`,
        requiresRestart: def.requiresRestart
      }
    } catch (err: any) {
      console.error(`Failed to apply tweak ${tweakId}:`, err)
      return {
        tweakId,
        success: false,
        newValue: !value,
        message: `Fehler beim Anwenden: ${err?.message || 'Unbekannter Fehler'}`,
        requiresRestart: 'none'
      }
    }
  }

  /**
   * Applies all recommended values in one batch.
   */
  public async applyRecommended(): Promise<BatchTweakResult> {
    const recommendedDefs = TWEAK_DEFINITIONS.filter((t) => t.recommendedValue === true)
    const failedIds: string[] = []
    let updatedCount = 0
    let requiresRestart = false

    // Group non-admin scripts for fast batch execution
    const scripts = recommendedDefs.map((def) => def.getApplyScript(true))
    const fullScript = scripts.join(';\n')

    try {
      const encoded = Buffer.from(fullScript, 'utf16le').toString('base64')
      await execAsync(
        `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 20000 }
      )
      updatedCount = recommendedDefs.length
      requiresRestart = recommendedDefs.some((t) => t.requiresRestart === 'explorer')
    } catch (err) {
      console.error('Batch apply failed, falling back to individual execution:', err)
      for (const def of recommendedDefs) {
        const res = await this.setTweak(def.id, true)
        if (res.success) {
          updatedCount++
          if (def.requiresRestart === 'explorer') requiresRestart = true
        } else {
          failedIds.push(def.id)
        }
      }
    }

    return {
      success: failedIds.length === 0,
      updatedCount,
      requiresRestart,
      failedIds
    }
  }

  /**
   * Safely restarts explorer.exe to apply shell changes.
   */
  public async restartExplorer(): Promise<{ success: boolean; message: string }> {
    try {
      const ps = `Stop-Process -Name explorer -Force; Start-Sleep -Milliseconds 600; Start-Process explorer.exe`
      const encoded = Buffer.from(ps, 'utf16le').toString('base64')
      await execAsync(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
        timeout: 10000
      })
      return { success: true, message: 'Windows Explorer wurde erfolgreich neu gestartet.' }
    } catch (err: any) {
      console.error('Failed to restart explorer:', err)
      return { success: false, message: `Fehler beim Neustart des Explorers: ${err?.message || 'Unbekannt'}` }
    }
  }
}

export const tweakService = TweakService.getInstance()


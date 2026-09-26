import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  Palette,
  Sliders,
  FolderOpen,
  Trash2,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Github
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { ThemeSelector } from '../components/ui/ThemeSelector'
import { AccentColorPicker } from '../components/ui/AccentColorPicker'
import { useSettings } from '../hooks/useSettings'

export const SettingsPage: React.FC = () => {
  const {
    settings,
    appInfo,
    loading,
    checkingUpdates,
    updateResult,
    saveStatus,
    updateSettings,
    checkForUpdates,
    clearCache,
    resetSettings,
    openUserDataFolder
  } = useSettings()

  const [cacheMessage, setCacheMessage] = useState<string | null>(null)
  const [resetting, setResetting] = useState<boolean>(false)

  const handleClearCache = async () => {
    const res = await clearCache()
    if (res.success) {
      setCacheMessage(res.message || 'Temporärer Cache wurde erfolgreich bereinigt.')
    } else {
      setCacheMessage(res.message || 'Fehler beim Bereinigen.')
    }
    setTimeout(() => setCacheMessage(null), 4000)
  }

  const handleResetSettings = async () => {
    if (window.confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
      setResetting(true)
      await resetSettings()
      setResetting(false)
    }
  }

  const handleOpenGitHub = () => {
    window.mToolbox.system.openExternal('https://github.com/marka87/M-Toolbox')
  }

  const handleOpenReleaseUrl = (url?: string) => {
    if (url) {
      window.mToolbox.system.openExternal(url)
    } else {
      window.mToolbox.system.openExternal('https://github.com/marka87/M-Toolbox/releases')
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-fluent-muted">
          <RefreshCw className="w-5 h-5 animate-spin text-fluent-accent" />
          <span>Einstellungen werden geladen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-fluent-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-fluent bg-fluent-accent-muted/40 text-fluent-accent">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                Einstellungen & Personalisierung
              </h1>
              <p className="text-xs text-fluent-muted">
                Systemintegration, Design, Update-Prüfung und Konfiguration von M-Toolbox
              </p>
            </div>
          </div>
        </div>

        {/* Save Status indicator */}
        {saveStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-fluent bg-fluent-card border border-fluent-accent/40 text-xs text-slate-200 animate-fade-in shadow-fluent-sm">
            <CheckCircle2 className="w-4 h-4 text-fluent-accent" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* 1. Appearance & Theme */}
      <Card
        title="Personalisierung & Farbschema"
        subtitle="Wählen Sie Ihr bevorzugtes Windows 11 Fluent Theme und Akzentfarbe"
        icon={<Palette className="w-5 h-5" />}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Farbschema (Theme)
            </label>
            <ThemeSelector
              currentTheme={settings.theme}
              onChange={(newTheme) => updateSettings({ theme: newTheme })}
            />
          </div>

          <div className="pt-3 border-t border-fluent-border-subtle">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Akzentfarbe
            </label>
            <AccentColorPicker
              currentColor={settings.accentColor}
              onChange={(newColor) => updateSettings({ accentColor: newColor })}
            />
          </div>
        </div>
      </Card>

      {/* 2. General System Integration */}
      <Card
        title="Systemintegration & Verhalten"
        subtitle="Autostart, Fenster- und Ausführungsoptionen für Windows 11"
        icon={<Sliders className="w-5 h-5" />}
      >
        <div className="space-y-4 divide-y divide-fluent-border-subtle">
          {/* Windows Autostart */}
          <div className="flex items-center justify-between pt-2 first:pt-0">
            <div>
              <div className="text-sm font-medium text-slate-200">Mit Windows starten</div>
              <div className="text-xs text-fluent-muted">
                M-Toolbox automatisch beim Windows-Anmeldevorgang im Hintergrund starten
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => updateSettings({ autoStart: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>

          {/* Minimize to Tray */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-sm font-medium text-slate-200">Im Infobereich (Tray) minimieren</div>
              <div className="text-xs text-fluent-muted">
                Beim Schließen in den Windows-Benachrichtigungsbereich minimieren statt beenden
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => updateSettings({ minimizeToTray: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>

          {/* Transparency Effects */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-sm font-medium text-slate-200">Transparenzeffekte (Mica / Acrylic)</div>
              <div className="text-xs text-fluent-muted">
                Moderne Windows 11 Transparenz- und Blur-Effekte auf Oberflächen anwenden
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.transparencyEffects}
                onChange={(e) => updateSettings({ transparencyEffects: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>

          {/* Hardware Acceleration */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-sm font-medium text-slate-200">GPU-Hardwarebeschleunigung</div>
              <div className="text-xs text-fluent-muted">
                Nutzt die Grafikkarte zur Beschleunigung von UI-Renderings. Bei Grafikfehlern, Flackern oder Abstürzen deaktivieren (erhöht dann die CPU-Last durch Software-Rendering). Neustart erforderlich.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hardwareAcceleration}
                onChange={(e) => updateSettings({ hardwareAcceleration: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>

          {/* Hybrid GPU Counters (Experimentell) */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-sm font-medium text-slate-200">Hybrid-GPU Leistungsindikatoren (Experimentell)</div>
              <div className="text-xs text-fluent-muted">
                Aggregiert 3D-Auslastung über iGPU und dGPU auf Hybrid-Laptops (WMI engtype_3D)
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.experimentalHybridGpuCounters)}
                onChange={(e) => updateSettings({ experimentalHybridGpuCounters: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>

          {/* GPU Usage Telemetry (Default: Aus) */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-sm font-medium text-slate-200">GPU-Auslastung anzeigen</div>
              <div className="text-xs text-fluent-muted">
                Aktiviert die GPU-Überwachung im HUD und Dashboard (startet nvidia-smi / WMI GPU-Abfragen)
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.showGpuUsage)}
                onChange={(e) => updateSettings({ showGpuUsage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluent-accent"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* 3. GitHub Live Updates */}
      <Card
        title="GitHub Updates & Version"
        subtitle="Prüfen Sie direkt auf neue M-Toolbox Versionen über die offizielle GitHub API"
        icon={<Github className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-fluent-lg bg-fluent-sidebar/40 border border-fluent-border/60 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-fluent bg-fluent-card border border-fluent-border/40 text-fluent-accent">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Installierte Version: <span className="text-fluent-accent">v{appInfo?.version || '1.9.0'}</span>
                </div>
                <div className="text-xs text-fluent-muted">
                  Offizielles GitHub-Repository: <code className="text-slate-300">marka87/M-Toolbox</code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={checkForUpdates}
                disabled={checkingUpdates}
                className="flex items-center gap-2 px-3 py-1.5 rounded-fluent bg-fluent-accent hover:bg-fluent-accent-hover text-white text-xs font-semibold shadow-fluent-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                <span>{checkingUpdates ? 'Prüfe...' : 'Jetzt prüfen'}</span>
              </button>
            </div>
          </div>

          {/* Update Result Display */}
          {updateResult && (
            <div
              className={`p-4 rounded-fluent-lg border animate-fade-in ${
                updateResult.hasUpdate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {updateResult.hasUpdate ? (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">
                      {updateResult.hasUpdate
                        ? `Neue Version ${updateResult.latestVersion} verfügbar!`
                        : 'M-Toolbox ist auf dem neuesten Stand!'}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {updateResult.hasUpdate
                        ? `Eine neuere Version (${updateResult.latestVersion}) wurde auf GitHub veröffentlicht.`
                        : `Sie verwenden die aktuellste Version (v${updateResult.currentVersion}). Keine Updates ausstehend.`}
                    </div>
                    {updateResult.publishedAt && (
                      <div className="text-[11px] text-fluent-muted mt-1">
                        Zuletzt geprüft: {new Date(updateResult.publishedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {updateResult.hasUpdate && (
                  <button
                    type="button"
                    onClick={() => handleOpenReleaseUrl(updateResult.releaseUrl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-fluent bg-amber-500 text-slate-900 font-semibold text-xs hover:bg-amber-400 transition-all shrink-0 shadow-sm"
                  >
                    <span>Release anzeigen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 4. Storage, Cache & Data Management */}
      <Card
        title="Speicher, Cache & App-Daten"
        subtitle="Verwalten Sie lokale Konfigurationsdateien, Logs und Cache-Speicher"
        icon={<FolderOpen className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-fluent-lg bg-fluent-sidebar/40 border border-fluent-border/60">
            <div className="text-xs font-semibold text-slate-300 mb-1">Lokales AppData-Verzeichnis:</div>
            <code className="text-xs text-fluent-accent block truncate bg-fluent-card px-2.5 py-1.5 rounded border border-fluent-border/40 font-mono">
              {appInfo?.userDataPath || '%APPDATA%\\m-toolbox'}
            </code>
          </div>

          {cacheMessage && (
            <div className="p-3 rounded-fluent bg-fluent-card border border-fluent-accent/40 text-xs text-slate-200 animate-fade-in flex items-center gap-2">
              <Info className="w-4 h-4 text-fluent-accent" />
              <span>{cacheMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={openUserDataFolder}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-fluent bg-fluent-sidebar/60 border border-fluent-border hover:bg-fluent-card hover:border-slate-500 text-xs font-medium text-slate-200 transition-all shadow-fluent-sm"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>AppData-Ordner öffnen</span>
            </button>

            <button
              type="button"
              onClick={handleClearCache}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-fluent bg-fluent-sidebar/60 border border-fluent-border hover:bg-fluent-card hover:border-slate-500 text-xs font-medium text-slate-200 transition-all shadow-fluent-sm"
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              <span>Cache & Logs leeren</span>
            </button>

            <button
              type="button"
              onClick={handleResetSettings}
              disabled={resetting}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-fluent bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-medium text-red-300 transition-all shadow-fluent-sm disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Einstellungen zurücksetzen</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 5. System & Build Info (About) */}
      <Card
        title="Über M-Toolbox"
        subtitle="Systemarchitektur, Runtime-Versionen und Open-Source Informationen"
        icon={<Info className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-fluent bg-fluent-sidebar/40 border border-fluent-border/40">
              <div className="text-[11px] text-fluent-muted">App Version</div>
              <div className="text-sm font-semibold text-slate-100">v{appInfo?.version || '1.9.0'}</div>
            </div>
            <div className="p-3 rounded-fluent bg-fluent-sidebar/40 border border-fluent-border/40">
              <div className="text-[11px] text-fluent-muted">Electron</div>
              <div className="text-sm font-semibold text-slate-100">v{appInfo?.electronVersion || '34.0.0'}</div>
            </div>
            <div className="p-3 rounded-fluent bg-fluent-sidebar/40 border border-fluent-border/40">
              <div className="text-[11px] text-fluent-muted">Node.js</div>
              <div className="text-sm font-semibold text-slate-100">v{appInfo?.nodeVersion || '20.18.0'}</div>
            </div>
            <div className="p-3 rounded-fluent bg-fluent-sidebar/40 border border-fluent-border/40">
              <div className="text-[11px] text-fluent-muted">Plattform / Arch</div>
              <div className="text-sm font-semibold text-slate-100">
                {appInfo?.osBuild || 'Windows 11'} ({appInfo?.arch || 'x64'})
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-fluent-lg bg-fluent-sidebar/30 border border-fluent-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-fluent-accent shrink-0" />
              <div className="text-xs text-fluent-muted">
                100% Native Windows 11 Integration ohne Dummys oder Mockups. Entwickelt für Systemadministratoren und Power-User.
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenGitHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-fluent bg-fluent-card border border-fluent-border hover:border-slate-500 text-xs font-semibold text-slate-200 transition-all shrink-0"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3 text-fluent-muted" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}


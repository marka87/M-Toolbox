import React, { useState, useEffect, useRef } from 'react'
import {
  Save,
  RotateCcw,
  Package,
  Sliders,
  Type,
  Image as ImageIcon,
  Terminal,
  FileCode,
  CheckCircle2,
  FolderOpen,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useBackup } from '../hooks/useBackup'
import { Card } from '../components/ui/Card'

type ActiveTab = 'create' | 'restore'

export const BackupPage: React.FC = () => {
  const {
    localBackups,
    selectedBackup,
    setSelectedBackup,
    isCreating,
    isRestoring,
    logs,
    restoreSelection,
    toggleRestoreCategory,
    clearLogs,
    createBackup,
    selectFileAndPreview,
    restoreSelected
  } = useBackup()

  const [activeTab, setActiveTab] = useState<ActiveTab>('create')
  const [showLogs, setShowLogs] = useState(false)
  const [lastCreatedPath, setLastCreatedPath] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Automatically open logs when creating or restoring
  useEffect(() => {
    if (isCreating || isRestoring) {
      setShowLogs(true)
    }
  }, [isCreating, isRestoring])

  // Scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const handleCreateDefault = async () => {
    const res = await createBackup(false)
    if (res.success && res.filePath) {
      setLastCreatedPath(res.filePath)
    }
  }

  const handleCreateCustom = async () => {
    const res = await createBackup(true)
    if (res.success && res.filePath) {
      setLastCreatedPath(res.filePath)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Backup & Restore</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fluent-accent/20 text-fluent-accent border border-fluent-accent/30">
              JSON Standard
            </span>
          </div>
          <p className="text-xs text-fluent-muted mt-1">
            Sichere deine Winget-Pakete, Explorer-Settings, Fonts, Wallpaper und PowerShell-Module in einer portablen JSON-Datei.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLogs((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-fluent text-xs font-medium border transition-colors ${
              showLogs || isCreating || isRestoring
                ? 'bg-fluent-accent/20 border-fluent-accent/50 text-fluent-accent'
                : 'bg-fluent-card border-fluent-border text-fluent-muted hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Protokoll {logs.length > 0 && `(${logs.length})`}</span>
            {showLogs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-fluent-border/70 pb-3">
        <button
          onClick={() => setActiveTab('create')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'create'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Backup erstellen</span>
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'restore'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Wiederherstellen</span>
          {localBackups.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {localBackups.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Create Backup */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Success Banner if just created */}
          {lastCreatedPath && (
            <div className="p-4 rounded-fluent border border-fluent-status-green/30 bg-fluent-status-green/10 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-fluent-status-green shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-100">Backup erfolgreich erstellt!</h4>
                  <p className="text-[11px] text-fluent-muted truncate font-mono mt-0.5">{lastCreatedPath}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('restore')}
                className="px-3 py-1.5 rounded bg-fluent-status-green/20 hover:bg-fluent-status-green/30 text-fluent-status-green text-xs font-semibold transition-colors shrink-0"
              >
                In Wiederherstellung anzeigen
              </button>
            </div>
          )}

          {/* Components Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card
              title="Winget Software"
              subtitle="Paketlisten & Versionen"
              icon={<Package className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Erfasst alle auf diesem Rechner via winget installierten Programme mit ihren Paket-IDs und Versionen für eine lückenlose Reinstallation.
              </p>
            </Card>

            <Card
              title="Explorer Einstellungen"
              subtitle="Dateiansicht & Taskleiste"
              icon={<Sliders className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Sichert Registry-Einstellungen wie versteckte Dateien anzeigen, Dateiendungen einblenden, Taskleistenausrichtung (zentriert/links) und Widgets.
              </p>
            </Card>

            <Card
              title="Schriftarten (Fonts)"
              subtitle="Benutzer-Fonts (.ttf/.otf)"
              icon={<Type className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Speichert alle benutzerdefinierten Schriftarten als Base64-Pakete, damit sie auf einem neuen System sofort wieder installiert und registriert werden.
              </p>
            </Card>

            <Card
              title="Desktop Wallpaper"
              subtitle="Hintergrundbild & Stil"
              icon={<ImageIcon className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Sichert die originale Bilddatei deines aktuellen Bildschirmhintergrunds sowie die Bildausrichtung (Ausfüllen, Anpassen, Kacheln).
              </p>
            </Card>

            <Card
              title="PowerShell Module"
              subtitle="Installierte CLI-Module"
              icon={<Terminal className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Erfasst alle installierten PowerShell-Module und bereitet die automatisierte Wiederherstellung via PSGallery vor.
              </p>
            </Card>

            <Card
              title="Portable JSON"
              subtitle="Offenes Datenformat"
              icon={<FileCode className="w-4 h-4 text-fluent-accent" />}
            >
              <p className="text-xs text-fluent-subtext leading-relaxed">
                Alle Daten werden in einer einzigen, leicht lesbaren und versionskontrollierten JSON-Datei strukturiert abgelegt.
              </p>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="p-6 rounded-fluent border border-fluent-border bg-fluent-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Bereit zur Sicherung</h3>
              <p className="text-xs text-fluent-muted mt-0.5">
                Erstelle ein Backup direkt im Standard-Ordner oder wähle einen individuellen Speicherort (z. B. USB-Stick oder Cloud).
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleCreateCustom}
                disabled={isCreating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-fluent-card hover:bg-fluent-card-hover border border-fluent-border text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4 text-fluent-muted" />
                <span>Speicherort wählen...</span>
              </button>

              <button
                onClick={handleCreateDefault}
                disabled={isCreating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-white text-xs font-bold shadow-fluent-sm transition-all disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sichere System...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>System-Backup jetzt erstellen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Restore Backup */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* Top selection bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-fluent border border-fluent-border bg-fluent-card/70">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Sicherungsdatei wählen</h3>
              <p className="text-[11px] text-fluent-muted mt-0.5">
                Wähle eine lokale Sicherung aus der Historie oder lade eine externe JSON-Datei.
              </p>
            </div>

            <button
              onClick={selectFileAndPreview}
              disabled={isRestoring}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-fluent-card hover:bg-fluent-card-hover border border-fluent-border text-xs font-semibold text-slate-200 transition-colors shadow-fluent-sm disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4 text-fluent-accent" />
              <span>Externe Backup-Datei laden...</span>
            </button>
          </div>

          {/* Local Backups History Dropdown / List */}
          {localBackups.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-fluent-muted uppercase tracking-wider">
                Lokale Backups ({localBackups.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {localBackups.map((b, idx) => {
                  const isSelected = selectedBackup?.filePath === b.filePath
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedBackup(b)}
                      className={`p-3.5 rounded-fluent text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-fluent-card border-fluent-accent ring-1 ring-fluent-accent'
                          : 'bg-fluent-card/50 border-fluent-border/60 hover:bg-fluent-card hover:border-fluent-border'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {b.computerName}
                          </span>
                          <span className="text-[10px] text-fluent-muted">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-fluent-subtext">
                          {b.wingetCount} Pakete · {b.explorerSettingsCount} Settings · {b.fontsCount} Fonts
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-fluent-border/40 text-[10px] text-fluent-muted truncate font-mono">
                        {b.filePath?.split(/[\\/]/).pop()}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected Backup Details & Selective Restore */}
          {selectedBackup ? (
            <div className="p-6 rounded-fluent border border-fluent-border bg-fluent-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-fluent-border/70">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Ausgewähltes Backup:</span>
                    <span className="text-fluent-accent">{selectedBackup.computerName}</span>
                  </h3>
                  <p className="text-xs text-fluent-muted mt-1">
                    Erstellt am: {new Date(selectedBackup.createdAt).toLocaleString()} · {selectedBackup.osVersion}
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded bg-fluent-border/60 text-xs font-mono text-slate-300">
                  {selectedBackup.filePath?.split(/[\\/]/).pop()}
                </span>
              </div>

              {/* Selection Checkboxes */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">
                  Wiederherzustellende Komponenten auswählen:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Winget */}
                  <div
                    onClick={() => toggleRestoreCategory('winget')}
                    className="p-3 rounded-lg border border-fluent-border/70 bg-fluent-bg/60 hover:bg-fluent-bg cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {restoreSelection.winget ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-slate-200">Winget-Software</span>
                        <p className="text-[11px] text-fluent-muted">
                          {selectedBackup.wingetCount} Programme installieren
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Explorer */}
                  <div
                    onClick={() => toggleRestoreCategory('explorer')}
                    className="p-3 rounded-lg border border-fluent-border/70 bg-fluent-bg/60 hover:bg-fluent-bg cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {restoreSelection.explorer ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-slate-200">Explorer-Einstellungen</span>
                        <p className="text-[11px] text-fluent-muted">
                          {selectedBackup.explorerSettingsCount} Registry-Werte anwenden
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fonts */}
                  <div
                    onClick={() => toggleRestoreCategory('fonts')}
                    className="p-3 rounded-lg border border-fluent-border/70 bg-fluent-bg/60 hover:bg-fluent-bg cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {restoreSelection.fonts ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-slate-200">Schriftarten (Fonts)</span>
                        <p className="text-[11px] text-fluent-muted">
                          {selectedBackup.fontsCount} benutzerdefinierte Fonts wiederherstellen
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wallpaper */}
                  <div
                    onClick={() => toggleRestoreCategory('wallpaper')}
                    className="p-3 rounded-lg border border-fluent-border/70 bg-fluent-bg/60 hover:bg-fluent-bg cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {restoreSelection.wallpaper ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-slate-200">Desktop Wallpaper</span>
                        <p className="text-[11px] text-fluent-muted">
                          {selectedBackup.hasWallpaper ? 'Hintergrundbild aktivieren' : 'Kein Bild im Backup'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PowerShell Modules */}
                  <div
                    onClick={() => toggleRestoreCategory('powershellModules')}
                    className="p-3 rounded-lg border border-fluent-border/70 bg-fluent-bg/60 hover:bg-fluent-bg cursor-pointer flex items-center justify-between sm:col-span-2"
                  >
                    <div className="flex items-center gap-3">
                      {restoreSelection.powershellModules ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-slate-200">PowerShell-Module</span>
                        <p className="text-[11px] text-fluent-muted">
                          {selectedBackup.powershellModulesCount} Module installieren
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Restore Action Button */}
              <div className="pt-4 border-t border-fluent-border/70 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-fluent-status-yellow">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Bereits vorhandene Einstellungen werden überschrieben.</span>
                </div>

                <button
                  onClick={restoreSelected}
                  disabled={isRestoring}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-white text-xs font-bold shadow-fluent-sm transition-all disabled:opacity-50"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Wiederherstellung läuft...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Ausgewählte Komponenten wiederherstellen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-fluent-muted border border-dashed border-fluent-border rounded-fluent">
              Noch kein Backup ausgewählt. Wähle ein lokales Backup oder lade eine JSON-Datei.
            </div>
          )}
        </div>
      )}

      {/* Live Log Console Drawer */}
      {showLogs && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-fluent-sidebar/95 border-t border-fluent-border backdrop-blur-md shadow-2xl p-4 transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-fluent-border/60 mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-fluent-accent" />
              <span className="text-xs font-semibold text-slate-200">
                Backup & Restore Live-Protokoll{' '}
                {(isCreating || isRestoring) && (
                  <span className="text-fluent-accent animate-pulse font-normal">(Ausführung läuft...)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearLogs}
                className="text-[11px] text-fluent-muted hover:text-slate-200 transition-colors"
              >
                Leeren
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="text-fluent-muted hover:text-slate-200 p-1"
                title="Minimieren"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={logContainerRef}
            className="h-44 overflow-y-auto font-mono text-[11px] text-slate-300 bg-black/40 p-3 rounded-lg space-y-1 select-text"
          >
            {logs.length === 0 ? (
              <span className="text-fluent-muted italic">Keine aktuellen Ausgaben vorhanden.</span>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

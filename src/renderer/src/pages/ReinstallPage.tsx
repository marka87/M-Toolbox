import React, { useEffect, useState } from 'react'
import {
  Archive,
  ChevronRight,
  Clock3,
  Download,
  HardDrive,
  History,
  Laptop,
  Package,
  RefreshCw,
  ShieldCheck,
  Upload,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sliders,
  FileText,
  ExternalLink,
  Sparkles,
  Terminal
} from 'lucide-react'
import { useReinstall } from '../hooks/useReinstall'
import type { ReinstallArchiveSummary, ReinstallResult } from '@shared/reinstall.types'
type Section = 'plan' | 'install' | 'checklist' | 'history'

const DEFAULT_CHECKLIST = [
  {
    id: 'usb_iso',
    title: 'Windows 11 Boot-Stick erstellen (min. 8 GB USB)',
    detail: 'Erstellen Sie mit dem offiziellen Media Creation Tool oder Rufus einen bootfähigen Windows 11 USB-Stick.',
    link: 'https://www.microsoft.com/software-download/windows11',
    linkText: 'Media Creation Tool herunterladen'
  },
  {
    id: 'portable_app',
    title: 'M-Toolbox Portable auf den USB-Stick kopieren',
    detail: 'Legen Sie die portable M-Toolbox EXE direkt auf dem Installations-Stick ab. Nach dem Clean Install können Sie M-Toolbox sofort ohne Setup starten.',
    link: null,
    linkText: null
  },
  {
    id: 'save_plan',
    title: 'Reinstall-Plan (.mtoolbox) auf dem USB-Stick speichern',
    detail: 'Erstellen Sie im ersten Schritt einen Plan mit OEM-Treibern (WLAN/LAN), Apps und Tweaks, und sichern Sie die .mtoolbox-Datei auf Ihrem Stick.',
    link: null,
    linkText: null
  },
  {
    id: 'backup_data',
    title: 'Persönliche Dateien extern sichern',
    detail: 'Sichern Sie Dokumente, Bilder, Downloads, Spielstände, Browser-Lesezeichen und wichtige AppData-Ordner auf einer externen Festplatte oder Cloud.',
    link: null,
    linkText: null
  },
  {
    id: 'bitlocker_check',
    title: 'BitLocker-Wiederherstellungsschlüssel sichern (falls aktiv)',
    detail: 'Falls Ihre Festplatte verschlüsselt ist, notieren Sie den Wiederherstellungsschlüssel aus Ihrem Microsoft-Konto oder deaktivieren Sie BitLocker vorübergehend.',
    link: 'https://account.microsoft.com/devices/recoverykey',
    linkText: 'Microsoft BitLocker-Schlüssel prüfen'
  },
  {
    id: 'ms_account',
    title: 'Microsoft-Konto Login & 2FA griffbereit halten',
    detail: 'Halten Sie Ihre Zugangsdaten und die Authenticator-App auf dem Smartphone bereit, um die Windows-Ersteinrichtung (OOBE) reibungslos abzuschließen.',
    link: null,
    linkText: null
  }
]

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-fluent-lg border border-fluent-border bg-fluent-card/75 p-5 shadow-fluent ${className}`}>
    {children}
  </div>
)

export const ReinstallPage: React.FC = () => {
  const { apps, drivers, system, history, progress, isBusy, error, discover, create, preview, restore, loadHistory } = useReinstall()
  const [section, setSection] = useState<Section>('plan')
  const [step, setStep] = useState(1)
  const [backupPath, setBackupPath] = useState<string | null>(null)
  const [summary, setSummary] = useState<ReinstallArchiveSummary | null>(null)
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  // Plan creation options
  const [includeDrivers, setIncludeDrivers] = useState(true)
  const [includeTweaks, setIncludeTweaks] = useState(true)
  const [includeWifi, setIncludeWifi] = useState(true)

  // Restore options
  const [restoreDrivers, setRestoreDrivers] = useState(true)
  const [restoreTweaks, setRestoreTweaks] = useState(true)
  const [restoreApps, setRestoreApps] = useState(true)
  const [selectedRestoreApps, setSelectedRestoreApps] = useState<Set<string>>(new Set())
  const [showRestoreAppList, setShowRestoreAppList] = useState(false)
  const [restoreResult, setRestoreResult] = useState<ReinstallResult | null>(null)

  // Checklist state (local storage)
  const [checkedList, setCheckedList] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mtoolbox_reinstall_checklist')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    if (section === 'history') loadHistory()
  }, [section, loadHistory])

  const toggleChecklistItem = (id: string) => {
    setCheckedList((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem('mtoolbox_reinstall_checklist', JSON.stringify([...next]))
      } catch {
        // ignore
      }
      return next
    })
  }

  const systemRows: Array<[string, string]> = [
    ['Computer', String(system.CSName || '—')],
    ['Windows', String(system.Caption || '—')],
    ['Version', String(system.Version || '—')],
    ['Build', String(system.BuildNumber || '—')],
    ['Architektur', String(system.OSArchitecture || '—')]
  ]

  const startDiscovery = async () => {
    setBackupPath(null)
    setSummary(null)
    setSelectedApps(new Set())
    const res = await discover()
    if (res && res.apps) {
      setSelectedApps(new Set(res.apps.map((a) => a.id)))
    }
    setStep(2)
  }

  const saveBackup = async () => {
    const path = await window.mToolbox.reinstall.saveDialog()
    if (!path) return
    const result = await create(path, {
      selectedAppIds: [...selectedApps],
      includeDrivers,
      includeTweaks,
      includeWifi
    })
    if (result.success) {
      setBackupPath(path)
      const prevSummary = await preview(path)
      setSummary(prevSummary)
      setStep(5)
    }
  }

  const resetPlan = () => {
    setStep(1)
    setBackupPath(null)
    setSummary(null)
    setSelectedApps(new Set())
    setSearch('')
  }

  const nextStep = (next: number) => setStep(Math.min(5, Math.max(1, next)))

  const chooseRestore = async () => {
    const path = await window.mToolbox.reinstall.selectFile()
    if (!path) return
    setBackupPath(path)
    const prevSummary = await preview(path)
    setSummary(prevSummary)
    if (prevSummary?.apps) {
      setSelectedRestoreApps(new Set(prevSummary.apps.map((a) => a.id)))
    }
    setRestoreResult(null)
    setSection('install')
  }

  const runRestore = async () => {
    if (!backupPath) return
    setRestoreResult(null)
    const result = await restore(backupPath, {
      drivers: restoreDrivers,
      tweaks: restoreTweaks,
      apps: restoreApps,
      selectedAppIds: restoreApps ? [...selectedRestoreApps] : []
    })
    setRestoreResult(result)
  }

  const nav = [
    ['plan', 'Install Plan', Archive],
    ['install', 'Wiederherstellen', Upload],
    ['checklist', 'Pre-Install Checkliste', CheckSquare],
    ['history', 'Install History', History]
  ] as const

  return (
    <div className="w-full max-w-[1450px] mx-auto p-8 space-y-6 pb-20">
      <header className="flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Windows Reinstall Assistant</h1>
            <span className="rounded-full border border-fluent-accent/30 bg-fluent-accent/15 px-2.5 py-0.5 text-xs text-fluent-accent font-semibold">
              v2.0 Clean Install
            </span>
          </div>
          <p className="mt-1 text-xs text-fluent-muted">
            Saubere Neuinstallation ohne Systemmüll: OEM-Treiber für Offline-Netzwerk sichern, Winget-Programme bündeln & Tweaks mitnehmen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSection('checklist')}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              section === 'checklist'
                ? 'border-fluent-accent bg-fluent-accent/15 text-fluent-accent'
                : 'border-fluent-border bg-fluent-card text-slate-300 hover:text-white'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Checkliste ({checkedList.size}/{DEFAULT_CHECKLIST.length})</span>
          </button>
          <Laptop className="h-8 w-8 text-fluent-accent" />
        </div>
      </header>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full shrink-0 space-y-2 rounded-fluent-lg border border-fluent-border bg-fluent-card/60 p-3 lg:w-60">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                section === id
                  ? 'bg-fluent-accent text-white font-semibold'
                  : 'text-fluent-muted hover:bg-fluent-card hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Progress Overlay */}
          {progress && isBusy && (
            <Card className="border-fluent-accent/40 bg-fluent-accent/5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-fluent-accent" />
                  {progress.message}
                </span>
                <span className="text-fluent-accent font-semibold">{progress.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fluent-bg">
                <div
                  className="h-full bg-fluent-accent transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </Card>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-fluent-status-red/40 bg-fluent-status-red/10 p-4 text-xs text-fluent-status-red">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Fehler aufgetreten</p>
                <p className="mt-0.5 text-fluent-muted">{error}</p>
              </div>
            </div>
          )}

          {/* SECTION: PLAN CREATION */}
          {section === 'plan' && (
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Installationsplan erstellen</h2>
                  <p className="text-xs text-fluent-muted">
                    Sichern Sie physische Treiber für den Offline-Start, Ihre Winget-Apps und Einstellungen in einem leichten .mtoolbox-Archiv.
                  </p>
                </div>
                <Archive className="h-6 w-6 text-fluent-accent" />
              </div>

              {/* Wizard Steps Bar */}
              <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { num: 1, label: 'System analysieren' },
                  { num: 2, label: 'Programme auswählen' },
                  { num: 3, label: 'Treiber & Hardware' },
                  { num: 4, label: 'Tweaks & Plan sichern' }
                ].map((item) => (
                  <button
                    key={item.num}
                    onClick={() => (step > item.num ? nextStep(item.num) : undefined)}
                    className={`rounded-lg border p-3 text-center text-[11px] transition-all ${
                      step === item.num
                        ? 'border-fluent-accent bg-fluent-accent/15 text-fluent-accent font-medium'
                        : 'border-fluent-border text-fluent-muted'
                    } ${step > item.num ? 'cursor-pointer hover:border-fluent-accent/50' : ''}`}
                  >
                    <span className="mb-1 block text-base font-bold">{item.num}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Step 1: System analysieren */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    M-Toolbox liest die aktuellen Hardwarekomponenten, installierte Winget-Pakete, aktive Windows-Tweaks und OEM-Treiber aus.
                  </p>
                  <div className="grid gap-2 md:grid-cols-5">
                    {systemRows.map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-fluent-border bg-fluent-bg/40 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-fluent-muted">{label}</p>
                        <p className="truncate text-xs font-medium text-slate-200 mt-0.5">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={startDiscovery}
                      disabled={isBusy}
                      className="rounded-lg bg-fluent-accent px-5 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>System & Programme jetzt scannen</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Programme auswählen */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Installierte Winget-Programme ({apps.length})</h3>
                      <p className="text-xs text-fluent-muted">
                        Wählen Sie die Anwendungen, die nach dem Reinstall automatisch wieder installiert werden sollen.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedApps(new Set(apps.map((a) => a.id)))}
                        className="rounded-lg border border-fluent-border px-3 py-1.5 text-xs text-slate-200 hover:bg-fluent-card"
                      >
                        Alle auswählen
                      </button>
                      <button
                        onClick={() => setSelectedApps(new Set())}
                        className="rounded-lg border border-fluent-border px-3 py-1.5 text-xs text-fluent-muted hover:bg-fluent-card"
                      >
                        Keine
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Programme filtern (z.B. Chrome, VSCode, Steam) …"
                      className="min-w-0 flex-1 rounded-lg border border-fluent-border bg-fluent-bg px-3 py-2 text-xs text-white placeholder-fluent-subtext focus:border-fluent-accent focus:outline-none"
                    />
                  </div>

                  <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {apps
                      .filter((app) => `${app.name} ${app.id}`.toLowerCase().includes(search.toLowerCase()))
                      .map((app) => {
                        const isChecked = selectedApps.has(app.id)
                        return (
                          <label
                            key={app.id}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-fluent-accent/40 bg-fluent-accent/10 text-white'
                                : 'border-fluent-border bg-fluent-bg/20 text-slate-300 hover:bg-fluent-bg/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setSelectedApps((current) => {
                                  const next = new Set(current)
                                  if (next.has(app.id)) next.delete(app.id)
                                  else next.add(app.id)
                                  return next
                                })
                              }
                              className="rounded border-fluent-border"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">{app.name}</span>
                            <span className="text-[11px] text-fluent-muted font-mono">{app.id}</span>
                          </label>
                        )
                      })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => nextStep(1)}
                      className="rounded-lg border border-fluent-border px-4 py-2 text-xs text-slate-300 hover:bg-fluent-card"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => nextStep(3)}
                      className="rounded-lg bg-fluent-accent px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
                    >
                      Weiter ({selectedApps.size} von {apps.length} gewählt)
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Treiber & Hardware */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Treiber & Offline-Hardwarekomponenten</h3>
                    <p className="text-xs text-fluent-muted">
                      Sichern Sie die herstellerspezifischen OEM-Treiber für eine garantierte Netzwerkverbindung direkt nach dem Setup.
                    </p>
                  </div>

                  {/* Offline Driver Toggle Callout */}
                  <div className="rounded-lg border border-fluent-accent/40 bg-fluent-accent/10 p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDrivers}
                        onChange={(e) => setIncludeDrivers(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-fluent-border text-fluent-accent"
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-white flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-fluent-accent" />
                          Physische OEM-Treiber sichern (pnputil /export-driver)
                          <span className="rounded bg-fluent-accent/20 px-1.5 py-0.5 text-[10px] text-fluent-accent">
                            Dringend empfohlen
                          </span>
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <strong>Warum ist das wichtig?</strong> Bei einer frischen Windows-Installation fehlen oft die Treiber für WLAN, LAN oder Touchpad. Ohne Internet können keine Programme geladen werden. Durch das Sichern der OEM-Treiber können Sie Ihr Netzwerk 100% offline wiederherstellen!
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Metric icon={HardDrive} label="Erkannte Geräte" value={drivers?.devices.length ?? 0} />
                    <Metric icon={Package} label="Treiberpakete" value={drivers?.packages.length ?? 0} />
                    <Metric
                      icon={ShieldCheck}
                      label="Offline-Wiederherstellung"
                      value={includeDrivers ? 'Aktiviert (pnputil)' : 'Deaktiviert'}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => nextStep(2)}
                      className="rounded-lg border border-fluent-border px-4 py-2 text-xs text-slate-300 hover:bg-fluent-card"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => nextStep(4)}
                      className="rounded-lg bg-fluent-accent px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
                    >
                      Weiter zu Tweaks & Export
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Tweaks, WLAN & Archiv speichern */}
              {step === 4 && !summary && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">System-Tweaks & Netzwerkprofile</h3>
                    <p className="text-xs text-fluent-muted">
                      Wählen Sie optionale Komponenten für den Reinstall-Plan.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Tweaks Toggle */}
                    <label className="flex items-start gap-3 rounded-lg border border-fluent-border bg-fluent-bg/40 p-3.5 cursor-pointer hover:bg-fluent-card">
                      <input
                        type="checkbox"
                        checked={includeTweaks}
                        onChange={(e) => setIncludeTweaks(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-fluent-border text-fluent-accent"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-white flex items-center gap-2">
                          <Sliders className="h-3.5 w-3.5 text-fluent-accent" />
                          Aktive Windows-Tweaks sichern
                        </span>
                        <p className="text-xs text-fluent-muted">
                          Speichert alle derzeit aktivierten Systemeinstellungen (z.B. Taskleiste, Explorer, Telemetrie) zur automatischen Wiederanwendung.
                        </p>
                      </div>
                    </label>

                    {/* WiFi Profiles Toggle */}
                    <label className="flex items-start gap-3 rounded-lg border border-fluent-border bg-fluent-bg/40 p-3.5 cursor-pointer hover:bg-fluent-card">
                      <input
                        type="checkbox"
                        checked={includeWifi}
                        onChange={(e) => setIncludeWifi(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-fluent-border text-fluent-accent"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-white flex items-center gap-2">
                          <Wifi className="h-3.5 w-3.5 text-fluent-accent" />
                          Gespeicherte WLAN-Netzwerkprofile sichern
                        </span>
                        <p className="text-xs text-fluent-muted">
                          Exportiert Ihre WLAN-Netzwerke, damit sich der neu installierte Rechner sofort automatisch wieder mit Ihrem Heimnetzwerk verbindet.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Auto-Restore Standalone Hint */}
                  <div className="rounded-lg border border-fluent-border bg-fluent-card/90 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-fluent-accent">
                      <Terminal className="h-4 w-4" />
                      <span>Integriertes Notfall-Skript: Auto-Restore.cmd</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Im erstellten <code>.mtoolbox</code>-Archiv befindet sich automatisch ein Standalone-Batchskript (<code>Auto-Restore.cmd</code>). Falls M-Toolbox nach dem Clean Install noch nicht gestartet werden kann, können Sie das Archiv einfach mit Explorer/7-Zip entpacken und per Rechtsklick &bdquo;Als Administrator ausführen&ldquo; sofort alle Treiber und WLAN-Profile offline installieren!
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => nextStep(3)}
                      className="rounded-lg border border-fluent-border px-4 py-2 text-xs text-slate-300 hover:bg-fluent-card"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={saveBackup}
                      disabled={isBusy}
                      className="rounded-lg bg-fluent-accent px-6 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Plan als .mtoolbox speichern</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Erfolgreich gespeichert */}
              {step === 5 && summary && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-fluent-status-green/40 bg-fluent-status-green/10 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-fluent-status-green shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">Reinstall-Plan erfolgreich erstellt!</h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Ihr Archiv enthält alle Voraussetzungen für einen reibungslosen Clean Reinstall.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Summary summary={summary} path={backupPath} onReset={resetPlan} />

                  <div className="rounded-lg border border-fluent-border bg-fluent-bg/40 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-fluent-accent" />
                      Nächste Schritte für Ihren Clean Install:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-fluent-muted">
                      <li>Kopieren Sie die erstellte <code>.mtoolbox</code>-Datei auf Ihren Installations-USB-Stick.</li>
                      <li>Legen Sie auch die portable Version von <strong>M-Toolbox</strong> auf den USB-Stick.</li>
                      <li>Überprüfen Sie vor dem Neustart die <button onClick={() => setSection('checklist')} className="text-fluent-accent underline">Pre-Install Checkliste</button>.</li>
                    </ol>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setSection('checklist')}
                      className="rounded-lg bg-fluent-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Zur Checkliste wechseln
                    </button>
                    <button
                      onClick={resetPlan}
                      className="rounded-lg border border-fluent-border px-4 py-2 text-xs text-slate-300 hover:bg-fluent-card"
                    >
                      Neuen Plan erstellen
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION: RESTORE / INSTALL */}
          {section === 'install' && (
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Reinstall & Wiederherstellung</h2>
                  <p className="text-xs text-fluent-muted">
                    Stellen Sie Treiber, Netzwerk, Tweaks und Programme nach einer frischen Windows-Installation wieder her.
                  </p>
                </div>
                <Upload className="h-6 w-6 text-fluent-accent" />
              </div>

              {!backupPath ? (
                <div className="space-y-4 text-center py-8">
                  <Archive className="h-12 w-12 text-fluent-accent mx-auto opacity-75" />
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-semibold text-white">Reinstall-Archiv laden</h3>
                    <p className="text-xs text-fluent-muted">
                      Wählen Sie Ihre zuvor gespeicherte <code>.mtoolbox</code>-Datei vom USB-Stick oder Ihrer externen Festplatte.
                    </p>
                  </div>
                  <button
                    onClick={chooseRestore}
                    className="rounded-lg bg-fluent-accent px-5 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 inline-flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>.mtoolbox Archiv auswählen</span>
                  </button>
                </div>
              ) : (
                summary && (
                  <div className="space-y-5">
                    {/* Archive Info Header */}
                    <div className="rounded-lg border border-fluent-border bg-fluent-bg/40 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            Archiv von {summary.manifest.computerName} ({summary.manifest.windowsVersion || 'Windows'})
                          </p>
                          <p className="text-[11px] text-fluent-muted mt-0.5 truncate max-w-xl">
                            {summary.filePath}
                          </p>
                        </div>
                        <button
                          onClick={chooseRestore}
                          className="rounded-lg border border-fluent-border px-3 py-1 text-xs text-slate-200 hover:bg-fluent-card"
                        >
                          Anderes Archiv wählen
                        </button>
                      </div>
                    </div>

                    {/* Metrics Badges */}
                    <div className="grid gap-3 md:grid-cols-4">
                      <Metric icon={Package} label="Programme" value={summary.appCount} />
                      <Metric
                        icon={HardDrive}
                        label="OEM-Treiber"
                        value={
                          summary.hasPhysicalDrivers ? (
                            <span className="text-fluent-status-green">Vorhanden (Offline)</span>
                          ) : (
                            <span className="text-fluent-muted">Nur Info</span>
                          )
                        }
                      />
                      <Metric icon={Sliders} label="Tweaks" value={summary.tweakCount} />
                      <Metric
                        icon={Clock3}
                        label="Erstellt am"
                        value={new Date(summary.manifest.createdAt).toLocaleDateString('de-DE')}
                      />
                    </div>

                    {/* Restore Configuration */}
                    <div className="space-y-3 rounded-lg border border-fluent-border bg-fluent-card p-4">
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Wiederherstellungs-Optionen
                      </h4>

                      <div className="space-y-2">
                        {summary.hasPhysicalDrivers && (
                          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={restoreDrivers}
                              onChange={(e) => setRestoreDrivers(e.target.checked)}
                              className="rounded border-fluent-border text-fluent-accent"
                            />
                            <span>
                              <strong>OEM-Treiber installieren</strong> (Netzwerk, WLAN, Audio per pnputil)
                            </span>
                          </label>
                        )}

                        {summary.tweakCount > 0 && (
                          <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={restoreTweaks}
                              onChange={(e) => setRestoreTweaks(e.target.checked)}
                              className="rounded border-fluent-border text-fluent-accent"
                            />
                            <span>
                              <strong>Windows-Tweaks anwenden</strong> ({summary.tweakCount} Einstellungen)
                            </span>
                          </label>
                        )}

                        {summary.appCount > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreApps}
                                  onChange={(e) => setRestoreApps(e.target.checked)}
                                  className="rounded border-fluent-border text-fluent-accent"
                                />
                                <span>
                                  <strong>Winget-Programme installieren</strong> ({selectedRestoreApps.size} von {summary.appCount} gewählt)
                                </span>
                              </label>
                              <button
                                onClick={() => setShowRestoreAppList((prev) => !prev)}
                                className="text-[11px] text-fluent-accent hover:underline"
                              >
                                {showRestoreAppList ? 'Liste verbergen' : 'Programme anpassen'}
                              </button>
                            </div>

                            {showRestoreAppList && summary.apps && (
                              <div className="max-h-56 overflow-y-auto space-y-1 rounded border border-fluent-border bg-fluent-bg/40 p-2 text-xs">
                                {summary.apps.map((app) => (
                                  <label key={app.id} className="flex items-center gap-2 p-1 hover:bg-fluent-card rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedRestoreApps.has(app.id)}
                                      onChange={() =>
                                        setSelectedRestoreApps((prev) => {
                                          const next = new Set(prev)
                                          if (next.has(app.id)) next.delete(app.id)
                                          else next.add(app.id)
                                          return next
                                        })
                                      }
                                    />
                                    <span className="truncate">{app.name}</span>
                                    <span className="text-fluent-muted text-[10px] ml-auto font-mono">{app.id}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result Summary */}
                    {restoreResult && (
                      <div
                        className={`rounded-lg border p-4 text-xs ${
                          restoreResult.success
                            ? 'border-fluent-status-green/40 bg-fluent-status-green/10 text-fluent-status-green'
                            : 'border-fluent-status-red/40 bg-fluent-status-red/10 text-fluent-status-red'
                        }`}
                      >
                        <p className="font-semibold flex items-center gap-2">
                          {restoreResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          {restoreResult.success ? 'Wiederherstellung erfolgreich!' : 'Fehler bei Wiederherstellung'}
                        </p>
                        {restoreResult.success && (
                          <p className="mt-1 text-slate-300">
                            Installierte Treiber: {restoreResult.installedDrivers ?? 0} · Angewendete Tweaks: {restoreResult.appliedTweaks ?? 0} · Installierte Apps: {restoreResult.installedApps ?? 0}
                          </p>
                        )}
                        {restoreResult.error && <p className="mt-1">{restoreResult.error}</p>}
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={runRestore}
                        disabled={isBusy || (!restoreDrivers && !restoreTweaks && (!restoreApps || selectedRestoreApps.size === 0))}
                        className="rounded-lg bg-fluent-accent px-6 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
                        <span>Wiederherstellung jetzt starten</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </Card>
          )}

          {/* SECTION: PRE-INSTALL CHECKLIST */}
          {section === 'checklist' && (
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Pre-Install Checkliste</h2>
                  <p className="text-xs text-fluent-muted">
                    Prüfen Sie diese Punkte vor dem Formatieren der Festplatte, damit keine Daten oder Zugänge verloren gehen.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-fluent-accent/15 border border-fluent-accent/30 px-3 py-1 text-xs text-fluent-accent font-semibold">
                    {checkedList.size} von {DEFAULT_CHECKLIST.length} erledigt
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {DEFAULT_CHECKLIST.map((item) => {
                  const isChecked = checkedList.has(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`rounded-lg border p-4 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-fluent-status-green/40 bg-fluent-status-green/5'
                          : 'border-fluent-border bg-fluent-card/50 hover:bg-fluent-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className="mt-0.5 text-slate-300 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleChecklistItem(item.id)
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-fluent-status-green" />
                          ) : (
                            <Square className="h-4 w-4 text-fluent-muted" />
                          )}
                        </button>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className={`text-xs font-semibold ${isChecked ? 'text-slate-300 line-through' : 'text-white'}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-fluent-muted leading-relaxed">
                            {item.detail}
                          </p>
                          {item.link && item.linkText && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.mToolbox.system.openExternal(item.link!)
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] text-fluent-accent hover:underline pt-1"
                            >
                              <span>{item.linkText}</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex justify-between items-center pt-2">
                <button
                  onClick={() => setCheckedList(new Set())}
                  className="text-xs text-fluent-muted hover:text-slate-300"
                >
                  Checkliste zurücksetzen
                </button>
                <button
                  onClick={() => setSection('plan')}
                  className="rounded-lg bg-fluent-accent px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
                >
                  Weiter zum Installationsplan
                </button>
              </div>
            </Card>
          )}

          {/* SECTION: HISTORY */}
          {section === 'history' && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-white">Install History</h2>
              {history.length === 0 ? (
                <p className="text-xs text-fluent-muted">Noch keine Wiederherstellungsläufe protokolliert.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item, index) => (
                    <div
                      key={`${item.createdAt}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-fluent-border bg-fluent-bg/30 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock3 className="h-4 w-4 text-fluent-muted" />
                        <span className="text-slate-200">
                          {new Date(item.createdAt).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <span
                        className={`font-semibold ${
                          item.status === 'success' ? 'text-fluent-status-green' : 'text-fluent-status-red'
                        }`}
                      >
                        {item.status === 'success' ? 'Erfolgreich' : 'Fehler'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

const Summary: React.FC<{
  summary: ReinstallArchiveSummary | null
  path?: string | null
  onReset?: () => void
}> = ({ summary, path }) => (
  <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-4">
      <Metric icon={Package} label="Programme" value={summary?.appCount ?? 0} />
      <Metric
        icon={HardDrive}
        label="Treiber"
        value={
          summary?.hasPhysicalDrivers ? (
            <span className="text-fluent-status-green">Offline-Export (pnputil)</span>
          ) : (
            `${summary?.driverCount ?? 0} erkannt`
          )
        }
      />
      <Metric icon={Sliders} label="Tweaks" value={summary?.tweakCount ?? 0} />
      <Metric
        icon={Clock3}
        label="Erstellt"
        value={summary ? new Date(summary.manifest.createdAt).toLocaleDateString('de-DE') : '—'}
      />
    </div>
    <div className="rounded-lg border border-fluent-border bg-fluent-bg/40 p-3 flex items-center gap-2">
      <FileText className="h-4 w-4 text-fluent-muted shrink-0" />
      <p className="truncate text-xs font-mono text-slate-300">{path || 'Kein Archivpfad'}</p>
    </div>
  </div>
)

const Metric: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}> = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border border-fluent-border bg-fluent-bg/40 p-3.5">
    <Icon className="mb-2 h-4 w-4 text-fluent-accent" />
    <p className="text-[11px] text-fluent-muted">{label}</p>
    <p className="text-sm font-semibold text-slate-100 mt-0.5">{value}</p>
  </div>
)

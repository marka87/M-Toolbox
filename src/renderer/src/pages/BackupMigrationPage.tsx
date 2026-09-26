import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Archive,
  RotateCcw,
  RefreshCw,
  Package,
  Cpu,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  Wifi,
  Sliders,
  Download,
  Upload,
  Search,
  Check,
  HardDrive
} from 'lucide-react'
import { useBackupMigration } from '../hooks/useBackupMigration'
import { Card } from '../components/ui/Card'
import { useTranslation } from '../i18n/LanguageContext'

export const BackupMigrationPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    activeTab,
    setActiveTab,
    createType,
    setCreateType,
    localJsonBackups,
    mtbxHistory,
    isLoadingHistory,
    discoveredData,
    isDiscovering,
    selectedBackup,
    jsonRestoreSelection,
    mtbxRestoreOptions,
    setMtbxRestoreOptions,
    isOperating,
    operationType,
    logs,
    reinstallProgress,
    operationResult,
    error,
    refreshAllHistory,
    discoverFullSystem,
    createQuickBackup,
    createFullBundle,
    selectAnyBackupFile,
    loadAndPreviewFile,
    restoreActive,
    toggleJsonCategory,
    toggleMtbxApp,
    toggleAllMtbxApps,
    clearLogs
  } = useBackupMigration()

  const checklistItems = useMemo(() => [
    {
      id: 'usb_iso',
      title: t.backup.checklist_usb_iso_title,
      detail: t.backup.checklist_usb_iso_detail,
      link: 'https://www.microsoft.com/software-download/windows11',
      linkText: t.backup.checklist_usb_iso_linkText
    },
    {
      id: 'portable_app',
      title: t.backup.checklist_portable_app_title,
      detail: t.backup.checklist_portable_app_detail,
      link: null,
      linkText: null
    },
    {
      id: 'save_bundle',
      title: t.backup.checklist_save_bundle_title,
      detail: t.backup.checklist_save_bundle_detail,
      link: null,
      linkText: null
    },
    {
      id: 'backup_data',
      title: t.backup.checklist_backup_data_title,
      detail: t.backup.checklist_backup_data_detail,
      link: null,
      linkText: null
    },
    {
      id: 'bitlocker_check',
      title: t.backup.checklist_bitlocker_check_title,
      detail: t.backup.checklist_bitlocker_check_detail,
      link: 'https://account.microsoft.com/devices/recoverykey',
      linkText: t.backup.checklist_bitlocker_check_linkText
    },
    {
      id: 'ms_account',
      title: t.backup.checklist_ms_account_title,
      detail: t.backup.checklist_ms_account_detail,
      link: null,
      linkText: null
    }
  ], [t])

  // Full creation options
  const [includeDrivers, setIncludeDrivers] = useState(true)
  const [includeApps, setIncludeApps] = useState(true)
  const [includeTweaks, setIncludeTweaks] = useState(true)
  const [includeWifi, setIncludeWifi] = useState(true)
  const [selectedCreationApps, setSelectedCreationApps] = useState<Set<string>>(new Set())
  const [appSearch, setAppSearch] = useState('')

  // Checklist state persisted in localStorage
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mtoolbox_reinstall_checklist')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const logRef = useRef<HTMLDivElement>(null)

  // Auto scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  // Discover system on switching to Full bundle
  useEffect(() => {
    if (createType === 'full' && discoveredData.apps.length === 0 && !isDiscovering) {
      discoverFullSystem()
    }
  }, [createType, discoveredData.apps.length, isDiscovering, discoverFullSystem])

  // Preselect all discovered apps
  useEffect(() => {
    if (discoveredData.apps.length > 0 && selectedCreationApps.size === 0) {
      setSelectedCreationApps(new Set(discoveredData.apps.map((a) => a.id)))
    }
  }, [discoveredData.apps, selectedCreationApps.size])

  // Toggle checklist
  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      try {
        localStorage.setItem('mtoolbox_reinstall_checklist', JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Filtered creation apps
  const filteredCreationApps = useMemo(() => {
    if (!appSearch.trim()) return discoveredData.apps
    const q = appSearch.toLowerCase()
    return discoveredData.apps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
    )
  }, [discoveredData.apps, appSearch])

  // Handle Full Bundle Creation
  const handleCreateFull = async () => {
    await createFullBundle({
      includeDrivers,
      includeTweaks,
      includeWifi,
      selectedAppIds: includeApps ? Array.from(selectedCreationApps) : []
    })
  }

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fluent-accent/10 text-fluent-accent">
              <Archive className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fluent-text">{t.backup.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30">
              {t.backup.badge}
            </span>
          </div>
          <p className="text-sm text-fluent-muted mt-1">
            {t.backup.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => selectAnyBackupFile()}
            disabled={isOperating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title={t.backup.openBackupTooltip}
          >
            <FolderOpen className="w-3.5 h-3.5 text-fluent-accent" />
            {t.backup.openBackupBtn}
          </button>

          <button
            onClick={() => refreshAllHistory()}
            disabled={isLoadingHistory || isOperating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title={t.backup.refreshTooltip}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isLoadingHistory ? 'animate-spin' : ''}`} />
            {t.backup.refreshBtn}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-fluent-border pb-1">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'create'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {t.backup.tabCreate}
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'restore'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          {t.backup.tabRestore}
          {selectedBackup && (
            <span className="w-2 h-2 rounded-full bg-fluent-accent animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {t.backup.tabChecklist}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fluent-card border border-fluent-border text-fluent-muted">
            {checkedItems.size}/{checklistItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t.backup.tabHistory.replace('{count}', String(localJsonBackups.length + mtbxHistory.length))}
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearLogs} className="text-rose-400 hover:text-rose-200 text-xs font-semibold">
            {t.backup.dismissError}
          </button>
        </div>
      )}

      {/* Global Success Banner */}
      {operationResult && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{operationResult.message}</span>
          </div>
          {operationResult.details && operationResult.details.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-300/80 pl-2">
              {operationResult.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* TAB 1: Sicherung erstellen */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Modus Toggle: Quick JSON vs Full Reinstall Bundle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick JSON Mode */}
            <div
              onClick={() => setCreateType('quick')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                createType === 'quick'
                  ? 'border-fluent-accent bg-fluent-accent/10 shadow-fluent ring-1 ring-fluent-accent/50'
                  : 'border-fluent-border bg-fluent-card/70 hover:border-fluent-border-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fluent-text">{t.backup.modeQuickTitle}</h3>
                    <span className="text-[11px] text-fluent-muted">{t.backup.modeQuickSubtitle}</span>
                  </div>
                </div>
                {createType === 'quick' && (
                  <span className="p-1 rounded-full bg-fluent-accent text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-fluent-muted mt-3 leading-relaxed">
                {t.backup.modeQuickDesc}
              </p>
            </div>

            {/* Full Reinstall Bundle Mode */}
            <div
              onClick={() => setCreateType('full')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                createType === 'full'
                  ? 'border-fluent-accent bg-fluent-accent/10 shadow-fluent ring-1 ring-fluent-accent/50'
                  : 'border-fluent-border bg-fluent-card/70 hover:border-fluent-border-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fluent-text">{t.backup.modeFullTitle}</h3>
                    <span className="text-[11px] text-fluent-muted">{t.backup.modeFullSubtitle}</span>
                  </div>
                </div>
                {createType === 'full' && (
                  <span className="p-1 rounded-full bg-fluent-accent text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-fluent-muted mt-3 leading-relaxed">
                {t.backup.modeFullDesc}
              </p>
            </div>
          </div>

          {/* Form Content: QUICK JSON */}
          {createType === 'quick' && (
            <Card className="p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  {t.backup.quickIncludedTitle}
                </h3>
                <p className="text-xs text-fluent-muted">
                  {t.backup.quickIncludedSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-center gap-3">
                  <Package className="w-4 h-4 text-fluent-accent" />
                  <div className="text-xs">
                    <div className="font-semibold text-fluent-text">{t.backup.compWingetTitle}</div>
                    <div className="text-fluent-muted text-[11px]">{t.backup.compWingetDesc}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-fluent-accent" />
                  <div className="text-xs">
                    <div className="font-semibold text-fluent-text">{t.backup.compExplorerTitle}</div>
                    <div className="text-fluent-muted text-[11px]">{t.backup.compExplorerDesc}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-fluent-accent" />
                  <div className="text-xs">
                    <div className="font-semibold text-fluent-text">{t.backup.compFontsTitle}</div>
                    <div className="text-fluent-muted text-[11px]">{t.backup.compFontsDesc}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-fluent-accent" />
                  <div className="text-xs">
                    <div className="font-semibold text-fluent-text">{t.backup.compWallpaperTitle}</div>
                    <div className="text-fluent-muted text-[11px]">{t.backup.compWallpaperDesc}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-fluent-accent" />
                  <div className="text-xs">
                    <div className="font-semibold text-fluent-text">{t.backup.compPowerShellTitle}</div>
                    <div className="text-fluent-muted text-[11px]">{t.backup.compPowerShellDesc}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-end gap-3 border-t border-fluent-border">
                <button
                  onClick={() => createQuickBackup(true)}
                  disabled={isOperating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-all disabled:opacity-50"
                >
                  {t.backup.chooseLocationBtn}
                </button>
                <button
                  onClick={() => createQuickBackup(false)}
                  disabled={isOperating}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                  {isOperating ? t.backup.creatingQuickBtn : t.backup.createQuickBtn}
                </button>
              </div>
            </Card>
          )}

          {/* Form Content: FULL REINSTALL BUNDLE */}
          {createType === 'full' && (
            <div className="space-y-4">
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {t.backup.fullConfigTitle}
                    </h3>
                    <p className="text-xs text-fluent-muted">
                      {t.backup.fullConfigSubtitle}
                    </p>
                  </div>
                  {isDiscovering && (
                    <div className="flex items-center gap-2 text-xs text-fluent-accent">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t.backup.discoveringSystem}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Drivers Checkbox */}
                  <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                    <input
                      type="checkbox"
                      checked={includeDrivers}
                      onChange={(e) => setIncludeDrivers(e.target.checked)}
                      className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-fluent-accent" />
                        {t.backup.compDriversTitle}
                      </div>
                      <div className="text-fluent-muted text-[11px] mt-0.5">
                        {discoveredData.drivers
                          ? t.backup.compDriversPackagesCount.replace('{count}', String(discoveredData.drivers.packages.length))
                          : t.backup.compDriversFallback}
                      </div>
                    </div>
                  </label>

                  {/* Apps Checkbox */}
                  <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                    <input
                      type="checkbox"
                      checked={includeApps}
                      onChange={(e) => setIncludeApps(e.target.checked)}
                      className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-fluent-accent" />
                        {t.backup.compAppsTitle}
                      </div>
                      <div className="text-fluent-muted text-[11px] mt-0.5">
                        {t.backup.compAppsSelectedCount
                          .replace('{selected}', String(selectedCreationApps.size))
                          .replace('{total}', String(discoveredData.apps.length))}
                      </div>
                    </div>
                  </label>

                  {/* Tweaks Checkbox */}
                  <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                    <input
                      type="checkbox"
                      checked={includeTweaks}
                      onChange={(e) => setIncludeTweaks(e.target.checked)}
                      className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-fluent-accent" />
                        {t.backup.compTweaksTitle}
                      </div>
                      <div className="text-fluent-muted text-[11px] mt-0.5">
                        {t.backup.compTweaksDesc}
                      </div>
                    </div>
                  </label>

                  {/* Wifi Checkbox */}
                  <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                    <input
                      type="checkbox"
                      checked={includeWifi}
                      onChange={(e) => setIncludeWifi(e.target.checked)}
                      className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-fluent-accent" />
                        {t.backup.compWifiTitle}
                      </div>
                      <div className="text-fluent-muted text-[11px] mt-0.5">
                        {t.backup.compWifiDesc}
                      </div>
                    </div>
                  </label>
                </div>

                {/* App Selector table if includeApps is true */}
                {includeApps && discoveredData.apps.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-200">
                        {t.backup.selectAppsTitle
                          .replace('{selected}', String(selectedCreationApps.size))
                          .replace('{total}', String(discoveredData.apps.length))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fluent-muted" />
                          <input
                            type="text"
                            value={appSearch}
                            onChange={(e) => setAppSearch(e.target.value)}
                            placeholder={t.backup.filterAppsPlaceholder}
                            className="bg-fluent-card border border-fluent-border rounded-lg pl-8 pr-2.5 py-1 text-xs text-fluent-text placeholder:text-fluent-muted focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (selectedCreationApps.size === discoveredData.apps.length) {
                              setSelectedCreationApps(new Set())
                            } else {
                              setSelectedCreationApps(new Set(discoveredData.apps.map((a) => a.id)))
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border text-fluent-text hover:bg-fluent-card-hover"
                        >
                          {selectedCreationApps.size === discoveredData.apps.length
                            ? t.backup.deselectAllApps
                            : t.backup.selectAllApps}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-fluent-border bg-fluent-card/70 divide-y divide-fluent-border-subtle text-xs">
                      {filteredCreationApps.map((app) => {
                        const isChecked = selectedCreationApps.has(app.id)
                        return (
                          <div
                            key={app.id}
                            onClick={() => {
                              setSelectedCreationApps((prev) => {
                                const next = new Set(prev)
                                if (next.has(app.id)) next.delete(app.id)
                                else next.add(app.id)
                                return next
                              })
                            }}
                            className="px-3.5 py-2 flex items-center justify-between hover:bg-fluent-card-hover/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-fluent-accent shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-fluent-muted shrink-0" />
                              )}
                              <span className="font-medium text-fluent-text truncate">{app.name}</span>
                            </div>
                            <span className="font-mono text-[11px] text-fluent-muted shrink-0 pl-2">
                              {app.version || 'Latest'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-fluent-border">
                  <button
                    onClick={handleCreateFull}
                    disabled={isOperating || isDiscovering}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <HardDrive className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                    {isOperating ? t.backup.savingBundleBtn : t.backup.saveBundleBtn}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Live Progress & Log Terminal during Creation */}
          {isOperating && operationType === 'create' && (
            <Card className="p-4 space-y-3 border-fluent-accent/40 bg-fluent-card/90">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fluent-text flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-fluent-accent animate-spin" />
                  {t.backup.backupRunningTitle}
                </span>
                {reinstallProgress && (
                  <span className="font-mono font-bold text-fluent-accent">
                    {reinstallProgress.percent}% ({reinstallProgress.phase})
                  </span>
                )}
              </div>

              {reinstallProgress && (
                <div className="w-full h-1.5 bg-fluent-card-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fluent-accent transition-all duration-300"
                    style={{ width: `${reinstallProgress.percent}%` }}
                  />
                </div>
              )}

              <div
                ref={logRef}
                className="max-h-36 overflow-y-auto font-mono text-[11px] bg-black/40 p-2.5 rounded-lg text-slate-300 space-y-0.5"
              >
                {logs.slice(-15).map((l, i) => (
                  <div key={i} className="truncate">{l}</div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: Wiederherstellen */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* No Backup Selected: Picker & Local List */}
          {!selectedBackup ? (
            <div className="space-y-6">
              <div
                onClick={() => selectAnyBackupFile()}
                className="border-2 border-dashed border-fluent-border hover:border-fluent-accent/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-fluent-card/40 hover:bg-fluent-card/70 group"
              >
                <div className="p-4 rounded-2xl bg-fluent-accent/10 text-fluent-accent group-hover:scale-110 transition-transform mb-3">
                  <Download className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-fluent-text">{t.backup.dropzoneTitle}</h3>
                <p className="text-xs text-fluent-muted max-w-md mt-1">
                  {t.backup.dropzoneDesc}
                </p>
                <span className="mt-4 px-4 py-1.5 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border text-fluent-text group-hover:border-fluent-accent">
                  {t.backup.browseFileBtn}
                </span>
              </div>

              {/* Local Backups Table */}
              {localJsonBackups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-200">
                    {t.backup.localBackupsTitle.replace('{count}', String(localJsonBackups.length))}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {localJsonBackups.map((b, idx) => {
                      const fileName = b.filePath ? b.filePath.split(/[/\\]/).pop() || 'Backup.json' : `Backup-${idx + 1}.json`
                      return (
                        <div
                          key={b.filePath || idx}
                          onClick={() => loadAndPreviewFile(b.filePath || '')}
                          className="p-4 rounded-xl border border-fluent-border bg-fluent-card/70 hover:border-fluent-accent/50 cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div className="space-y-1 truncate pr-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-fluent-text truncate">{fileName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                                JSON
                              </span>
                            </div>
                            <div className="text-[11px] text-fluent-muted flex items-center gap-2">
                              <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{b.wingetCount} Apps</span>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-card-hover border border-fluent-border text-fluent-text shrink-0">
                            {t.backup.loadBtn}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Selected Backup View & Restore Options */
            <div className="space-y-5">
              {/* Selected Backup Header Card */}
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-fluent-text">
                        {selectedBackup.fileName}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          selectedBackup.type === 'mtoolbox'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {selectedBackup.type === 'mtoolbox' ? t.backup.badgeReinstallBundle : t.backup.badgeQuickBackup}
                      </span>
                    </div>
                    <div className="text-xs text-fluent-muted flex flex-wrap items-center gap-3 pt-0.5">
                      <span>{t.backup.createdLabel} <b>{new Date(selectedBackup.createdAt).toLocaleString()}</b></span>
                      <span>•</span>
                      <span>{t.backup.pcLabel} <b>{selectedBackup.computerName}</b></span>
                      <span>•</span>
                      <span>{t.backup.osLabel} <b>{selectedBackup.osVersion}</b></span>
                    </div>
                  </div>

                  <button
                    onClick={() => selectAnyBackupFile()}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-all self-start sm:self-center"
                  >
                    {t.backup.otherFileBtn}
                  </button>
                </div>
              </Card>

              {/* JSON Restore Options */}
              {selectedBackup.type === 'json' && selectedBackup.jsonSummary && (
                <Card className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {t.backup.restoreCatsTitle}
                    </h3>
                    <p className="text-xs text-fluent-muted">
                      {t.backup.restoreCatsSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={jsonRestoreSelection.winget}
                        onChange={() => toggleJsonCategory('winget')}
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text">{t.backup.compWingetTitle}</div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.restoreWingetDesc.replace('{count}', String(selectedBackup.jsonSummary.wingetCount))}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={jsonRestoreSelection.explorer}
                        onChange={() => toggleJsonCategory('explorer')}
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text">{t.backup.compExplorerTitle}</div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.restoreExplorerDesc}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={jsonRestoreSelection.fonts}
                        onChange={() => toggleJsonCategory('fonts')}
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text">{t.backup.compFontsTitle}</div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.restoreFontsDesc.replace('{count}', String(selectedBackup.jsonSummary.fontsCount))}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={jsonRestoreSelection.wallpaper}
                        onChange={() => toggleJsonCategory('wallpaper')}
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text">{t.backup.compWallpaperTitle}</div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.restoreWallpaperDesc}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={jsonRestoreSelection.powershellModules}
                        onChange={() => toggleJsonCategory('powershellModules')}
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text">{t.backup.compPowerShellTitle}</div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.restorePowerShellDesc.replace('{count}', String(selectedBackup.jsonSummary.powershellModulesCount))}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="pt-3 flex items-center justify-end border-t border-fluent-border">
                    <button
                      onClick={() => restoreActive()}
                      disabled={isOperating}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                      {isOperating ? t.backup.restoringBtn : t.backup.restoreSelectedBtn}
                    </button>
                  </div>
                </Card>
              )}

              {/* MTBX Restore Options */}
              {selectedBackup.type === 'mtoolbox' && selectedBackup.mtbxSummary && (
                <Card className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {t.backup.mtbxCompTitle}
                    </h3>
                    <p className="text-xs text-fluent-muted">
                      {t.backup.mtbxCompSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={mtbxRestoreOptions.restoreDrivers}
                        onChange={(e) =>
                          setMtbxRestoreOptions((prev) => ({ ...prev, restoreDrivers: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-fluent-accent" />
                          {t.backup.compDriversTitle}
                        </div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.mtbxDriversDesc.replace('{count}', String(selectedBackup.mtbxSummary.driverCount))}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={mtbxRestoreOptions.restoreApps}
                        onChange={(e) =>
                          setMtbxRestoreOptions((prev) => ({ ...prev, restoreApps: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-fluent-accent" />
                          {t.backup.compAppsTitle}
                        </div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.mtbxAppsDesc
                            .replace('{selected}', String(mtbxRestoreOptions.selectedAppIds.size))
                            .replace('{total}', String(selectedBackup.mtbxSummary.appCount))}
                        </div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3 cursor-pointer hover:border-fluent-border-hover">
                      <input
                        type="checkbox"
                        checked={mtbxRestoreOptions.restoreTweaks}
                        onChange={(e) =>
                          setMtbxRestoreOptions((prev) => ({ ...prev, restoreTweaks: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-fluent-accent focus:ring-0"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-fluent-text flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-fluent-accent" />
                          {t.backup.compTweaksTitle}
                        </div>
                        <div className="text-fluent-muted text-[11px] mt-0.5">
                          {t.backup.mtbxTweaksDesc}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* App Selection list if restoreApps is active */}
                  {mtbxRestoreOptions.restoreApps &&
                    selectedBackup.mtbxSummary.apps &&
                    selectedBackup.mtbxSummary.apps.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200">
                            {t.backup.selectAppsToInstallTitle}
                          </span>
                          <button
                            onClick={() =>
                              toggleAllMtbxApps(selectedBackup.mtbxSummary!.apps!.map((a) => a.id))
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border text-fluent-text hover:bg-fluent-card-hover"
                          >
                            {mtbxRestoreOptions.selectedAppIds.size === selectedBackup.mtbxSummary.apps.length
                              ? t.backup.deselectAllApps
                              : t.backup.selectAllApps}
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto rounded-xl border border-fluent-border bg-fluent-card/70 divide-y divide-fluent-border-subtle text-xs">
                          {selectedBackup.mtbxSummary.apps.map((app) => {
                            const isChecked = mtbxRestoreOptions.selectedAppIds.has(app.id)
                            return (
                              <div
                                key={app.id}
                                onClick={() => toggleMtbxApp(app.id)}
                                className="px-3.5 py-2 flex items-center justify-between hover:bg-fluent-card-hover/60 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-fluent-accent shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-fluent-muted shrink-0" />
                                  )}
                                  <span className="font-medium text-fluent-text truncate">{app.name}</span>
                                </div>
                                <span className="font-mono text-[11px] text-fluent-muted shrink-0 pl-2">
                                  {app.id}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  <div className="pt-3 flex items-center justify-end border-t border-fluent-border">
                    <button
                      onClick={() => restoreActive()}
                      disabled={isOperating}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                      {isOperating ? t.backup.restoringBtn : t.backup.applyBundleBtn}
                    </button>
                  </div>
                </Card>
              )}

              {/* Progress & Log terminal during Restore */}
              {isOperating && operationType === 'restore' && (
                <Card className="p-4 space-y-3 border-fluent-accent/40 bg-fluent-card/90">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fluent-text flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-fluent-accent animate-spin" />
                      {t.backup.restoringRunningTitle}
                    </span>
                    {reinstallProgress && (
                      <span className="font-mono font-bold text-fluent-accent">
                        {reinstallProgress.percent}% ({reinstallProgress.phase})
                      </span>
                    )}
                  </div>

                  {reinstallProgress && (
                    <div className="w-full h-1.5 bg-fluent-card-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fluent-accent transition-all duration-300"
                        style={{ width: `${reinstallProgress.percent}%` }}
                      />
                    </div>
                  )}

                  <div
                    ref={logRef}
                    className="max-h-36 overflow-y-auto font-mono text-[11px] bg-black/40 p-2.5 rounded-lg text-slate-300 space-y-0.5"
                  >
                    {logs.slice(-15).map((l, i) => (
                      <div key={i} className="truncate">{l}</div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Clean-Install Checkliste */}
      {activeTab === 'checklist' && (
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-fluent-accent" />
                  {t.backup.checklistTitle}
                </h3>
                <p className="text-xs text-fluent-muted">
                  {t.backup.checklistSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-fluent-accent">
                <span>
                  {t.backup.checklistProgress
                    .replace('{done}', String(checkedItems.size))
                    .replace('{total}', String(checklistItems.length))}
                </span>
              </div>
            </div>

            {/* Checklist progress bar */}
            <div className="w-full h-2 bg-fluent-card-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${Math.round((checkedItems.size / checklistItems.length) * 100)}%`
                }}
              />
            </div>

            <div className="space-y-3 pt-2">
              {checklistItems.map((item, idx) => {
                const isDone = checkedItems.has(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isDone
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-fluent-border bg-fluent-card/60 hover:border-fluent-border-hover'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-lg border border-fluent-border flex items-center justify-center text-[10px] font-bold text-fluent-muted">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isDone ? 'text-emerald-200 line-through' : 'text-fluent-text'}`}>
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-fluent-muted leading-relaxed">
                        {item.detail}
                      </p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.mToolbox?.system?.openExternal(item.link!)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-fluent-accent hover:underline pt-1"
                        >
                          {item.linkText}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Sicherungs-Verlauf */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              {t.backup.historyListTitle.replace('{count}', String(localJsonBackups.length + mtbxHistory.length))}
            </h3>
            <button
              onClick={() => refreshAllHistory()}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              {t.backup.refreshBtn}
            </button>
          </div>

          {localJsonBackups.length === 0 && mtbxHistory.length === 0 ? (
            <Card className="p-8 text-center text-xs text-fluent-muted space-y-2">
              <Archive className="w-8 h-8 mx-auto text-fluent-muted/60" />
              <p className="font-semibold text-fluent-text">{t.backup.noHistoryTitle}</p>
              <p>{t.backup.noHistoryDesc}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Local JSON Backups */}
              {localJsonBackups.map((b, idx) => {
                const fileName = b.filePath ? b.filePath.split(/[/\\]/).pop() || 'Backup.json' : `Backup-${idx + 1}.json`
                return (
                  <div
                    key={b.filePath || idx}
                    className="p-4 rounded-xl border border-fluent-border bg-fluent-card/70 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-fluent-text truncate">{fileName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                          JSON
                        </span>
                      </div>
                      <div className="text-[11px] text-fluent-muted flex items-center gap-3">
                        <span>{new Date(b.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>{b.wingetCount} Apps</span>
                      </div>
                      <p className="text-[11px] text-fluent-text/80">
                        {t.backup.historyAppsDesc.replace('{count}', String(b.wingetCount))}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-fluent-border-subtle">
                      <button
                        onClick={() => loadAndPreviewFile(b.filePath || '')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fluent-accent/15 text-fluent-accent hover:bg-fluent-accent hover:text-white transition-all"
                      >
                        {t.backup.loadIntoRestoreBtn}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* MTBX History */}
              {mtbxHistory.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-fluent-border bg-fluent-card/70 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-fluent-text truncate">
                        {m.details || 'Reinstall-Bundle'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                        .MTOOLBOX
                      </span>
                    </div>
                    <div className="text-[11px] text-fluent-muted">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                      {t.backup.statusLabel.replace('{status}', m.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-fluent-border-subtle">
                    <button
                      onClick={() => selectAnyBackupFile()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-all"
                    >
                      {t.backup.openFileBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export default BackupMigrationPage


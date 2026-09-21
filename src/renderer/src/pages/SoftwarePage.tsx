import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Package,
  RefreshCw,
  Search,
  ArrowUpCircle,
  CheckCircle2,
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
  XCircle,
  LayoutGrid,
  List,
  Grid
} from 'lucide-react'
import { useSoftware } from '../hooks/useSoftware'
import { PackageCard, type SoftwareViewMode } from '../components/ui/PackageCard'
import { BatchActionBar } from '../components/ui/BatchActionBar'
import type { SoftwareCategory } from '@shared/types'

type ActiveTab = 'catalog' | 'installed' | 'updates'

const CATEGORIES: { id: SoftwareCategory; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'browser', label: 'Browser' },
  { id: 'dev', label: 'Entwicklung' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'media', label: 'Media' },
  { id: 'communication', label: 'Kommunikation' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'runtimes', label: 'Runtimes' }
]

export const SoftwarePage: React.FC = () => {
  const {
    catalog,
    installed,
    updates,
    isLoading,
    isOperating,
    activePackageId,
    operationLogs,
    selectedPackages,
    toggleSelectPackage,
    clearSelection,
    clearLogs,
    refresh,
    installPackage,
    uninstallPackage,
    upgradePackage,
    upgradeAll,
    installBatch
  } = useSoftware()

  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog')
  const [selectedCategory, setSelectedCategory] = useState<SoftwareCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<SoftwareViewMode>('normal')
  const [showLogs, setShowLogs] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-open logs when an operation starts
  useEffect(() => {
    if (isOperating) {
      setShowLogs(true)
    }
  }, [isOperating])

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [operationLogs])

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((pkg) => {
      const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        pkg.name.toLowerCase().includes(q) ||
        pkg.id.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [catalog, selectedCategory, searchQuery])

  // Filtered Installed
  const filteredInstalled = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return installed.filter((pkg) => {
      return !q || pkg.name.toLowerCase().includes(q) || pkg.id.toLowerCase().includes(q)
    })
  }, [installed, searchQuery])

  // Filtered Updates
  const filteredUpdates = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return updates.filter((pkg) => {
      return !q || pkg.name.toLowerCase().includes(q) || pkg.id.toLowerCase().includes(q)
    })
  }, [updates, searchQuery])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Software Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fluent-accent/20 text-fluent-accent border border-fluent-accent/30">
              winget powered
            </span>
          </div>
          <p className="text-xs text-fluent-muted mt-1">
            Verwalte Windows-Software, installiere kuratierte Tools lautlos und halte Programme aktuell.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLogs((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-fluent text-xs font-medium border transition-colors ${
              showLogs || isOperating
                ? 'bg-fluent-accent/20 border-fluent-accent/50 text-fluent-accent'
                : 'bg-fluent-card border-fluent-border text-fluent-muted hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Protokoll {operationLogs.length > 0 && `(${operationLogs.length})`}</span>
            {showLogs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={refresh}
            disabled={isLoading || isOperating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-fluent bg-fluent-card hover:bg-fluent-card-hover border border-fluent-border text-xs font-medium text-slate-200 transition-colors shadow-fluent-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-fluent-accent' : ''}`} />
            <span>Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-fluent-border/70 pb-3">
        <button
          onClick={() => {
            setActiveTab('catalog')
            setSearchQuery('')
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'catalog'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog & Empfehlungen</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {catalog.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('installed')
            setSearchQuery('')
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'installed'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Installierte Programme</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {installed.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('updates')
            setSearchQuery('')
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
            activeTab === 'updates'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Verfügbare Updates</span>
          {updates.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-fluent-status-yellow text-slate-950 font-bold">
              {updates.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fluent-muted" />
          <input
            type="text"
            placeholder={
              activeTab === 'catalog'
                ? 'Katalog durchsuchen...'
                : activeTab === 'installed'
                ? 'Installierte Software durchsuchen...'
                : 'Updates durchsuchen...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-fluent-card border border-fluent-border text-xs text-slate-100 placeholder:text-fluent-muted focus:outline-none focus:border-fluent-accent transition-colors"
          />
        </div>

        {/* Category Pills & View Switcher (Only for Catalog) */}
        {activeTab === 'catalog' && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 max-w-full">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-fluent-card border border-fluent-accent text-fluent-accent'
                      : 'bg-fluent-card/50 border border-fluent-border/60 text-fluent-muted hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg bg-fluent-card border border-fluent-border/70 p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('normal')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'normal'
                    ? 'bg-fluent-accent text-white shadow-sm'
                    : 'text-fluent-muted hover:text-white'
                }`}
                title="Normal (Karten-Ansicht)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'compact'
                    ? 'bg-fluent-accent text-white shadow-sm'
                    : 'text-fluent-muted hover:text-white'
                }`}
                title="Kompakt (Listen-Ansicht)"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('icons')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'icons'
                    ? 'bg-fluent-accent text-white shadow-sm'
                    : 'text-fluent-muted hover:text-white'
                }`}
                title="Icons (Kachel-Ansicht)"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === 'catalog' && (
        <div>
          {isLoading && catalog.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-fluent-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-fluent-accent" />
              <p className="text-xs">Lade Softwarekatalog und prüfe Systemstatus...</p>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="py-16 text-center text-fluent-muted text-xs">
              Keine Software gefunden für &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div
              className={
                viewMode === 'normal'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                  : viewMode === 'compact'
                  ? 'flex flex-col space-y-2'
                  : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3'
              }
            >
              {filteredCatalog.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  isSelected={selectedPackages.has(pkg.id)}
                  isOperating={isOperating}
                  isCurrentActive={activePackageId === pkg.id}
                  viewMode={viewMode}
                  onToggleSelect={toggleSelectPackage}
                  onInstall={installPackage}
                  onUninstall={uninstallPackage}
                  onUpgrade={upgradePackage}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Installed Packages */}
      {activeTab === 'installed' && (
        <div className="space-y-4">
          {isLoading && installed.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-fluent-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-fluent-accent" />
              <p className="text-xs">Lese installierte Programme via winget list aus...</p>
            </div>
          ) : filteredInstalled.length === 0 ? (
            <div className="py-16 text-center text-fluent-muted text-xs">
              Keine installierten Programme gefunden.
            </div>
          ) : (
            <div className="rounded-fluent border border-fluent-border overflow-hidden bg-fluent-card/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-fluent-border bg-fluent-card/80 text-fluent-subtext font-semibold">
                    <th className="py-3 px-4">Programmname</th>
                    <th className="py-3 px-4">Paket-ID</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Quelle</th>
                    <th className="py-3 px-4 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fluent-border/40">
                  {filteredInstalled.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-fluent-card/40 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-200">{pkg.name}</td>
                      <td className="py-2.5 px-4 text-fluent-muted font-mono text-[11px] truncate max-w-[200px]">
                        {pkg.id}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-fluent-bg text-[11px] border border-fluent-border/40 font-mono">
                          {pkg.version}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-fluent-muted text-[11px]">{pkg.source || 'Lokal'}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => uninstallPackage(pkg.id)}
                          disabled={isOperating}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-fluent-muted hover:text-fluent-status-red hover:bg-fluent-status-red/10 border border-transparent hover:border-fluent-status-red/30 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Deinstallieren</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Updates */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          {/* Action Banner */}
          <div className="p-4 rounded-fluent border border-fluent-status-yellow/30 bg-fluent-status-yellow/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fluent-status-yellow/20 flex items-center justify-center text-fluent-status-yellow shrink-0">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {updates.length === 0
                    ? 'Alle Programme sind auf dem neuesten Stand!'
                    : `${updates.length} Programm-Aktualisierungen verfügbar`}
                </h3>
                <p className="text-xs text-fluent-muted">
                  Aktualisiere einzelne Programme oder führe ein Gesamtes System-Upgrade durch.
                </p>
              </div>
            </div>

            {updates.length > 0 && (
              <button
                onClick={upgradeAll}
                disabled={isOperating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fluent-status-yellow hover:bg-fluent-status-yellow/90 text-slate-950 text-xs font-bold shadow-fluent-sm transition-colors disabled:opacity-50"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Alle {updates.length} aktualisieren</span>
              </button>
            )}
          </div>

          {isLoading && updates.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-fluent-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-fluent-accent" />
              <p className="text-xs">Prüfe Software-Updates via winget upgrade...</p>
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="py-12 text-center text-fluent-muted text-xs">
              Keine ausstehenden Updates vorhanden.
            </div>
          ) : (
            <div className="rounded-fluent border border-fluent-border overflow-hidden bg-fluent-card/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-fluent-border bg-fluent-card/80 text-fluent-subtext font-semibold">
                    <th className="py-3 px-4">Programmname</th>
                    <th className="py-3 px-4">Paket-ID</th>
                    <th className="py-3 px-4">Installiert</th>
                    <th className="py-3 px-4">Neue Version</th>
                    <th className="py-3 px-4 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fluent-border/40">
                  {filteredUpdates.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-fluent-card/40 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-200">{pkg.name}</td>
                      <td className="py-2.5 px-4 text-fluent-muted font-mono text-[11px] truncate max-w-[200px]">
                        {pkg.id}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-mono text-[11px]">
                        {pkg.currentVersion}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-fluent-status-yellow font-semibold">
                        {pkg.availableVersion}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => upgradePackage(pkg.id)}
                          disabled={isOperating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-fluent-status-yellow/20 hover:bg-fluent-status-yellow/30 text-fluent-status-yellow border border-fluent-status-yellow/40 transition-colors disabled:opacity-50"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Floating Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedPackages.size}
        isOperating={isOperating}
        onClear={clearSelection}
        onInstallSelected={() => installBatch(Array.from(selectedPackages))}
      />

      {/* Live Log Console Drawer */}
      {showLogs && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-fluent-sidebar/95 border-t border-fluent-border backdrop-blur-md shadow-2xl p-4 transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-fluent-border/60 mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-fluent-accent" />
              <span className="text-xs font-semibold text-slate-200">
                Winget Live-Ausgabe {isOperating && <span className="text-fluent-accent animate-pulse font-normal">(Ausführung läuft...)</span>}
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
            {operationLogs.length === 0 ? (
              <span className="text-fluent-muted italic">Keine aktuellen Ausgaben vorhanden.</span>
            ) : (
              operationLogs.map((line, idx) => (
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


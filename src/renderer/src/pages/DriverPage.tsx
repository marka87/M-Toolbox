import React from 'react'
import {
  HardDrive,
  Cpu,
  Layers,
  AlertTriangle,
  Download,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldCheck,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  Monitor,
  Wifi,
  Volume2,
  Keyboard,
  Usb
} from 'lucide-react'
import { useDriver } from '../hooks/useDriver'
import { DeviceCard } from '../components/ui/DeviceCard'
import { DriverDetailsModal } from '../components/ui/DriverDetailsModal'
import type { DriverCategory } from '@shared/types'

const CATEGORIES: { id: DriverCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Alle Geräte', icon: <Layers className="w-4 h-4" /> },
  { id: 'problems', label: 'Probleme', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
  { id: 'display', label: 'Grafik & Monitore', icon: <Monitor className="w-4 h-4 text-sky-400" /> },
  { id: 'net', label: 'Netzwerk & WLAN', icon: <Wifi className="w-4 h-4 text-emerald-400" /> },
  { id: 'media', label: 'Audio & Medien', icon: <Volume2 className="w-4 h-4 text-indigo-400" /> },
  { id: 'input', label: 'Eingabegeräte', icon: <Keyboard className="w-4 h-4 text-amber-400" /> },
  { id: 'storage', label: 'Speicher & Laufwerke', icon: <HardDrive className="w-4 h-4 text-purple-400" /> },
  { id: 'usb', label: 'USB & Anschlüsse', icon: <Usb className="w-4 h-4 text-cyan-400" /> },
  { id: 'system', label: 'System & Firmware', icon: <Cpu className="w-4 h-4 text-blue-400" /> }
]

export const DriverPage: React.FC = () => {
  const {
    devices,
    packages,
    stats,
    loading,
    error,
    gpuInfo,
    windowsUpdateDrivers,
    isCheckingWindowsUpdate,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    onlyProblems,
    setOnlyProblems,
    onlyThirdParty,
    setOnlyThirdParty,
    filteredDevices,
    categoryCounts,
    isExporting,
    exportLogs,
    isLogDrawerOpen,
    setIsLogDrawerOpen,
    selectedDeviceForDetails,
    setSelectedDeviceForDetails,
    operationMessage,
    setOperationMessage,
    fetchData,
    handleExportAll,
    handleExportSingle,
    handleScanHardware,
    handleOpenDeviceManager,
    handleRestartDevice,
    handleCheckWindowsUpdate,
    handleSearchOnline,
    handleOpenVendorPortal,
    handleOpenWindowsUpdateSettings
  } = useDriver()

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fluent-text">Driver Center</h1>
          <p className="text-sm text-fluent-muted mt-0.5">
            Geräte-Inventarisierung, Fehler-Diagnose und Drittanbieter-Treiber-Sicherung
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleScanHardware}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title="Nach geänderter Hardware suchen"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${loading ? 'animate-spin' : ''}`} />
            Hardware scannen
          </button>

          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover shadow-sm transition-all disabled:opacity-50"
            title="Alle Drittanbieter-Treiber (OEM) in ein Verzeichnis sichern"
          >
            <Download className="w-3.5 h-3.5" />
            Alle Treiber sichern ({packages.length})
          </button>

          <button
            onClick={handleOpenDeviceManager}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
            title="Windows Geräte-Manager öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Geräte-Manager
          </button>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 rounded-xl bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
            title="Aktualisieren"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operation Notice / Message */}
      {operationMessage && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-fluent-accent-muted/40 border border-fluent-accent/30 text-xs text-fluent-text animate-in fade-in">
          <span>{operationMessage}</span>
          <button
            onClick={() => setOperationMessage(null)}
            className="text-fluent-muted hover:text-fluent-text ml-4 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GPU & Online Driver Check Banner */}
      {gpuInfo && (
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-xl bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-fluent-text truncate">
                    {gpuInfo.name}
                  </h3>
                  {gpuInfo.isOutdated ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Möglicherweise veraltet ({gpuInfo.ageYears} Jahre alt)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Aktueller Treiber
                    </span>
                  )}
                </div>
                <p className="text-xs text-fluent-muted mt-0.5 truncate">
                  Treiber-Version: <span className="font-mono text-fluent-text">{gpuInfo.driverVersion}</span>
                  {gpuInfo.driverDate && (
                    <> • Stand: <span className="text-fluent-text">{gpuInfo.driverDate}</span></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                onClick={() => handleOpenVendorPortal(gpuInfo.vendorDownloadUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-colors"
                title="Offizielle Treiberseite des Herstellers aufrufen"
              >
                <ExternalLink className="w-3.5 h-3.5 text-fluent-accent" />
                {gpuInfo.vendorToolName}
              </button>

              <button
                onClick={handleCheckWindowsUpdate}
                disabled={isCheckingWindowsUpdate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-fluent-accent/20 border border-fluent-accent/40 text-fluent-accent hover:bg-fluent-accent hover:text-white transition-all disabled:opacity-50"
                title="Online-Suche über Windows Update nach zertifizierten Treibern starten"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingWindowsUpdate ? 'animate-spin' : ''}`} />
                Windows Update Treiber-Scan
              </button>

              <button
                onClick={handleOpenWindowsUpdateSettings}
                className="p-1.5 rounded-xl bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-colors"
                title="Windows Update Einstellungen öffnen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pending Windows Update Drivers if found */}
          {windowsUpdateDrivers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-fluent-border/60 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 block">
                Gefundene Windows Update Treiber-Aktualisierungen:
              </span>
              {windowsUpdateDrivers.map((upd, idx) => (
                <div
                  key={idx}
                  className="text-xs text-fluent-text p-2 rounded-lg bg-fluent-card-subtle/80 flex items-center justify-between"
                >
                  <span className="font-medium truncate">{upd.title}</span>
                  <button
                    onClick={handleOpenWindowsUpdateSettings}
                    className="text-[11px] text-fluent-accent hover:underline ml-2 shrink-0"
                  >
                    In Einstellungen installieren
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Geräte Gesamt</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-fluent-accent">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {stats?.totalDevices ?? devices.length}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">Aktiv am System angeschlossen</p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">OEM / Drittanbieter</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {stats?.thirdPartyDrivers ?? packages.length}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">Sicherbare Treiberpakete</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            (stats?.problemDevices ?? 0) > 0
              ? 'bg-red-950/20 border-red-500/40'
              : 'bg-fluent-card border-fluent-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Geräteprobleme</span>
            <div
              className={`p-1.5 rounded-lg ${
                (stats?.problemDevices ?? 0) > 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-fluent-card-subtle text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              (stats?.problemDevices ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {stats?.problemDevices ?? 0}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {(stats?.problemDevices ?? 0) > 0 ? 'Aufmerksamkeit erforderlich' : 'Alle Geräte fehlerfrei'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">WHQL Signiert</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {stats?.whqlDrivers ?? 0}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">Von Microsoft zertifiziert</p>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="space-y-3">
        {/* Category horizontal scroll / wrap */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? 'bg-fluent-accent text-white border-fluent-accent shadow-sm'
                    : 'bg-fluent-card/80 text-fluent-muted hover:text-fluent-text border-fluent-border hover:bg-fluent-card'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : cat.id === 'problems' && count > 0
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-fluent-card-subtle text-fluent-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search & Quick Toggles */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-fluent-muted" />
            <input
              type="text"
              placeholder="Gerät, Hersteller oder Treiber suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-fluent-card border border-fluent-border text-xs text-fluent-text placeholder-fluent-muted focus:outline-none focus:border-fluent-accent transition-colors"
            />
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="inline-flex items-center gap-2 text-xs text-fluent-muted hover:text-fluent-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => setOnlyProblems(e.target.checked)}
                className="rounded border-fluent-border text-fluent-accent focus:ring-0 w-3.5 h-3.5"
              />
              <span>Nur Probleme ({categoryCounts.problems})</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-fluent-muted hover:text-fluent-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyThirdParty}
                onChange={(e) => setOnlyThirdParty(e.target.checked)}
                className="rounded border-fluent-border text-fluent-accent focus:ring-0 w-3.5 h-3.5"
              />
              <span>Nur Drittanbieter (OEM)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Device List / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-fluent-accent border-t-transparent animate-spin" />
          <p className="text-xs text-fluent-muted">Lese Geräte und Treiber über Windows PnP aus...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-fluent-card/40 border border-fluent-border/60">
          <Cpu className="w-10 h-10 text-fluent-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-fluent-text">Keine passenden Geräte gefunden</p>
          <p className="text-xs text-fluent-muted mt-1">
            Passe deine Suche oder Filtereinstellungen an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDevices.map((dev) => (
            <DeviceCard
              key={dev.instanceId}
              device={dev}
              onShowDetails={(d) => setSelectedDeviceForDetails(d)}
              onExport={(inf) => handleExportSingle(inf)}
              onRestart={(id) => handleRestartDevice(id)}
              onSearchOnline={(q) => handleSearchOnline(q)}
              isExporting={isExporting}
            />
          ))}
        </div>
      )}

      {/* Live Export Drawer / Log Panel */}
      {(exportLogs.length > 0 || isExporting) && (
        <div className="rounded-2xl border border-fluent-border bg-fluent-card overflow-hidden transition-all shadow-lg">
          <button
            onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-fluent-card-subtle/80 hover:bg-fluent-card-hover transition-colors text-xs font-semibold text-fluent-text"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-fluent-accent" />
              <span>Export- & System-Protokoll</span>
              {isExporting && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fluent-accent/15 text-fluent-accent text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-fluent-accent animate-ping" />
                  Wird ausgeführt...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-fluent-muted">
              <span>{exportLogs.length} Einträge</span>
              {isLogDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isLogDrawerOpen && (
            <div className="p-4 bg-black/40 border-t border-fluent-border max-h-48 overflow-y-auto font-mono text-[11px] text-fluent-muted space-y-1 select-text">
              {exportLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      <DriverDetailsModal
        device={selectedDeviceForDetails}
        onClose={() => setSelectedDeviceForDetails(null)}
        onExport={(inf) => handleExportSingle(inf)}
        onRestart={(id) => handleRestartDevice(id)}
        onSearchOnline={(q) => handleSearchOnline(q)}
        isExporting={isExporting}
      />
    </div>
  )
}

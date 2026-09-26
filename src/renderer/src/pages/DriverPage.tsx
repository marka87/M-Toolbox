import React, { useState } from 'react'
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
  Usb,
  LayoutGrid,
  List
} from 'lucide-react'
import { useDriver, type DriverVendorFilter } from '../hooks/useDriver'
import { DeviceCard, type DriverViewMode } from '../components/ui/DeviceCard'
import { DriverDetailsModal } from '../components/ui/DriverDetailsModal'
import type { DriverCategory } from '@shared/types'
import { useTranslation } from '../i18n/LanguageContext'

export const DriverPage: React.FC = () => {
  const { t } = useTranslation()

  const vendors: { id: DriverVendorFilter; label: string }[] = [
    { id: 'all', label: t.drivers.vendorAll },
    { id: 'oem', label: t.drivers.vendorOem },
    { id: 'microsoft', label: t.drivers.vendorMicrosoft },
    { id: 'amd', label: t.drivers.vendorAmd },
    { id: 'nvidia', label: t.drivers.vendorNvidia },
    { id: 'intel', label: t.drivers.vendorIntel },
    { id: 'hp', label: t.drivers.vendorHp },
    { id: 'realtek', label: t.drivers.vendorRealtek }
  ]

  const categories: { id: DriverCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.drivers.catAll, icon: <Layers className="w-4 h-4" /> },
    { id: 'problems', label: t.drivers.catProblems, icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
    { id: 'display', label: t.drivers.catDisplay, icon: <Monitor className="w-4 h-4 text-sky-400" /> },
    { id: 'net', label: t.drivers.catNet, icon: <Wifi className="w-4 h-4 text-emerald-400" /> },
    { id: 'media', label: t.drivers.catMedia, icon: <Volume2 className="w-4 h-4 text-indigo-400" /> },
    { id: 'input', label: t.drivers.catInput, icon: <Keyboard className="w-4 h-4 text-amber-400" /> },
    { id: 'storage', label: t.drivers.catStorage, icon: <HardDrive className="w-4 h-4 text-purple-400" /> },
    { id: 'usb', label: t.drivers.catUsb, icon: <Usb className="w-4 h-4 text-cyan-400" /> },
    { id: 'system', label: t.drivers.catSystem, icon: <Cpu className="w-4 h-4 text-blue-400" /> }
  ]
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
    vendorFilter,
    setVendorFilter,
    vendorCounts,
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

  const [viewMode, setViewMode] = useState<DriverViewMode>('compact')

  return (
    <div className="h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fluent-text">{t.drivers.title}</h1>
          <p className="text-sm text-fluent-muted mt-0.5">
            {t.drivers.subtitle}
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleScanHardware}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title={t.drivers.scanHardwareTooltip}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${loading ? 'animate-spin' : ''}`} />
            {t.drivers.scanHardwareBtn}
          </button>

          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover shadow-sm transition-all disabled:opacity-50"
            title={t.drivers.backupAllTooltip}
          >
            <Download className="w-3.5 h-3.5" />
            {t.drivers.backupAllBtn.replace('{count}', String(packages.length))}
          </button>

          <button
            onClick={handleOpenDeviceManager}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
            title={t.drivers.deviceManagerTooltip}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t.drivers.deviceManagerBtn}
          </button>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 rounded-xl bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
            title={t.drivers.refreshTooltip}
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
        <div className="w-full p-4 rounded-2xl bg-fluent-card border border-fluent-border relative overflow-hidden backdrop-blur-sm shadow-sm">
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
                      {t.drivers.gpuOutdated.replace('{years}', String(gpuInfo.ageYears))}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {t.drivers.gpuUpToDate}
                    </span>
                  )}
                </div>
                <p className="text-xs text-fluent-muted mt-0.5 truncate">
                  {t.drivers.driverVersionLabel} <span className="font-mono text-fluent-text">{gpuInfo.driverVersion}</span>
                  {gpuInfo.driverDate && (
                    <> • {t.drivers.asOfDate} <span className="text-fluent-text">{gpuInfo.driverDate}</span></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                onClick={() => handleOpenVendorPortal(gpuInfo.vendorDownloadUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-colors"
                title={t.drivers.vendorPortalTooltip}
              >
                <ExternalLink className="w-3.5 h-3.5 text-fluent-accent" />
                {gpuInfo.vendorToolName}
              </button>

              <button
                onClick={handleCheckWindowsUpdate}
                disabled={isCheckingWindowsUpdate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-fluent-accent/20 border border-fluent-accent/40 text-fluent-accent hover:bg-fluent-accent hover:text-white transition-all disabled:opacity-50"
                title={t.drivers.wuScanTooltip}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingWindowsUpdate ? 'animate-spin' : ''}`} />
                {t.drivers.wuScanBtn}
              </button>

              <button
                onClick={handleOpenWindowsUpdateSettings}
                className="p-1.5 rounded-xl bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-colors"
                title={t.drivers.wuSettingsTooltip}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pending Windows Update Drivers if found */}
          {windowsUpdateDrivers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-fluent-border/60 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 block">
                {t.drivers.wuUpdatesFoundTitle}
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
                    {t.drivers.installInSettingsBtn}
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
            <span className="text-xs font-medium text-fluent-muted">{t.drivers.statTotalDevices}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-fluent-accent">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {stats?.totalDevices ?? devices.length}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.drivers.statTotalDevicesDesc}</p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.drivers.statThirdParty}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {stats?.thirdPartyDrivers ?? packages.length}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.drivers.statThirdPartyDesc}</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            (stats?.problemDevices ?? 0) > 0
              ? 'bg-red-950/20 border-red-500/40'
              : 'bg-fluent-card border-fluent-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.drivers.statProblems}</span>
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
            {(stats?.problemDevices ?? 0) > 0 ? t.drivers.statAttentionRequired : t.drivers.statAllHealthy}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.drivers.statWhql}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {stats?.whqlDrivers ?? 0}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.drivers.statWhqlDesc}</p>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="space-y-3">
        {/* Category horizontal scroll / wrap */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
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

        {/* Vendor Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-fluent-muted mr-1.5 shrink-0">{t.drivers.vendorLabel}</span>
          {vendors.map((v) => {
            const count = vendorCounts[v.id] ?? 0
            const isActive = vendorFilter === v.id
            if (v.id !== 'all' && count === 0) return null
            return (
              <button
                key={v.id}
                onClick={() => setVendorFilter(v.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? 'bg-fluent-card border-fluent-accent text-fluent-accent shadow-sm'
                    : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text border-fluent-border/60 hover:bg-fluent-card'
                }`}
              >
                <span>{v.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-fluent-accent/20 text-fluent-accent' : 'bg-fluent-card-subtle text-fluent-muted'
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
              placeholder={t.drivers.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-fluent-card border border-fluent-border text-xs text-fluent-text placeholder-fluent-muted focus:outline-none focus:border-fluent-accent transition-colors"
            />
          </div>

          {/* Quick Toggles & View Switcher */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="inline-flex items-center gap-2 text-xs text-fluent-muted hover:text-fluent-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => setOnlyProblems(e.target.checked)}
                className="rounded border-fluent-border text-fluent-accent focus:ring-0 w-3.5 h-3.5"
              />
              <span>{t.drivers.onlyProblemsLabel.replace('{count}', String(categoryCounts.problems))}</span>
            </label>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg bg-fluent-card border border-fluent-border/70 p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('normal')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'normal'
                    ? 'bg-fluent-accent text-white shadow-sm'
                    : 'text-fluent-muted hover:text-white'
                }`}
                title={t.drivers.viewNormalTooltip}
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
                title={t.drivers.viewCompactTooltip}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Device List / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-fluent-accent border-t-transparent animate-spin" />
          <p className="text-xs text-fluent-muted">{t.drivers.readingDevices}</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-fluent-card/40 border border-fluent-border/60">
          <Cpu className="w-10 h-10 text-fluent-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-fluent-text">{t.drivers.noDevicesFoundTitle}</p>
          <p className="text-xs text-fluent-muted mt-1">
            {t.drivers.noDevicesFoundDesc}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'normal' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col space-y-2'}>
          {filteredDevices.map((dev) => (
            <DeviceCard
              key={dev.instanceId}
              device={dev}
              viewMode={viewMode}
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
              <span>{t.drivers.logDrawerTitle}</span>
              {isExporting && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fluent-accent/15 text-fluent-accent text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-fluent-accent animate-ping" />
                  {t.drivers.logInProgress}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-fluent-muted">
              <span>{t.drivers.logEntriesCount.replace('{count}', String(exportLogs.length))}</span>
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

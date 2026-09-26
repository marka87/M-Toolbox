import React, { useState } from 'react'
import {
  Trash2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Package,
  CheckCircle2
} from 'lucide-react'
import { useBloatware } from '../../hooks/useBloatware'
import { useTranslation } from '../../i18n/LanguageContext'
import type { BloatwareApp } from '@shared/types'

export const BloatwareTab: React.FC = () => {
  const { t } = useTranslation()
  const {
    filteredApps,
    loading,
    isUninstalling,
    selectedAppIds,
    progress,
    filterSafety,
    setFilterSafety,
    searchQuery,
    setSearchQuery,
    safeCount,
    optionalCount,
    cautionCount,
    scan,
    toggleSelect,
    selectAllSafe,
    clearSelection,
    uninstallSingle,
    uninstallBatch
  } = useBloatware()

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [appToUninstall, setAppToUninstall] = useState<BloatwareApp | null>(null)

  const handleOpenSingleConfirm = (app: BloatwareApp) => {
    setAppToUninstall(app)
    setConfirmModalOpen(true)
  }

  const handleExecuteSingleUninstall = async () => {
    if (!appToUninstall) return
    setConfirmModalOpen(false)
    await uninstallSingle(appToUninstall.id)
    setAppToUninstall(null)
  }

  const handleBatchClick = () => {
    if (selectedAppIds.size === 0) return
    setAppToUninstall(null)
    setConfirmModalOpen(true)
  }

  const handleExecuteBatchUninstall = async () => {
    setConfirmModalOpen(false)
    await uninstallBatch()
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Safe Action */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-fluent-card border border-fluent-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-100">{t.cleanup.bloatwareTitle}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30">
              {t.cleanup.appxBadge}
            </span>
          </div>
          <p className="text-xs text-fluent-muted mt-1 leading-relaxed max-w-2xl">
            {t.cleanup.bloatwareSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={scan}
            disabled={loading || isUninstalling}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card-subtle border border-fluent-border hover:bg-fluent-card hover:border-fluent-accent text-slate-200 transition-all disabled:opacity-50"
            title={t.cleanup.rescanAppxTooltip}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${loading ? 'animate-spin' : ''}`} />
            <span>{t.cleanup.rescanAppxBtn}</span>
          </button>

          {safeCount > 0 && (
            <button
              onClick={selectAllSafe}
              disabled={loading || isUninstalling}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-all shadow-sm disabled:opacity-50"
              title={t.cleanup.selectAllSafeTooltip}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.cleanup.selectAllSafeBtn.replace('{count}', String(safeCount))}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Card (active during uninstall) */}
      {progress && (
        <div className="p-4 rounded-2xl bg-fluent-accent/10 border border-fluent-accent/40 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-100 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-fluent-accent" />
              {progress.statusText}
            </span>
            <span className="text-fluent-accent font-mono">{progress.percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-fluent-card-subtle overflow-hidden">
            <div
              className="h-full bg-fluent-accent transition-all duration-300 rounded-full"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterSafety(filterSafety === 'safe' ? 'all' : 'safe')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterSafety === 'safe'
              ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40'
              : 'bg-fluent-card border-fluent-border hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">{t.cleanup.filterSafe}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{safeCount}</div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.cleanup.filterSafeDesc}</p>
        </button>

        <button
          onClick={() => setFilterSafety(filterSafety === 'optional' ? 'all' : 'optional')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterSafety === 'optional'
              ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/40'
              : 'bg-fluent-card border-fluent-border hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">{t.cleanup.filterOptional}</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{optionalCount}</div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.cleanup.filterOptionalDesc}</p>
        </button>

        <button
          onClick={() => setFilterSafety(filterSafety === 'caution' ? 'all' : 'caution')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterSafety === 'caution'
              ? 'bg-red-950/30 border-red-500/60 ring-1 ring-red-500/40'
              : 'bg-fluent-card border-fluent-border hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400">{t.cleanup.filterCaution}</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{cautionCount}</div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.cleanup.filterCautionDesc}</p>
        </button>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.cleanup.filterSelected}</span>
            <Package className="w-4 h-4 text-fluent-accent" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{selectedAppIds.size}</div>
          <p className="text-[11px] text-fluent-muted mt-0.5">{t.cleanup.filterSelectedDesc}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-fluent-muted" />
          <input
            type="text"
            placeholder={t.cleanup.searchBloatwarePlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-fluent-card border border-fluent-border text-xs text-slate-100 placeholder:text-fluent-muted focus:outline-none focus:border-fluent-accent transition-colors"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedAppIds.size > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-2 rounded-xl text-xs font-medium text-fluent-muted hover:text-slate-100 bg-fluent-card border border-fluent-border transition-colors"
              >
                {t.cleanup.clearSelectionBtn}
              </button>
              <button
                onClick={handleBatchClick}
                disabled={isUninstalling}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-fluent-status-red hover:bg-fluent-status-red/90 text-white shadow-fluent-sm transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.cleanup.removeAppsBtn.replace('{count}', String(selectedAppIds.size))}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* App List / Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 text-fluent-muted">
          <RefreshCw className="w-8 h-8 animate-spin text-fluent-accent" />
          <p className="text-xs">{t.cleanup.loadingAppx}</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-fluent-card/40 border border-fluent-border/60 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
          <p className="text-sm font-semibold text-slate-100">{t.cleanup.noAppsFoundTitle}</p>
          <p className="text-xs text-fluent-muted">
            {t.cleanup.noAppsFoundDesc}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-fluent-border overflow-hidden bg-fluent-card/60">
          <div className="divide-y divide-fluent-border/60">
            {filteredApps.map((app) => {
              const isSelected = selectedAppIds.has(app.id)
              const isProtected = app.safety === 'caution'

              return (
                <div
                  key={app.id}
                  className={`p-3.5 px-4 flex items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-fluent-accent/10' : 'hover:bg-fluent-card'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      onClick={() => !isProtected && toggleSelect(app.id)}
                      disabled={isProtected || isUninstalling}
                      className="shrink-0 text-fluent-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-fluent-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-fluent-muted hover:text-slate-200" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-100 truncate" title={app.displayName}>
                          {app.displayName}
                        </span>

                        {/* Safety Badge */}
                        {app.safety === 'safe' && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {t.cleanup.safetySafeBadge}
                          </span>
                        )}
                        {app.safety === 'optional' && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {t.cleanup.safetyOptionalBadge}
                          </span>
                        )}
                        {app.safety === 'caution' && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                            {t.cleanup.safetyCautionBadge}
                          </span>
                        )}

                        <span className="text-[10px] text-fluent-muted font-mono truncate hidden sm:inline">
                          ({app.id})
                        </span>
                      </div>

                      <p className="text-[11px] text-fluent-subtext truncate mt-0.5 max-w-2xl">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] text-fluent-muted hidden md:inline">
                      v{app.version}
                    </span>

                    {app.safety !== 'caution' ? (
                      <button
                        onClick={() => handleOpenSingleConfirm(app)}
                        disabled={isUninstalling}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fluent-muted hover:text-fluent-status-red hover:bg-fluent-status-red/10 border border-transparent hover:border-fluent-status-red/30 transition-colors disabled:opacity-50"
                        title={t.cleanup.uninstallSingleBtn}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.cleanup.uninstallSingleBtn}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-fluent-muted italic px-2 py-1">
                        {t.cleanup.safetyCautionBadge}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-fluent-card border border-fluent-border shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-fluent-status-red">
              <div className="p-2.5 rounded-xl bg-fluent-status-red/15 border border-fluent-status-red/30">
                <Trash2 className="w-5 h-5 text-fluent-status-red" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {appToUninstall
                    ? t.cleanup.confirmSingleAppDesc.replace('{name}', appToUninstall.displayName)
                    : t.cleanup.confirmBatchAppDesc.replace('{count}', String(selectedAppIds.size))}
                </h3>
              </div>
            </div>

            {appToUninstall?.safety === 'caution' && (
              <p className="text-xs text-amber-400 leading-relaxed font-semibold">
                {t.cleanup.confirmCautionWarning}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-fluent-muted hover:text-slate-100 bg-fluent-card-subtle border border-fluent-border transition-colors"
              >
                {t.cleanup.cancelBtn}
              </button>
              <button
                onClick={appToUninstall ? handleExecuteSingleUninstall : handleExecuteBatchUninstall}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-fluent-status-red hover:bg-fluent-status-red/90 text-white shadow-fluent-sm transition-all"
              >
                {t.cleanup.startUninstallBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

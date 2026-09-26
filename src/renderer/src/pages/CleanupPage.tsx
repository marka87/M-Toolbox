import React, { useState } from 'react'
import {
  Trash2,
  HardDrive,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react'
import { useCleanup, formatBytes } from '../hooks/useCleanup'
import { DiskSpaceCard } from '../components/ui/DiskSpaceCard'
import { CleanupCategoryRow } from '../components/ui/CleanupCategoryRow'
import { BloatwareTab } from '../components/ui/BloatwareTab'
import { useTranslation } from '../i18n/LanguageContext'
import type { CleanupGroupId } from '@shared/types'

export const CleanupPage: React.FC = () => {
  const { t, language } = useTranslation()

  const groupTitles: Record<CleanupGroupId, { title: string; subtitle: string }> = {
    system: {
      title: t.cleanup.grpSystemTitle,
      subtitle: t.cleanup.grpSystemSubtitle
    },
    browsers: {
      title: t.cleanup.grpBrowsersTitle,
      subtitle: t.cleanup.grpBrowsersSubtitle
    },
    dumps: {
      title: t.cleanup.grpDumpsTitle,
      subtitle: t.cleanup.grpDumpsSubtitle
    },
    cache: {
      title: t.cleanup.grpCacheTitle,
      subtitle: t.cleanup.grpCacheSubtitle
    }
  }

  const {
    categories,
    disks,
    selectedIds,
    selectedTotalSize,
    totalScanSize,
    totalScanFiles,
    isScanning,
    isCleaning,
    progress,
    lastResult,
    showResultModal,
    setShowResultModal,
    error,
    scan,
    clean,
    toggleCategory,
    selectAll,
    deselectAll,
    openStorageSense
  } = useCleanup()

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'disk' | 'bloatware'>('disk')

  const hasSelection = selectedIds.size > 0 && selectedTotalSize > 0

  // Gruppierte Kategorien
  const groups: CleanupGroupId[] = ['system', 'dumps', 'browsers', 'cache']

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6 pb-28">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fluent-text">{t.cleanup.title}</h1>
          <p className="text-sm text-fluent-muted mt-0.5">
            {t.cleanup.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'disk' && (
            <>
              <button
                onClick={() => scan()}
                disabled={isScanning || isCleaning}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
                title={t.cleanup.rescanTooltip}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isScanning ? 'animate-spin' : ''}`} />
                {t.cleanup.rescanBtn}
              </button>

              <button
                onClick={openStorageSense}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
                title={t.cleanup.storageSettingsTooltip}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t.cleanup.storageSettingsBtn}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-fluent-border/60 pb-3">
        <button
          onClick={() => setActiveTab('disk')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'disk'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>{t.cleanup.tabDisk}</span>
        </button>

        <button
          onClick={() => setActiveTab('bloatware')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'bloatware'
              ? 'bg-fluent-accent text-white shadow-fluent-sm'
              : 'text-fluent-muted hover:text-white hover:bg-fluent-card/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t.cleanup.tabBloatware}</span>
        </button>
      </div>

      {activeTab === 'bloatware' ? (
        <BloatwareTab />
      ) : (
        <>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.cleanup.statTotalFreable}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-fluent-accent">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {formatBytes(totalScanSize)}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {t.cleanup.statTempFilesCount.replace('{count}', totalScanFiles.toLocaleString(language === 'de' ? 'de-DE' : 'en-US'))}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.cleanup.statSelected}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatBytes(selectedTotalSize)}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {t.cleanup.statSelectedAreas
              .replace('{selected}', String(selectedIds.size))
              .replace('{total}', String(categories.length))}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.cleanup.statSafetyLevel}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {t.cleanup.statSafetySafe}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {t.cleanup.statLockedSkipped}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">{t.cleanup.statDisksTitle}</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {t.cleanup.statDisksCount
              .replace('{count}', String(disks.length))
              .replace('{suffix}', language === 'de' ? (disks.length === 1 ? '' : 'en') : (disks.length === 1 ? '' : 's'))}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {t.cleanup.statDisksAnalyzed}
          </p>
        </div>
      </div>

      {/* Disks Storage Overview */}
      {disks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
            {t.cleanup.disksUsageTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {disks.map((d) => (
              <DiskSpaceCard key={d.drive} disk={d} />
            ))}
          </div>
        </div>
      )}

      {/* Category Selection Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
            {t.cleanup.categoriesTitle}
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 text-xs text-fluent-accent hover:underline font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {t.cleanup.selectAllBtn}
            </button>
            <span className="text-fluent-border">|</span>
            <button
              onClick={deselectAll}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 text-xs text-fluent-muted hover:text-fluent-text font-medium"
            >
              <Square className="w-3.5 h-3.5" />
              {t.cleanup.deselectAllBtn}
            </button>
          </div>
        </div>

        {/* Grouped Category Rows */}
        {isScanning ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-fluent-accent border-t-transparent animate-spin" />
            <p className="text-xs text-fluent-muted">{t.cleanup.scanningMsg}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((grp) => {
              const grpCats = categories.filter((c) => c.group === grp)
              if (grpCats.length === 0) return null
              const meta = groupTitles[grp]

              return (
                <div key={grp} className="space-y-2.5">
                  <div className="px-1">
                    <h4 className="text-sm font-semibold text-fluent-text">{meta.title}</h4>
                    <p className="text-xs text-fluent-muted">{meta.subtitle}</p>
                  </div>

                  <div className="space-y-2">
                    {grpCats.map((cat) => (
                      <CleanupCategoryRow
                        key={cat.id}
                        category={cat}
                        isSelected={selectedIds.has(cat.id)}
                        onToggle={toggleCategory}
                        disabled={isCleaning}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 p-4 bg-fluent-card/90 backdrop-blur-md border-t border-fluent-border shadow-2xl flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-fluent-accent/10 border border-fluent-accent/20 text-fluent-accent">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-fluent-text">
              {hasSelection
                ? t.cleanup.barSelectedTotal.replace('{size}', formatBytes(selectedTotalSize))
                : t.cleanup.barNoneSelected}
            </div>
            <p className="text-xs text-fluent-muted">
              {t.cleanup.barAreasMarked
                .replace('{count}', String(selectedIds.size))
                .replace('{suffix}', language === 'de' ? (selectedIds.size === 1 ? '' : 'e') : (selectedIds.size === 1 ? '' : 's'))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmModalOpen(true)}
            disabled={!hasSelection || isCleaning || isScanning}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            {t.cleanup.cleanNowBtn}
          </button>
        </div>
      </div>

      {/* In-Progress Modal */}
      {isCleaning && progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-fluent-card border border-fluent-border shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-fluent-accent border-t-transparent animate-spin shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-fluent-text">
                  {t.cleanup.cleaningTitle}
                </h3>
                <p className="text-xs text-fluent-muted">
                  {t.cleanup.freedSoFar.replace('{bytes}', formatBytes(progress.freedBytes))}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-fluent-muted">
                <span className="truncate">{progress.currentAction}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-fluent-card-subtle overflow-hidden">
                <div
                  className="h-full rounded-full bg-fluent-accent transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cleanup Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-fluent-card border border-fluent-border shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-fluent-text">
              <div className="p-2.5 rounded-xl bg-fluent-accent/10 border border-fluent-accent/20 text-fluent-accent">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t.cleanup.confirmTitle}</h3>
                <p className="text-xs text-fluent-muted">
                  {t.cleanup.confirmSubtitle.replace('{count}', String(selectedIds.size))}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60 text-xs text-fluent-muted space-y-2">
              <p>
                {t.cleanup.confirmNote.split('{size}')[0]}
                <strong className="text-fluent-text">{formatBytes(selectedTotalSize)}</strong>
                {t.cleanup.confirmNote.split('{size}')[1] || ''}
              </p>
              <p className="text-[11px] text-emerald-400">
                {t.cleanup.confirmSafetyCheck}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-fluent-card-subtle hover:bg-fluent-card-hover text-fluent-text transition-colors"
              >
                {t.cleanup.cancelBtn}
              </button>
              <button
                onClick={() => {
                  setConfirmModalOpen(false)
                  clean()
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors"
              >
                {t.cleanup.startCleanupBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultModal && lastResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-fluent-card border border-fluent-border shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fluent-text">
                  {t.cleanup.resultTitle}
                </h3>
                <p className="text-xs text-fluent-muted">
                  {t.cleanup.durationSec.replace('{sec}', String(Math.round(lastResult.durationMs / 1000)))}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-fluent-card-subtle/80 border border-fluent-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fluent-muted">{t.cleanup.freedMemory}</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatBytes(lastResult.freedBytes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-fluent-muted">{t.cleanup.deletedFilesCount}</span>
                <span className="font-semibold text-fluent-text">
                  {lastResult.deletedFilesCount.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}
                </span>
              </div>
              {lastResult.skippedFilesCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fluent-muted">{t.cleanup.skippedLockedCount}</span>
                  <span className="font-semibold text-fluent-muted">
                    {lastResult.skippedFilesCount.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors"
              >
                {t.cleanup.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

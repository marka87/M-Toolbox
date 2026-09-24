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
import type { CleanupGroupId } from '@shared/types'

const GROUP_TITLES: Record<CleanupGroupId, { title: string; subtitle: string }> = {
  system: {
    title: 'Windows & System-Dateien',
    subtitle: 'Temporäre Dateien, Installationsreste und Papierkorb'
  },
  browsers: {
    title: 'Web-Browser Caches',
    subtitle: 'Temporärer Cache (Passwörter & Lesezeichen bleiben geschützt)'
  },
  dumps: {
    title: 'Fehlerberichte & Protokolle',
    subtitle: 'Speicherabbilder abgestürzter Programme und System-Logs'
  },
  cache: {
    title: 'Explorer-Zwischenspeicher',
    subtitle: 'Miniaturansichten und Vorschau-Datenbanken'
  }
}

export const CleanupPage: React.FC = () => {
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
          <h1 className="text-2xl font-bold tracking-tight text-fluent-text">Cleanup Center</h1>
          <p className="text-sm text-fluent-muted mt-0.5">
            Sichere Speicherplatzbereinigung, System-Temp, Cache- & Bloatware-Optimierung
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'disk' && (
            <>
              <button
                onClick={() => scan()}
                disabled={isScanning || isCleaning}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
                title="System neu nach temporären Dateien scannen"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isScanning ? 'animate-spin' : ''}`} />
                Neu scannen
              </button>

              <button
                onClick={openStorageSense}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
                title="Windows 11 Speicheroptimierung (Storage Sense) öffnen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Windows Speichereinstellungen
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
          <span>Dateimüll & Cache</span>
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
          <span>Windows Bloatware</span>
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
            <span className="text-xs font-medium text-fluent-muted">Freigebbar Gesamt</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-fluent-accent">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {formatBytes(totalScanSize)}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {totalScanFiles.toLocaleString('de-DE')} temporäre Dateien
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Ausgewählt</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatBytes(selectedTotalSize)}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            {selectedIds.size} von {categories.length} Bereichen
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Sicherheitsstufe</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            100% Sicher
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            Gesperrte Dateien werden übersprungen
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Lokale Laufwerke</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-fluent-text">
            {disks.length} Partition{disks.length === 1 ? '' : 'en'}
          </div>
          <p className="text-[11px] text-fluent-muted mt-0.5">
            Feste Datenträger analysiert
          </p>
        </div>
      </div>

      {/* Disks Storage Overview */}
      {disks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
            Laufwerksbelegung
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
            Bereinigungskategorien
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 text-xs text-fluent-accent hover:underline font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Alle auswählen
            </button>
            <span className="text-fluent-border">|</span>
            <button
              onClick={deselectAll}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 text-xs text-fluent-muted hover:text-fluent-text font-medium"
            >
              <Square className="w-3.5 h-3.5" />
              Keine
            </button>
          </div>
        </div>

        {/* Grouped Category Rows */}
        {isScanning ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-fluent-accent border-t-transparent animate-spin" />
            <p className="text-xs text-fluent-muted">Analysiere Temporärdateien, Caches und Papierkorb...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((grp) => {
              const grpCats = categories.filter((c) => c.group === grp)
              if (grpCats.length === 0) return null
              const meta = GROUP_TITLES[grp]

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
                ? `${formatBytes(selectedTotalSize)} zur Bereinigung ausgewählt`
                : 'Keine Bereiche ausgewählt'}
            </div>
            <p className="text-xs text-fluent-muted">
              {selectedIds.size} Bereich{selectedIds.size === 1 ? '' : 'e'} markiert
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
            Jetzt bereinigen
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
                  Bereinigung wird durchgeführt...
                </h3>
                <p className="text-xs text-fluent-muted">
                  Bereits {formatBytes(progress.freedBytes)} freigegeben
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
                <h3 className="text-base font-semibold">Bereinigung bestätigen</h3>
                <p className="text-xs text-fluent-muted">
                  {selectedIds.size} ausgewählte Bereiche bereinigen
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60 text-xs text-fluent-muted space-y-2">
              <p>
                Es werden bis zu <strong className="text-fluent-text">{formatBytes(selectedTotalSize)}</strong> temporäre Daten gelöscht.
              </p>
              <p className="text-[11px] text-emerald-400">
                ✓ Dateien, die aktuell in Benutzung sind, werden sicher übersprungen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-fluent-card-subtle hover:bg-fluent-card-hover text-fluent-text transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setConfirmModalOpen(false)
                  clean()
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors"
              >
                Bereinigung starten
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
                  Bereinigung erfolgreich!
                </h3>
                <p className="text-xs text-fluent-muted">
                  Dauer: {Math.round(lastResult.durationMs / 1000)} Sekunden
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-fluent-card-subtle/80 border border-fluent-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fluent-muted">Freigegebener Speicher:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatBytes(lastResult.freedBytes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-fluent-muted">Gelöschte Dateien:</span>
                <span className="font-semibold text-fluent-text">
                  {lastResult.deletedFilesCount.toLocaleString('de-DE')}
                </span>
              </div>
              {lastResult.skippedFilesCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fluent-muted">Gesperrte Dateien (übersprungen):</span>
                  <span className="font-semibold text-fluent-muted">
                    {lastResult.skippedFilesCount.toLocaleString('de-DE')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors"
              >
                Schließen
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

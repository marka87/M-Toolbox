import React from 'react'
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Folder,
  Layout,
  Shield,
  Gamepad2,
  Search,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { useTweaks } from '../hooks/useTweaks'
import { TweakToggleCard } from '../components/ui/TweakToggleCard'
import { ExplorerRestartBanner } from '../components/ui/ExplorerRestartBanner'
import type { TweakCategory } from '@shared/types'

const CATEGORY_TABS: { id: TweakCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Alle', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'explorer', label: 'Datei-Explorer', icon: <Folder className="w-3.5 h-3.5 text-blue-400" /> },
  { id: 'taskbar', label: 'Taskleiste & Start', icon: <Layout className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: 'privacy', label: 'Datenschutz', icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'gaming', label: 'Gaming & Leistung', icon: <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> },
  { id: 'system', label: 'System & Komfort', icon: <Sliders className="w-3.5 h-3.5 text-amber-400" /> }
]

export const TweaksPage: React.FC = () => {
  const {
    tweaks,
    allTweaks,
    loading,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    togglingId,
    applyingRecommended,
    pendingRestart,
    restartingExplorer,
    toastMessage,
    stats,
    toggleTweak,
    applyRecommended,
    restartExplorer,
    reload
  } = useTweaks()

  const getCategoryCount = (catId: TweakCategory) => {
    if (catId === 'all') return allTweaks.length
    return allTweaks.filter((t) => t.category === catId).length
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fluent-text">Windows 11 Tweaks</h1>
              <p className="text-xs text-fluent-muted">
                System-, Explorer-, Taskleisten- und Leistungsoptimierungen ohne externe Software
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={applyRecommended}
            disabled={applyingRecommended || loading || stats.allRecommendedApplied}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
              stats.allRecommendedApplied
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                : 'bg-fluent-accent hover:bg-fluent-accent/90 active:scale-95 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${applyingRecommended ? 'animate-spin' : ''}`} />
            {applyingRecommended
              ? 'Wird angewendet...'
              : stats.allRecommendedApplied
              ? 'Alle Empfohlenen aktiv'
              : 'Empfohlene anwenden'}
          </button>

          <button
            onClick={restartExplorer}
            disabled={restartingExplorer}
            title="Startet den Windows Explorer-Prozess neu"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-text text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${restartingExplorer ? 'animate-spin' : ''}`} />
            Explorer neu starten
          </button>

          <button
            onClick={reload}
            disabled={loading}
            title="Aktuellen Status aller Tweaks aus der Windows-Registry neu erfassen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-text text-xs font-medium transition-colors disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Zustand erfassen</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Explorer Restart Required Banner */}
      {pendingRestart && (
        <ExplorerRestartBanner
          isRestarting={restartingExplorer}
          onRestart={restartExplorer}
        />
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-fluent-accent/10 border border-fluent-accent/20 text-fluent-accent">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">
              {stats.activeCount} <span className="text-xs font-normal text-fluent-muted">/ {stats.total}</span>
            </div>
            <div className="text-xs text-fluent-muted">Aktive Tweaks</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">
              {stats.activeRecommendedCount}{' '}
              <span className="text-xs font-normal text-fluent-muted">/ {stats.recommendedCount}</span>
            </div>
            <div className="text-xs text-fluent-muted">Empfohlene Einstellungen</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">100% Sicher</div>
            <div className="text-xs text-fluent-muted">Geprüfte Registry-Einträge</div>
          </div>
        </div>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id
            const count = getCategoryCount(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-fluent-accent text-white shadow-sm'
                    : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-fluent-bg/80 text-fluent-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-4 h-4 text-fluent-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tweaks filtern..."
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-fluent-card/50 border border-fluent-border/60 text-xs text-fluent-text placeholder:text-fluent-muted/70 focus:outline-none focus:border-fluent-accent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fluent-muted hover:text-fluent-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tweaks Grid */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-fluent-card/20 rounded-2xl border border-fluent-border/30">
          <RefreshCw className="w-6 h-6 text-fluent-accent animate-spin mx-auto" />
          <p className="text-xs text-fluent-muted">Lese aktuelle Systemkonfiguration aus der Windows-Registry...</p>
        </div>
      ) : tweaks.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-fluent-card/20 rounded-2xl border border-fluent-border/30">
          <Sliders className="w-8 h-8 text-fluent-muted/50 mx-auto" />
          <h3 className="text-sm font-semibold text-fluent-text">Keine Tweaks gefunden</h3>
          <p className="text-xs text-fluent-muted max-w-sm mx-auto">
            Es wurden keine Tweaks gefunden, die dem aktuellen Filterkriterium &quot;{searchQuery}&quot; entsprechen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tweaks.map((tweak) => (
            <TweakToggleCard
              key={tweak.id}
              tweak={tweak}
              isToggling={togglingId === tweak.id}
              onToggle={toggleTweak}
            />
          ))}
        </div>
      )}
    </div>
  )
}


import React, { useState, useMemo } from 'react'
import {
  Activity,
  Shield,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Cpu,
  Search,
  Zap,
  Clock,
  Sparkles,
  Server
} from 'lucide-react'
import { useRamGuardian } from '../hooks/useRamGuardian'
import { Card } from '../components/ui/Card'
import type { StatusType } from '../components/ui/StatusBadge'
import { formatBytes } from '@shared/utils/format'

function formatMB(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`
  }
  return `${mb} MB`
}

export const RAMGuardianPage: React.FC = () => {
  const {
    stats,
    processes,
    hygiene,
    recommendations,
    healthScore,
    history24h,
    isLoading,
    isCleaning,
    cleanupResult,
    refreshAll,
    cleanWindows,
    disableStartup
  } = useRamGuardian()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'processes' | 'hygiene' | 'cleanup'>('processes')
  const [disablingId, setDisablingId] = useState<string | null>(null)

  // Filtered processes based on search
  const filteredProcesses = useMemo(() => {
    if (!searchQuery.trim()) return processes
    const q = searchQuery.toLowerCase()
    return processes.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q)
    )
  }, [processes, searchQuery])

  // Handle disable startup
  const handleDisableStartup = async (itemKey: string, itemName: string) => {
    // Generate id matching advancedService convention
    const id = itemKey.startsWith('hkcu_') || itemKey.startsWith('hklm_') || itemKey.startsWith('folder_')
      ? itemKey
      : `hkcu_${itemName}`
    setDisablingId(id)
    try {
      await disableStartup(id)
    } finally {
      setDisablingId(null)
    }
  }

  // Health Score Category configuration
  const healthConfig = useMemo(() => {
    if (!healthScore) {
      return {
        status: 'green' as StatusType,
        bgGradient: 'from-emerald-500/10 to-transparent',
        badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        textColor: 'text-emerald-400',
        title: 'Optimal'
      }
    }
    switch (healthScore.category) {
      case 'Optimal':
        return {
          status: 'green' as StatusType,
          bgGradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
          badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
          textColor: 'text-emerald-400',
          title: 'Optimal'
        }
      case 'Gut':
        return {
          status: 'green' as StatusType,
          bgGradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
          badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
          textColor: 'text-blue-400',
          title: 'Gut'
        }
      case 'Aufmerksamkeit':
        return {
          status: 'yellow' as StatusType,
          bgGradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
          badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          textColor: 'text-amber-400',
          title: 'Aufmerksamkeit'
        }
      case 'Kritisch':
      default:
        return {
          status: 'red' as StatusType,
          bgGradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
          badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
          textColor: 'text-rose-400',
          title: 'Kritisch'
        }
    }
  }, [healthScore])

  // Render 24h history chart
  const renderHistoryGraph = () => {
    if (!history24h || history24h.length < 2) {
      return (
        <div className="h-32 flex flex-col items-center justify-center border border-dashed border-fluent-border rounded-xl text-xs text-fluent-muted p-4">
          <Clock className="w-5 h-5 mb-1.5 text-fluent-muted/60" />
          <span>24-Stunden-Verlauf wird aufgezeichnet</span>
          <span className="text-[10px] text-fluent-muted/50 mt-0.5">Messpunkte werden im Minutentakt gesichert</span>
        </div>
      )
    }

    const points = history24h
    const maxUsage = Math.max(...points.map((p) => p.usagePercent), 100)
    const minUsage = Math.min(...points.map((p) => p.usagePercent))
    const avgUsage = Math.round(
      points.reduce((acc, curr) => acc + curr.usagePercent, 0) / points.length
    )

    // SVG dimensions
    const width = 600
    const height = 110
    const padding = 10

    const polylinePoints = points
      .map((p, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding)
        const y = height - padding - (p.usagePercent / 100) * (height - 2 * padding)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

    const areaPoints = `${padding},${height - padding} ${polylinePoints} ${width - padding},${height - padding}`

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-fluent-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-fluent-accent" />
            RAM-Verlauf ({points.length} Messungen)
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Min: <b className="text-emerald-400">{minUsage}%</b></span>
            <span>Ø: <b className="text-blue-400">{avgUsage}%</b></span>
            <span>Max: <b className="text-amber-400">{maxUsage}%</b></span>
          </div>
        </div>

        <div className="relative w-full h-28 bg-fluent-card/40 rounded-xl p-2 border border-fluent-border-subtle overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ramGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Threshold Line at 85% */}
            <line
              x1={padding}
              y1={height - padding - 0.85 * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - 0.85 * (height - 2 * padding)}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              strokeOpacity="0.4"
            />

            {/* Area Fill */}
            <polygon points={areaPoints} fill="url(#ramGrad)" />

            {/* Path Stroke */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6 pb-28">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fluent-accent/10 text-fluent-accent">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fluent-text">RAM Guardian</h1>
          </div>
          <p className="text-sm text-fluent-muted mt-1">
            Intelligente Speicherdiagnose, Leak-Erkennung und App-Hygiene – schützt den Windows-Cache
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refreshAll()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title="Arbeitsspeicher-Metriken neu laden"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>

          <button
            onClick={() => cleanWindows()}
            disabled={isCleaning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            title="Temporäre Windows-Caches gefahrlos bereinigen (Prefetch bleibt geschützt)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
            {isCleaning ? 'Bereinige...' : 'Windows sicher bereinigen'}
          </button>
        </div>
      </div>

      {/* Persistent High-Load Warning Banner */}
      {stats?.isPersistentHighLoad && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 animate-pulse">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-rose-200">
              Warnung: Dauerhaft hohe Speicherauslastung ({stats.usagePercent}% seit über 10 Minuten)
            </p>
            <p className="text-rose-300/90 leading-relaxed">
              Dein System steht unter anhaltendem Speicherdruck. Es wird vermehrt komprimiert oder auf die SSD ausgelagert. 
              Prüfe die Prozesse in der unteren Liste auf Speicherfresser oder Memory Leaks.
            </p>
          </div>
        </div>
      )}

      {/* Windows Architecture Educational Callout */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-cyan-100">Windows Standby-Speicher & Cache sind kein Müll</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
              Architektur-Prinzip
            </span>
          </div>
          <p className="text-cyan-200/80 leading-relaxed">
            Windows nutzt ungenutzten RAM proaktiv als Zwischenspeicher (Standby-Cache), um Programmstarts drastisch zu beschleunigen. 
            Dieser Cache wird <b>vollautomatisch und verzögerungsfrei freigegeben</b>, sobald eine Anwendung oder ein Spiel Speicher anfordert. 
            M-Toolbox verwendet bewusst <b>keine künstlichen RAM-Cleaner</b> (wie z. B. EmptyWorkingSet), da diese Daten lediglich ins langsame Pagefile zwingen und die Performance verschlechtern.
          </p>
        </div>
      </div>

      {/* Health Score Hero Card */}
      {healthScore && (
        <div className={`rounded-2xl p-6 border border-fluent-border bg-gradient-to-br ${healthConfig.bgGradient} bg-fluent-card/70 backdrop-blur-md shadow-fluent`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
                  Gesundheitsbewertung (Score)
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${healthConfig.badgeColor}`}>
                  {healthScore.category}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-extrabold tracking-tight ${healthConfig.textColor}`}>
                  {healthScore.score}
                </span>
                <span className="text-sm font-medium text-fluent-muted">/ 100 Punkte</span>
              </div>
              <p className="text-xs text-fluent-text/90 max-w-xl leading-relaxed">
                {healthScore.summary}
              </p>
            </div>

            {/* Breakdown Sub-Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[320px]">
              <div className="p-2.5 rounded-xl bg-fluent-card/80 border border-fluent-border-subtle">
                <div className="text-[10px] text-fluent-muted">Autostart</div>
                <div className="text-xs font-bold text-fluent-text mt-0.5">
                  {healthScore.breakdown.startupScore} / 25 Pkt
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-fluent-card/80 border border-fluent-border-subtle">
                <div className="text-[10px] text-fluent-muted">Dienste & Leaks</div>
                <div className="text-xs font-bold text-fluent-text mt-0.5">
                  {healthScore.breakdown.serviceScore} / 15 Pkt
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-fluent-card/80 border border-fluent-border-subtle">
                <div className="text-[10px] text-fluent-muted">Auslastung</div>
                <div className="text-xs font-bold text-fluent-text mt-0.5">
                  {healthScore.breakdown.ramLoadScore} / 30 Pkt
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-fluent-card/80 border border-fluent-border-subtle">
                <div className="text-[10px] text-fluent-muted">Komprimierung</div>
                <div className="text-xs font-bold text-fluent-text mt-0.5">
                  {healthScore.breakdown.compressionScore} / 20 Pkt
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-fluent-card/80 border border-fluent-border-subtle">
                <div className="text-[10px] text-fluent-muted">Cache-Qualität</div>
                <div className="text-xs font-bold text-fluent-text mt-0.5">
                  {healthScore.breakdown.cacheHealthScore} / 10 Pkt
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Live Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Used RAM */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-fluent-muted mb-2">
            <span className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-fluent-accent" />
              Belegter RAM
            </span>
            <span className="font-semibold text-fluent-text">
              {stats ? `${stats.usagePercent}%` : '–'}
            </span>
          </div>
          <div className="text-xl font-bold text-fluent-text">
            {stats ? formatBytes(stats.usedBytes) : '–'}
          </div>
          <div className="text-[11px] text-fluent-muted mt-1">
            Gesamt: {stats ? formatBytes(stats.totalBytes) : '–'}
          </div>
          {/* Bar */}
          <div className="w-full h-1.5 bg-fluent-card-hover rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (stats?.usagePercent || 0) > 85
                  ? 'bg-rose-500'
                  : (stats?.usagePercent || 0) > 70
                  ? 'bg-amber-500'
                  : 'bg-fluent-accent'
              }`}
              style={{ width: `${stats?.usagePercent || 0}%` }}
            />
          </div>
        </Card>

        {/* Available RAM */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-fluent-muted mb-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verfügbar
            </span>
            <span className="text-xs text-emerald-400 font-medium">Sofort nutzbar</span>
          </div>
          <div className="text-xl font-bold text-fluent-text">
            {stats ? formatBytes(stats.availableBytes) : '–'}
          </div>
          <div className="text-[11px] text-fluent-muted mt-1">
            Frei & Nullseiten: {stats ? formatBytes(stats.freeAndZeroBytes) : '–'}
          </div>
          <div className="w-full h-1.5 bg-fluent-card-hover rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${
                  stats ? Math.round((stats.availableBytes / stats.totalBytes) * 100) : 0
                }%`
              }}
            />
          </div>
        </Card>

        {/* Cache & Standby */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-fluent-muted mb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              Cache & Standby
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
              Aktiv beschleunigt
            </span>
          </div>
          <div className="text-xl font-bold text-fluent-text">
            {stats ? formatBytes(stats.cacheBytes) : '–'}
          </div>
          <div className="text-[11px] text-fluent-muted mt-1">
            Wird bei Bedarf sofort freigegeben
          </div>
          <div className="w-full h-1.5 bg-fluent-card-hover rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{
                width: `${
                  stats ? Math.min(100, Math.round((stats.cacheBytes / stats.totalBytes) * 100)) : 0
                }%`
              }}
            />
          </div>
        </Card>

        {/* Compressed RAM */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-fluent-muted mb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Komprimiert
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
              Windows In-Memory
            </span>
          </div>
          <div className="text-xl font-bold text-fluent-text">
            {stats ? formatBytes(stats.compressedBytes) : '–'}
          </div>
          <div className="text-[11px] text-fluent-muted mt-1">
            Committed: {stats ? formatBytes(stats.committedBytes) : '–'}
          </div>
          <div className="w-full h-1.5 bg-fluent-card-hover rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{
                width: `${
                  stats
                    ? Math.min(100, Math.round((stats.compressedBytes / stats.totalBytes) * 100))
                    : 0
                }%`
              }}
            />
          </div>
        </Card>
      </div>

      {/* 24-Hour Timeline History Graph */}
      <Card className="p-5">
        {renderHistoryGraph()}
      </Card>

      {/* Intelligent Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fluent-accent" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-100">
              Intelligente Empfehlungen ({recommendations.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => {
              const borderCol =
                rec.severity === 'critical'
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : rec.severity === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-fluent-border bg-fluent-card/70'

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border ${borderCol} flex flex-col justify-between gap-3 transition-all hover:border-fluent-border-hover`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-fluent-text">{rec.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          rec.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-300'
                            : rec.severity === 'warning'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {rec.type}
                      </span>
                    </div>
                    <p className="text-xs text-fluent-muted leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  {rec.actionText && (
                    <div className="pt-1 flex justify-end">
                      {rec.actionType === 'clean_cache' ? (
                        <button
                          onClick={() => cleanWindows()}
                          disabled={isCleaning}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-accent/15 text-fluent-accent hover:bg-fluent-accent hover:text-white transition-all disabled:opacity-50"
                        >
                          {rec.actionText}
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveTab('hygiene')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-card-hover border border-fluent-border text-fluent-text hover:border-fluent-border-hover transition-all"
                        >
                          {rec.actionText}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs Navigation: Processes / App Hygiene / Safe Cleanup */}
      <div className="flex items-center gap-2 border-b border-fluent-border pb-1">
        <button
          onClick={() => setActiveTab('processes')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'processes'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Speicherfresser ({processes.length})
        </button>

        <button
          onClick={() => setActiveTab('hygiene')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'hygiene'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          App-Hygiene & Autostart
        </button>

        <button
          onClick={() => setActiveTab('cleanup')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'cleanup'
              ? 'bg-fluent-card border border-fluent-border text-fluent-accent shadow-sm'
              : 'text-fluent-muted hover:text-fluent-text'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Windows-Bereinigung
        </button>
      </div>

      {/* TAB 1: Top Processes & Leak Detector */}
      {activeTab === 'processes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fluent-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Prozess nach Name oder PID filtern..."
                className="w-full bg-fluent-card border border-fluent-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-fluent-text placeholder:text-fluent-muted focus:outline-none focus:border-fluent-accent transition-all"
              />
            </div>
            <div className="text-xs text-fluent-muted">
              Zeige {filteredProcesses.length} von {processes.length} Prozessen
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-fluent-border bg-fluent-card/70">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-fluent-border bg-fluent-card/90 text-fluent-muted">
                  <th className="py-2.5 px-4 font-semibold">Prozess</th>
                  <th className="py-2.5 px-4 font-semibold">PID</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Aktueller RAM</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Ø Schnitt</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Trend</th>
                  <th className="py-2.5 px-4 font-semibold">Diagnose / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fluent-border-subtle">
                {filteredProcesses.map((proc) => {
                  return (
                    <tr
                      key={proc.pid}
                      className={`hover:bg-fluent-card-hover/50 transition-colors ${
                        proc.isLeakSuspect ? 'bg-rose-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-fluent-text">
                        {proc.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-fluent-muted">
                        {proc.pid}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-fluent-text">
                        {formatMB(proc.workingSetMB)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-fluent-muted">
                        {formatMB(proc.averageMB)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {proc.trend === 'up' && (
                          <span className="inline-flex items-center text-rose-400 gap-0.5" title="Verbrauch steigt">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {proc.trend === 'down' && (
                          <span className="inline-flex items-center text-emerald-400 gap-0.5" title="Verbrauch sinkt">
                            <TrendingDown className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {proc.trend === 'stable' && (
                          <span className="inline-flex items-center text-fluent-muted" title="Verbrauch stabil">
                            <Minus className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {proc.isLeakSuspect ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Leak-Verdacht (+{proc.leakGrowthMB} MB)
                          </span>
                        ) : proc.workingSetMB > 800 ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
                            Großer Speicherbedarf
                          </span>
                        ) : (
                          <span className="text-[11px] text-fluent-muted">Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: App Hygiene & Autostart */}
      {activeTab === 'hygiene' && (
        <div className="space-y-5">
          {/* Headline banner */}
          <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
                Autostart-Belastung
              </span>
              <p className="text-sm font-bold text-slate-100">
                {hygiene?.headline || 'Wird analysiert...'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-fluent-accent">
                {hygiene ? formatMB(hygiene.totalStartupRAMMB) : '–'}
              </span>
              <div className="text-[11px] text-fluent-muted">Reservierter Start-RAM</div>
            </div>
          </div>

          {/* Duplicate software cards */}
          {hygiene && hygiene.duplicateGroups.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Erkannte Software-Duplikate ({hygiene.duplicateGroups.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hygiene.duplicateGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-200">{group.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                        {group.category}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      {group.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group.apps.map((app) => (
                        <span
                          key={app}
                          className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autostart apps list */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">
              Autostart-Einträge & Speicherbedarf ({hygiene?.startupApps.length || 0})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-fluent-border bg-fluent-card/70">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-fluent-border bg-fluent-card/90 text-fluent-muted">
                    <th className="py-2.5 px-4 font-semibold">Programm</th>
                    <th className="py-2.5 px-4 font-semibold">Ort / Ebene</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Geschätzter RAM</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Auswirkung</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fluent-border-subtle">
                  {hygiene?.startupApps.map((app, idx) => (
                    <tr key={idx} className="hover:bg-fluent-card-hover/50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-fluent-text">
                        <div>{app.name}</div>
                        <div className="text-[10px] text-fluent-muted truncate max-w-xs" title={app.command}>
                          {app.command}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-fluent-muted font-mono text-[11px]">
                        {app.location}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-fluent-text">
                        ~{formatMB(app.estimatedRAMMB)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {app.isRunning ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                            Läuft
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-fluent-card-hover text-fluent-muted">
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {app.impact === 'high' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold">
                            Hoch
                          </span>
                        )}
                        {app.impact === 'medium' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">
                            Mittel
                          </span>
                        )}
                        {app.impact === 'low' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-fluent-card-hover text-fluent-muted">
                            Gering
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDisableStartup(app.name, app.name)}
                          disabled={disablingId === app.name}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-fluent-card border border-fluent-border hover:border-rose-500/40 hover:text-rose-400 text-fluent-text transition-all disabled:opacity-50"
                          title="Aus Autostart entfernen"
                        >
                          {disablingId === app.name ? '...' : 'Deaktivieren'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Safe Windows Cache Cleanup */}
      {activeTab === 'cleanup' && (
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sichere Windows-Systembereinigung
                </h3>
                <p className="text-xs text-fluent-muted leading-relaxed max-w-2xl">
                  Bereinigt temporäre Update- und Installations-Dateien auf Dateisystem-Ebene, 
                  ohne den laufenden RAM zu stören und ohne nützliche Windows-Caches zu beschädigen.
                </p>
              </div>

              <button
                onClick={() => cleanWindows()}
                disabled={isCleaning}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
                {isCleaning ? 'Bereinige...' : 'Jetzt bereinigen'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-fluent-text">Temporäre Benutzer-Dateien</span>
                  <p className="text-fluent-muted text-[11px]">Dateien in %TEMP% und temporäre Installer</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-fluent-text">Windows Update Cache</span>
                  <p className="text-fluent-muted text-[11px]">Heruntergeladene Installationspakete in SoftwareDistribution</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-fluent-border bg-fluent-card/50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-fluent-text">Übermittlungsoptimierungs-Cache</span>
                  <p className="text-fluent-muted text-[11px]">Verteilungs-Caches für Windows Updates (Delivery Optimization)</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-emerald-300">🛡️ Prefetch geschützt (Unberührt)</span>
                  <p className="text-emerald-200/80 text-[11px]">
                    Der Prefetch-Ordner wird niemals gelöscht, um Startverzögerungen von Programmen zu verhindern.
                  </p>
                </div>
              </div>
            </div>

            {/* Cleanup feedback log */}
            {cleanupResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  cleanupResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{cleanupResult.success ? 'Bereinigung erfolgreich' : 'Fehler bei der Bereinigung'}</span>
                  {cleanupResult.freedBytes > 0 && (
                    <span className="font-mono">
                      +{formatBytes(cleanupResult.freedBytes)} freigegeben
                    </span>
                  )}
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-fluent-text/80">
                  {cleanupResult.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
                {cleanupResult.error && (
                  <div className="text-rose-300 text-[11px]">{cleanupResult.error}</div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
export default RAMGuardianPage

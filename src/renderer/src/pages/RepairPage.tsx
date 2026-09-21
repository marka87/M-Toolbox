import React from 'react'
import {
  Wrench,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Wifi,
  Printer,
  Layout,
  ShoppingBag,
  Activity
} from 'lucide-react'
import { useRepair } from '../hooks/useRepair'
import { RepairActionCard } from '../components/ui/RepairActionCard'
import { AdminNoticeBanner } from '../components/ui/AdminNoticeBanner'
import type { RepairCategory } from '@shared/types'

const CATEGORY_TABS: { id: RepairCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Alle Werkzeuge', icon: <Wrench className="w-4 h-4" /> },
  { id: 'system', label: 'System (SFC & DISM)', icon: <ShieldCheck className="w-4 h-4 text-fluent-accent" /> },
  { id: 'update', label: 'Windows Update', icon: <RefreshCw className="w-4 h-4 text-sky-400" /> },
  { id: 'network', label: 'Netzwerk & DNS', icon: <Wifi className="w-4 h-4 text-emerald-400" /> },
  { id: 'spooler', label: 'Drucker & Spooler', icon: <Printer className="w-4 h-4 text-indigo-400" /> },
  { id: 'explorer', label: 'Explorer & Suche', icon: <Layout className="w-4 h-4 text-amber-400" /> },
  { id: 'store', label: 'Store & Apps', icon: <ShoppingBag className="w-4 h-4 text-purple-400" /> }
]

export const RepairPage: React.FC = () => {
  const {
    health,
    actions,
    filteredActions,
    selectedCategory,
    setSelectedCategory,
    runningActionId,
    logs,
    isLogDrawerOpen,
    setIsLogDrawerOpen,
    lastResult,
    loading,
    error,
    fetchHealth,
    runRepair,
    restartAsAdmin
  } = useRepair()

  const handleOpenTroubleshooter = async () => {
    try {
      await window.mToolbox.system.openExternal('ms-settings:troubleshoot')
    } catch (err) {
      console.error('Fehler beim Öffnen der Problembehandlung:', err)
    }
  }

  // Ermittle Status der wichtigen Windows-Dienste
  const getServiceStatus = (serviceName: string) => {
    const s = health?.services.find((x) => x.name.toLowerCase() === serviceName.toLowerCase())
    return s?.status || 'unknown'
  }

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6 pb-24">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fluent-text">Repair Center</h1>
          <p className="text-sm text-fluent-muted mt-0.5">
            Systemintegrität, SFC & DISM, Windows Update und Netzwerk-Reparaturen
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchHealth()}
            disabled={loading || Boolean(runningActionId)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title="Dienste und Systemgesundheit neu abfragen"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${loading ? 'animate-spin' : ''}`} />
            Gesundheit prüfen
          </button>

          <button
            onClick={handleOpenTroubleshooter}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-muted hover:text-fluent-text transition-all"
            title="Windows 11 Problembehandlung aufrufen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Windows Problembehandlung
          </button>
        </div>
      </div>

      {/* Admin Notice Banner */}
      <AdminNoticeBanner
        isAdmin={health?.isAdmin ?? false}
        onRestartAsAdmin={restartAsAdmin}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Last Result Notice */}
      {lastResult && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
            lastResult.success
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-red-950/30 border-red-500/30 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{lastResult.message}</span>
          </div>
          <span className="text-[11px] opacity-75">
            Dauer: {Math.round(lastResult.durationMs / 1000)}s
          </span>
        </div>
      )}

      {/* Health Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Service: Windows Update */}
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Windows Update Dienst</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-sky-400">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                getServiceStatus('wuauserv') === 'running' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-base font-bold text-fluent-text capitalize">
              {getServiceStatus('wuauserv') === 'running' ? 'Aktiv (Wuauserv)' : 'Angehalten'}
            </span>
          </div>
          <p className="text-[11px] text-fluent-muted mt-1">Automatische Windows-Updates</p>
        </div>

        {/* Service: Druckwarteschlange */}
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Druckwarteschlange</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                getServiceStatus('Spooler') === 'running' ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span className="text-base font-bold text-fluent-text capitalize">
              {getServiceStatus('Spooler') === 'running' ? 'Aktiv (Spooler)' : 'Fehlerhaft'}
            </span>
          </div>
          <p className="text-[11px] text-fluent-muted mt-1">Druckerkommunikation</p>
        </div>

        {/* Service: Windows Search */}
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Windows Suchindex</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                getServiceStatus('WSearch') === 'running' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-base font-bold text-fluent-text capitalize">
              {getServiceStatus('WSearch') === 'running' ? 'Aktiv (WSearch)' : 'Gestoppt'}
            </span>
          </div>
          <p className="text-[11px] text-fluent-muted mt-1">Dateisuche & Startmenü</p>
        </div>

        {/* Network Connectivity */}
        <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fluent-muted">Internet-Konnektivität</span>
            <div className="p-1.5 rounded-lg bg-fluent-card-subtle text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.networkConnected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span className="text-base font-bold text-fluent-text">
              {health?.networkConnected ? 'Verbunden' : 'Kein Internet'}
            </span>
          </div>
          <p className="text-[11px] text-fluent-muted mt-1">DNS- & Gateway-Ping</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const isActive = selectedCategory === tab.id
          const count =
            tab.id === 'all'
              ? actions.length
              : actions.filter((a) => a.category === tab.id).length

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                isActive
                  ? 'bg-fluent-accent text-white border-fluent-accent shadow-sm'
                  : 'bg-fluent-card/80 text-fluent-muted hover:text-fluent-text border-fluent-border hover:bg-fluent-card'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-fluent-card-subtle text-fluent-muted'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Repair Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredActions.map((action) => (
          <RepairActionCard
            key={action.id}
            action={action}
            isRunning={runningActionId === action.id}
            isAnyRunning={Boolean(runningActionId)}
            isAdmin={health?.isAdmin ?? false}
            onRun={runRepair}
          />
        ))}
      </div>

      {/* Live Terminal Drawer / Log Panel */}
      {(logs.length > 0 || Boolean(runningActionId)) && (
        <div className="rounded-2xl border border-fluent-border bg-fluent-card overflow-hidden transition-all shadow-xl">
          <button
            onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-fluent-card-subtle/80 hover:bg-fluent-card-hover transition-colors text-xs font-semibold text-fluent-text"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-fluent-accent" />
              <span>Reparatur- & Befehlsprotokoll</span>
              {runningActionId && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fluent-accent/15 text-fluent-accent text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-fluent-accent animate-ping" />
                  Wird ausgeführt...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-fluent-muted">
              <span>{logs.length} Zeilen</span>
              {isLogDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isLogDrawerOpen && (
            <div className="p-4 bg-black/50 border-t border-fluent-border max-h-56 overflow-y-auto font-mono text-[11px] text-fluent-muted space-y-1 select-text">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed whitespace-pre-wrap ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'info'
                      ? 'text-sky-400'
                      : 'text-fluent-text'
                  }`}
                >
                  {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


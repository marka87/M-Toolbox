import React, { useState } from 'react'
import {
  Network,
  Globe,
  Activity,
  Zap,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Radio,
  Server
} from 'lucide-react'
import { useNetwork } from '../hooks/useNetwork'
import { NetworkAdapterCard } from '../components/ui/NetworkAdapterCard'
import { PingMatrixCard } from '../components/ui/PingMatrixCard'
import { DnsBenchmarkCard } from '../components/ui/DnsBenchmarkCard'
import { PortScannerCard } from '../components/ui/PortScannerCard'

type TabType = 'overview' | 'dns' | 'ports'

export const NetworkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [copiedWan, setCopiedWan] = useState(false)

  const {
    adapters,
    wan,
    defaultGateway,
    loadingDiagnostics,
    pingResults,
    isPinging,
    runPingTest,
    dnsResults,
    isBenchmarkingDns,
    dnsTestDomain,
    setDnsTestDomain,
    runDnsBenchmark,
    portScanReport,
    isScanningPorts,
    runPortScan,
    isFlushingDns,
    isRenewingIp,
    toastMessage,
    flushDns,
    renewIp,
    openNetworkConnections,
    reload
  } = useNetwork()

  const copyWanIp = () => {
    if (!wan.ip) return
    navigator.clipboard.writeText(wan.ip)
    setCopiedWan(true)
    setTimeout(() => setCopiedWan(false), 2000)
  }

  const primaryAdapter = adapters.find((a) => a.isPrimary) || adapters[0]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fluent-text">Netzwerk Toolkit</h1>
            <p className="text-xs text-fluent-muted">
              Adapterdiagnose, Latenzmessung, DNS-Benchmark und Port-Scanner
            </p>
          </div>
        </div>

        {/* Quick Tools Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={flushDns}
            disabled={isFlushingDns}
            title="Leert den Windows DNS-Auflösungscache"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-text text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isFlushingDns ? 'animate-spin' : ''}`} />
            DNS leeren
          </button>

          <button
            onClick={renewIp}
            disabled={isRenewingIp}
            title="Fordert eine neue DHCP-IP beim Router an"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-text text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRenewingIp ? 'animate-spin' : ''}`} />
            IP erneuern
          </button>

          <button
            onClick={openNetworkConnections}
            title="Öffnet die Windows-Netzwerkverbindungen (ncpa.cpl)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-text text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Adapter (ncpa.cpl)
          </button>

          <button
            onClick={reload}
            disabled={loadingDiagnostics}
            title="Diagnosedaten aktualisieren"
            className="p-2 rounded-xl bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-muted hover:text-fluent-text transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
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

      {/* Top Overview Cards (WAN IP, Gateway, Primary Adapter) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* WAN IP Card */}
        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fluent-muted flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-fluent-accent" /> Öffentliche WAN-IP
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                wan.isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {wan.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold font-mono text-fluent-text">
              {wan.ip || 'Nicht ermittelt'}
            </span>
            {wan.ip && (
              <button
                onClick={copyWanIp}
                title="WAN IP kopieren"
                className="p-1 rounded text-fluent-muted hover:text-fluent-accent transition-colors"
              >
                {copiedWan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Default Gateway Card */}
        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 space-y-1.5">
          <span className="text-xs text-fluent-muted flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" /> Standard-Gateway (Router)
          </span>
          <div className="text-lg font-bold font-mono text-fluent-text pt-1">
            {defaultGateway || '-'}
          </div>
        </div>

        {/* Primary Interface Card */}
        <div className="p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fluent-muted flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> Primäre Schnittstelle
            </span>
            {primaryAdapter?.linkSpeed && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-fluent-bg text-fluent-text border border-fluent-border/30">
                {primaryAdapter.linkSpeed}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-fluent-text truncate pt-1">
            {primaryAdapter?.name || 'Keine Verbindung'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-fluent-border/40 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Übersicht & Latenz
        </button>

        <button
          onClick={() => setActiveTab('dns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'dns'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          DNS Benchmark
        </button>

        <button
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ports'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          Port-Scanner
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Latency Matrix */}
          <PingMatrixCard
            results={pingResults}
            isPinging={isPinging}
            onRefresh={runPingTest}
          />

          {/* Network Adapters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fluent-text">
                Erkannte Netzwerk-Adapter ({adapters.length})
              </h3>
            </div>

            {loadingDiagnostics ? (
              <div className="p-8 text-center space-y-2 bg-fluent-card/20 rounded-xl border border-fluent-border/30">
                <RefreshCw className="w-5 h-5 text-fluent-accent animate-spin mx-auto" />
                <p className="text-xs text-fluent-muted">Lese Netzwerkadapter aus Windows...</p>
              </div>
            ) : adapters.length === 0 ? (
              <div className="p-8 text-center bg-fluent-card/20 rounded-xl border border-fluent-border/30 text-xs text-fluent-muted">
                Keine Netzwerkadapter gefunden.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {adapters.map((a) => (
                  <NetworkAdapterCard key={a.id} adapter={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dns' && (
        <DnsBenchmarkCard
          results={dnsResults}
          isBenchmarking={isBenchmarkingDns}
          testDomain={dnsTestDomain}
          onTestDomainChange={setDnsTestDomain}
          onRunBenchmark={runDnsBenchmark}
        />
      )}

      {activeTab === 'ports' && (
        <PortScannerCard
          report={portScanReport}
          isScanning={isScanningPorts}
          onScan={runPortScan}
        />
      )}
    </div>
  )
}

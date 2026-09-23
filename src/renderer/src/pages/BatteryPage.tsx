import React from 'react'
import {
  Battery,
  BatteryCharging,
  Zap,
  Plug,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileText,
  Sliders,
  CheckCircle2,
  Laptop,
  Flame,
  Activity,
  X,
  Skull
} from 'lucide-react'
import { useBattery } from '../hooks/useBattery'
import { Card } from '../components/ui/Card'

function formatMWh(mwh: number): string {
  if (mwh >= 1000) {
    return `${(mwh / 1000).toFixed(1)} Wh`
  }
  return `${mwh} mWh`
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return 'Berechne Restzeit...'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} Std. ${minutes} Min.`
  }
  return `${minutes} Minuten`
}

export const BatteryPage: React.FC = () => {
  const {
    info,
    isLoading,
    isSwitchingPlan,
    isGeneratingReport,
    isLiveMonitoring,
    killingPid,
    alertDismissed,
    reportResult,
    refresh,
    toggleLiveMonitoring,
    dismissAlert,
    killDrainProcess,
    setPowerPlan,
    generateReport
  } = useBattery()

  if (isLoading && !info) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-fluent-muted">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-fluent-accent" />
        <span className="text-xs">Lade Akku- und Energie-Informationen...</span>
      </div>
    )
  }

  const hasBattery = info?.hasBattery ?? false

  return (
    <div className="flex flex-col h-full bg-fluent-bg text-fluent-text p-8 overflow-y-auto space-y-6 pb-28">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fluent-accent/10 text-fluent-accent">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fluent-text">Batterie-Manager</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30">
              {hasBattery ? 'Laptop Modus' : 'Desktop Modus'}
            </span>
          </div>
          <p className="text-sm text-fluent-muted mt-1">
            Echtzeit-Ladestatus, Kapazitäts- und Gesundheitsanalyse, Verschleißgrad und Windows-Energieschemas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasBattery && (
            <button
              onClick={toggleLiveMonitoring}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isLiveMonitoring
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                  : 'bg-fluent-card border-fluent-border text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover'
              }`}
              title={
                isLiveMonitoring
                  ? 'Echtzeit-Überwachung aktiv (aktualisiert alle 4s)'
                  : 'Klicken, um Echtzeit-Überwachung zu starten'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <Activity className="w-3.5 h-3.5 text-fluent-accent" />
              <span>{isLiveMonitoring ? 'Live (4s)' : 'Live pausiert'}</span>
            </button>
          )}

          {hasBattery && (
            <button
              onClick={() => generateReport()}
              disabled={isGeneratingReport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
              title="Detaillierten interaktiven Windows-Akkureport generieren und im Browser öffnen"
            >
              <FileText className={`w-3.5 h-3.5 text-fluent-accent ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Erstelle Bericht...' : 'Akkubericht (HTML) öffnen'}
            </button>
          )}

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title="Akkudaten neu einlesen"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Battery Drain Alert Banner */}
      {hasBattery && info?.drainAlert && !alertDismissed && (
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-lg animate-in fade-in duration-300 ${
            info.drainAlert.severity === 'critical'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-100 shadow-rose-950/20'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-100 shadow-amber-950/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                info.drainAlert.severity === 'critical'
                  ? 'bg-rose-500/25 text-rose-400'
                  : 'bg-amber-500/25 text-amber-400'
              }`}
            >
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-fluent-text">{info.drainAlert.title}</span>
                {info.drainAlert.dischargeWattage > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-500/40">
                    -{info.drainAlert.dischargeWattage.toFixed(1)} W Entladerate
                  </span>
                )}
                {info.drainAlert.cpuPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40">
                    {info.drainAlert.cpuPercent}% CPU
                  </span>
                )}
              </div>
              <p className="text-xs text-fluent-muted leading-relaxed max-w-3xl">
                {info.drainAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {info.drainAlert.pid > 0 && (
              <button
                onClick={() => killDrainProcess(info.drainAlert!.pid)}
                disabled={killingPid === info.drainAlert.pid}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Skull className={`w-3.5 h-3.5 ${killingPid === info.drainAlert.pid ? 'animate-spin' : ''}`} />
                {killingPid === info.drainAlert.pid ? 'Beende...' : `App beenden (${info.drainAlert.processName})`}
              </button>
            )}
            <button
              onClick={dismissAlert}
              className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover transition-all"
              title="Warnung ausblenden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HTML Report Feedback */}
      {reportResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            reportResult.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {reportResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>
              {reportResult.success
                ? `Offizieller Windows-Akkubericht wurde geöffnet: ${reportResult.filePath}`
                : `Fehler beim Erstellen des Berichts: ${reportResult.error}`}
            </span>
          </div>
        </div>
      )}

      {/* Desktop Fallback Notice */}
      {!hasBattery && (
        <div className="p-6 rounded-2xl border border-fluent-border bg-fluent-card/70 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
            <Laptop className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-fluent-text">Kein Akku erkannt (Desktop-PC)</h3>
            <p className="text-xs text-fluent-muted leading-relaxed">
              Dieses System verfügt über keine Batterie und wird dauerhaft über das Stromnetz versorgt. 
              Du kannst die folgenden Windows-Energieschemas (Ausbalanciert, Energiesparmodus, Höchstleistung) zur Steuerung der Systemleistung nutzen.
            </p>
          </div>
        </div>
      )}

      {/* Laptop Battery Cards */}
      {hasBattery && info && (
        <>
          {/* Top Row: Live Charge Card + Battery Health Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Charge Status Card */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
                  Aktueller Ladestand
                </span>
                <div className="flex items-center gap-2">
                  {/* Live Wattage Badge */}
                  {info.isCharging && info.chargeRateWatts > 0 ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                      +{info.chargeRateWatts.toFixed(1)} W
                    </span>
                  ) : info.isDischarging && info.dischargeRateWatts > 0 ? (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      info.dischargeRateWatts >= 18
                        ? 'border-rose-500/40 text-rose-300 bg-rose-500/15'
                        : 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                    }`}>
                      <Flame className="w-3 h-3 text-amber-400" />
                      -{info.dischargeRateWatts.toFixed(1)} W
                    </span>
                  ) : info.isAcOnline ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <Plug className="w-3 h-3" />
                      0,0 W
                    </span>
                  ) : null}

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      info.isCharging
                        ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                        : info.isAcOnline
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                        : info.chargePercent > 20
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                        : 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {info.statusText}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Visual Battery Icon / Cell */}
                <div className="relative w-36 h-20 rounded-2xl border-2 border-fluent-border bg-black/30 p-1.5 flex items-center shrink-0">
                  {/* Battery tip */}
                  <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-2 h-6 bg-fluent-border rounded-r-md" />

                  {/* Battery Fill */}
                  <div
                    className={`h-full rounded-xl transition-all duration-700 flex items-center justify-center ${
                      info.isCharging
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30'
                        : info.chargePercent > 50
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20'
                        : info.chargePercent > 20
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-500 shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-r from-rose-600 to-red-500 shadow-lg shadow-rose-500/20'
                    }`}
                    style={{ width: `${Math.max(8, info.chargePercent)}%` }}
                  >
                    {info.isCharging && (
                      <Zap className="w-5 h-5 text-white animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-fluent-text">
                      {info.chargePercent} %
                    </span>
                  </div>
                  <div className="text-xs text-fluent-muted flex items-center gap-2 pt-1 flex-wrap">
                    {info.isAcOnline ? (
                      <>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Plug className="w-3.5 h-3.5" />
                          Netzteil aktiv
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Battery className="w-3.5 h-3.5" />
                          Akkubetrieb
                        </span>
                      </>
                    )}
                    {info.voltageV > 0 && (
                      <span className="text-fluent-muted font-mono text-[11px] px-1.5 py-0.5 rounded bg-fluent-card border border-fluent-border-subtle">
                        {info.voltageV.toFixed(2)} V
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Remaining Runtime & Rate Summary */}
              <div className="p-3.5 rounded-xl bg-fluent-card/70 border border-fluent-border flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-fluent-muted">
                  <Clock className="w-4 h-4 text-fluent-accent" />
                  {info.isCharging
                    ? 'Ladezeit-Schätzung'
                    : info.isAcOnline
                    ? 'Stromversorgung'
                    : 'Verbleibende Laufzeit'}
                </span>
                <span className="font-semibold text-fluent-text">
                  {info.remainingSeconds > 0
                    ? formatRemainingTime(info.remainingSeconds)
                    : info.isAcOnline
                    ? 'Dauerbetrieb am Netzteil'
                    : 'Wird berechnet...'}
                </span>
              </div>
            </Card>

            {/* Battery Health & Capacity Card */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
                  Akkugesundheit & Kapazität
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    info.healthRating === 'Exzellent'
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      : info.healthRating === 'Gut'
                      ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                      : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {info.healthRating} ({info.healthPercent} %)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-fluent-card/60 border border-fluent-border-subtle">
                  <div className="text-[11px] text-fluent-muted">Ursprüngliche Kapazität</div>
                  <div className="text-base font-bold text-fluent-text mt-0.5">
                    {formatMWh(info.designCapacityMWh)}
                  </div>
                  <div className="text-[10px] text-fluent-muted mt-0.5">Auslegung ab Werk</div>
                </div>

                <div className="p-3 rounded-xl bg-fluent-card/60 border border-fluent-border-subtle">
                  <div className="text-[11px] text-fluent-muted">Aktuelle Maximalkapazität</div>
                  <div className="text-base font-bold text-fluent-accent mt-0.5">
                    {formatMWh(info.fullChargeCapacityMWh)}
                  </div>
                  <div className="text-[10px] text-fluent-muted mt-0.5">Bei 100 % Ladung</div>
                </div>
              </div>

              {/* Capacity Comparison Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-fluent-muted">
                  <span>Kapazitäts-Erhalt: <b className="text-emerald-400">{info.healthPercent}%</b></span>
                  <span>Verschleißgrad: <b className="text-rose-400">{info.wearLevelPercent}%</b></span>
                </div>
                <div className="w-full h-2.5 bg-fluent-card-hover rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${info.healthPercent}%` }}
                    title={`Verfügbare Restkapazität: ${info.healthPercent}%`}
                  />
                  <div
                    className="h-full bg-rose-500/60 transition-all duration-500"
                    style={{ width: `${info.wearLevelPercent}%` }}
                    title={`Verschleiß: ${info.wearLevelPercent}%`}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Hardware & Diagnostic Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-fluent-accent" />
                Hersteller
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1 truncate" title={info.manufacturer}>
                {info.manufacturer}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5 truncate">
                ID: {info.modelId}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-fluent-accent" />
                Zellchemie
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.chemistry}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                Wiederaufladbare Li-Zellen
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-fluent-accent" />
                Spannung
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.voltageMv > 0 ? `${(info.voltageMv / 1000).toFixed(2)} V` : 'Standard'}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                Nennspannung
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-fluent-accent" />
                Ladezyklen
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.cycleCount > 0 ? info.cycleCount : '–'}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                {info.cycleCount > 0 ? 'Gemeldete Zyklen' : 'Firmware-verwaltet'}
              </div>
            </Card>
          </div>

          {/* Energy Drain Inspector (Top Processes) */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-fluent-text">
                    Energie-Fresser & Hintergrund-Last (Drain-Inspektor)
                  </h3>
                </div>
                <p className="text-xs text-fluent-muted">
                  Echtzeit-Analyse der laufenden Anwendungen nach CPU- und Energie-Auswirkung:
                </p>
              </div>

              {info.isDischarging && info.dischargeRateWatts > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs self-start sm:self-auto">
                  <span className="text-amber-200/80">Gemessene Gesamt-Entladung:</span>
                  <span className="font-extrabold text-amber-300">
                    -{info.dischargeRateWatts.toFixed(1)} W
                  </span>
                </div>
              ) : info.isCharging && info.chargeRateWatts > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs self-start sm:self-auto">
                  <span className="text-cyan-200/80">Gemessene Laderate:</span>
                  <span className="font-extrabold text-cyan-300">
                    +{info.chargeRateWatts.toFixed(1)} W
                  </span>
                </div>
              ) : null}
            </div>

            {info.drainProcesses && info.drainProcesses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-fluent-border text-fluent-muted">
                      <th className="pb-2.5 font-semibold">Anwendung / Prozess</th>
                      <th className="pb-2.5 font-semibold">CPU-Last</th>
                      <th className="pb-2.5 font-semibold">Arbeitsspeicher</th>
                      <th className="pb-2.5 font-semibold">Energie-Auswirkung</th>
                      <th className="pb-2.5 font-semibold text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fluent-border-subtle">
                    {info.drainProcesses.map((proc) => {
                      const isTargetKilling = killingPid === proc.id
                      return (
                        <tr
                          key={proc.id}
                          className="hover:bg-fluent-card-hover/40 transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-fluent-card border border-fluent-border flex items-center justify-center text-fluent-accent font-mono font-bold text-[10px]">
                                {proc.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-fluent-text">
                                  {proc.name}
                                </div>
                                <div className="text-[10px] font-mono text-fluent-muted">
                                  PID: {proc.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 pr-4">
                            <div className="space-y-1 w-32">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-fluent-text">
                                  {proc.cpuPercent} %
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-fluent-card-hover rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    proc.cpuPercent >= 15
                                      ? 'bg-rose-500'
                                      : proc.cpuPercent >= 7
                                      ? 'bg-amber-500'
                                      : proc.cpuPercent >= 2
                                      ? 'bg-yellow-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(8, proc.cpuPercent * 2.5))}%`
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 pr-4 text-fluent-text font-medium">
                            {proc.memoryMb} MB
                          </td>

                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                proc.impactLevel === 'Sehr hoch'
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                  : proc.impactLevel === 'Hoch'
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                  : proc.impactLevel === 'Moderat'
                                  ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              }`}
                            >
                              {proc.impactLevel}
                            </span>
                          </td>

                          <td className="py-3 text-right">
                            <button
                              onClick={() => killDrainProcess(proc.id)}
                              disabled={isTargetKilling}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-200 text-fluent-muted transition-all disabled:opacity-50"
                              title={`Prozess ${proc.name} (PID: ${proc.id}) sofort beenden`}
                            >
                              <Skull
                                className={`w-3 h-3 ${isTargetKilling ? 'animate-spin' : ''}`}
                              />
                              {isTargetKilling ? 'Beende...' : 'Beenden'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-fluent-border bg-fluent-card/40 text-center text-xs text-fluent-muted">
                Keine ressourcenhungrigen Hintergrund-Prozesse erkannt. Dein System läuft effizient im Leerlauf.
              </div>
            )}
          </Card>
        </>
      )}

      {/* Windows Power Schemes (Available on both Laptop & Desktop) */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-fluent-accent" />
            <h3 className="text-sm font-semibold text-slate-100">Windows Energieschemas & Leistungsprofile</h3>
          </div>
          <p className="text-xs text-fluent-muted">
            Wähle das aktive Energieprofil, um die Balance zwischen maximaler Akkulaufzeit und Spitzen-CPU-Leistung zu steuern:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {info?.availablePowerPlans.map((plan) => {
            const isSelected = plan.isCurrent
            return (
              <div
                key={plan.guid}
                onClick={() => !isSelected && !isSwitchingPlan && setPowerPlan(plan.guid)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-fluent-accent bg-fluent-accent/10 shadow-fluent ring-1 ring-fluent-accent/40'
                    : 'border-fluent-border bg-fluent-card/70 hover:border-fluent-border-hover'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-fluent-text">{plan.name}</span>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-fluent-accent text-white font-semibold">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-fluent-muted truncate max-w-[200px]" title={plan.guid}>
                    {plan.guid}
                  </div>
                </div>

                {!isSelected && (
                  <button
                    disabled={isSwitchingPlan}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-all"
                  >
                    Aktivieren
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Battery Hygiene & Best Practices Guide */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">Empfehlungen für maximale Akkulebensdauer</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 space-y-1">
            <span className="font-semibold text-fluent-text">🔋 20 % – 80 % Ladefenster</span>
            <p className="text-fluent-muted text-[11px] leading-relaxed">
              Lithium-Ionen-Akkus altern am wenigsten, wenn sie zwischen 20 % und 80 % gehalten werden. Häufiges Vollladen auf 100 % bei gleichzeitigem Dauerbetrieb am Netzteil belastet die Zellen am stärksten.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 space-y-1">
            <span className="font-semibold text-fluent-text">🌡️ Hitze ist der größte Feind</span>
            <p className="text-fluent-muted text-[11px] leading-relaxed">
              Akkus sollten nicht über 35 °C betrieben oder gelagert werden. Achte beim Laden auf ausreichende Belüftung der Unterseite und vermeide weiche Oberflächen wie Bettdecken.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-fluent-border bg-fluent-card/50 space-y-1">
            <span className="font-semibold text-fluent-text">💡 Display & Standby optimieren</span>
            <p className="text-fluent-muted text-[11px] leading-relaxed">
              Das Display verbraucht oft über 40 % der Gesamtenergie. Eine Absenkung der Helligkeit um nur 20 % verlängert die Laufzeit typischerweise um bis zu 45 Minuten.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
export default BatteryPage

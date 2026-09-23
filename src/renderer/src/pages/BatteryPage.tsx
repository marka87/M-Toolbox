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
  Laptop
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
    reportResult,
    refresh,
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
                  <div className="text-xs text-fluent-muted flex items-center gap-1.5 pt-1">
                    {info.isAcOnline ? (
                      <>
                        <Plug className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Netzteil angeschlossen</span>
                      </>
                    ) : (
                      <>
                        <Battery className="w-3.5 h-3.5 text-amber-400" />
                        <span>Akkubetrieb (Entlädt)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Remaining Runtime */}
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

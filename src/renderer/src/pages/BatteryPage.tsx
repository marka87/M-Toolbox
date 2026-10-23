import React from 'react'
import {
  Battery,
  BatteryCharging,
  Zap,
  Plug,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  Sliders,
  CheckCircle2,
  Laptop,
  Flame,
  Activity,
  ExternalLink
} from 'lucide-react'
import { useBattery } from '../hooks/useBattery'
import { Card } from '../components/ui/Card'
import { useTranslation } from '../i18n/LanguageContext'

function formatMWh(mwh: number): string {
  if (mwh >= 1000) {
    return `${(mwh / 1000).toFixed(1)} Wh`
  }
  return `${mwh} mWh`
}

export const BatteryPage: React.FC = () => {
  const { t, language } = useTranslation()
  const {
    info,
    isLoading,
    isSwitchingPlan,
    isGeneratingReport,
    isLiveMonitoring,
    liveIntervalSec,
    setPollInterval,
    reportResult,
    refresh,
    toggleLiveMonitoring,
    setPowerPlan,
    generateReport
  } = useBattery()

  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0 || seconds > 172800) return t.battery.calculating
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return language === 'en' ? `${hours}h ${minutes}m` : `${hours} Std. ${minutes} Min.`
    }
    return language === 'en' ? `${minutes}m` : `${minutes} Min.`
  }

  if (isLoading && !info) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-fluent-muted">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-fluent-accent" />
        <span className="text-xs">{t.battery.loading}</span>
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
            <h1 className="text-2xl font-bold tracking-tight text-fluent-text">{t.battery.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30">
              {hasBattery ? t.battery.laptopMode : t.battery.desktopMode}
            </span>
          </div>
          <p className="text-sm text-fluent-muted mt-1">
            {t.battery.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasBattery && (
            <div className="inline-flex items-center rounded-xl border border-fluent-border bg-fluent-card/70 p-0.5 text-xs font-semibold shadow-sm">
              <button
                onClick={toggleLiveMonitoring}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  isLiveMonitoring
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover'
                }`}
                title={
                  isLiveMonitoring
                    ? t.battery.liveTooltipActive.replace('{interval}', String(liveIntervalSec))
                    : t.battery.liveTooltipInactive
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <Activity className="w-3.5 h-3.5 text-fluent-accent" />
                <span>
                  {isLiveMonitoring
                    ? t.battery.liveMonitoringActive.replace('{interval}', String(liveIntervalSec))
                    : t.battery.liveMonitoringPaused}
                </span>
              </button>
              {isLiveMonitoring && (
                <div className="flex items-center gap-0.5 pl-1.5 pr-0.5 border-l border-fluent-border/60">
                  {[3, 6, 9].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setPollInterval(sec)}
                      className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all ${
                        liveIntervalSec === sec
                          ? 'bg-fluent-accent text-white font-bold shadow-sm'
                          : 'text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover'
                      }`}
                      title={t.battery.intervalTooltip.replace('{sec}', String(sec))}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasBattery && (
            <button
              onClick={() => generateReport()}
              disabled={isGeneratingReport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
              title={t.battery.reportTooltip}
            >
              <FileText className={`w-3.5 h-3.5 text-fluent-accent ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? t.battery.creatingReport : t.battery.openReportBtn}
            </button>
          )}

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover hover:border-fluent-border-hover text-fluent-text transition-all disabled:opacity-50"
            title={t.battery.refreshTooltip}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-fluent-accent ${isLoading ? 'animate-spin' : ''}`} />
            {t.battery.refreshBtn}
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
                ? t.battery.reportSuccess.replace('{path}', reportResult.filePath || '')
                : t.battery.reportError.replace('{error}', reportResult.error || '')}
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
            <h3 className="text-sm font-bold text-fluent-text">{t.battery.desktopNoticeTitle}</h3>
            <p className="text-xs text-fluent-muted leading-relaxed">
              {t.battery.desktopNoticeDesc}
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
                  {t.battery.currentCharge}
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
                          {t.battery.acOnline}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Battery className="w-3.5 h-3.5" />
                          {t.battery.batteryPower}
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
                    ? t.battery.chargingEstimate
                    : info.isAcOnline
                    ? t.battery.powerSupply
                    : t.battery.remainingRuntime}
                </span>
                <span className="font-semibold text-fluent-text">
                  {info.isCharging
                    ? info.remainingSeconds > 0 && info.remainingSeconds < 172800
                      ? t.battery.approxUntilFull.replace('{time}', formatRemainingTime(info.remainingSeconds))
                      : info.chargePercent >= 100
                      ? t.battery.fullyCharged
                      : t.battery.calculating
                    : info.isDischarging
                    ? info.remainingSeconds > 0 && info.remainingSeconds < 172800
                      ? formatRemainingTime(info.remainingSeconds)
                      : t.battery.calculating
                    : t.battery.continuousAc}
                </span>
              </div>
            </Card>

            {/* Battery Health & Capacity Card */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-fluent-muted">
                  {t.battery.healthCapacityTitle}
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
                  <div className="text-[11px] text-fluent-muted">{t.battery.originalCapacity}</div>
                  <div className="text-base font-bold text-fluent-text mt-0.5">
                    {formatMWh(info.designCapacityMWh)}
                  </div>
                  <div className="text-[10px] text-fluent-muted mt-0.5">{t.battery.factorySpec}</div>
                </div>

                <div className="p-3 rounded-xl bg-fluent-card/60 border border-fluent-border-subtle">
                  <div className="text-[11px] text-fluent-muted">{t.battery.currentMaxCapacity}</div>
                  <div className="text-base font-bold text-fluent-accent mt-0.5">
                    {formatMWh(info.fullChargeCapacityMWh)}
                  </div>
                  <div className="text-[10px] text-fluent-muted mt-0.5">{t.battery.atFullCharge}</div>
                </div>
              </div>

              {/* Capacity Comparison Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-fluent-muted">
                  <span>{t.battery.capacityRetention} <b className="text-emerald-400">{info.healthPercent}%</b></span>
                  <span>{t.battery.wearLevel} <b className="text-rose-400">{info.wearLevelPercent}%</b></span>
                </div>
                <div className="w-full h-2.5 bg-fluent-card-hover rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${info.healthPercent}%` }}
                    title={t.battery.availableCapacityTooltip.replace('{percent}', String(info.healthPercent))}
                  />
                  <div
                    className="h-full bg-rose-500/60 transition-all duration-500"
                    style={{ width: `${info.wearLevelPercent}%` }}
                    title={t.battery.wearTooltip.replace('{percent}', String(info.wearLevelPercent))}
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
                {t.battery.manufacturer}
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
                {t.battery.chemistry}
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.chemistry}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                {t.battery.rechargeableLi}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-fluent-accent" />
                {t.battery.voltage}
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.voltageMv > 0 ? `${(info.voltageMv / 1000).toFixed(2)} V` : t.dashboard.defaultVal}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                {t.battery.nominalVoltage}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-fluent-muted flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-fluent-accent" />
                {t.battery.chargeCycles}
              </div>
              <div className="text-sm font-bold text-fluent-text mt-1">
                {info.cycleCount > 0 ? info.cycleCount : '–'}
              </div>
              <div className="text-[10px] text-fluent-muted mt-0.5">
                {info.cycleCount > 0 ? t.battery.reportedCycles : t.battery.firmwareManaged}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Windows Power Schemes (Available on both Laptop & Desktop) */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-fluent-accent" />
              <h3 className="text-sm font-semibold text-slate-100">{t.battery.powerSchemesTitle}</h3>
            </div>
            <p className="text-xs text-fluent-muted">
              {t.battery.powerSchemesSubtitle}
            </p>
          </div>
          {/* Windows' own power mode (slider) is what the OS and OEM tune on modern laptops */}
          <button
            onClick={() => window.mToolbox.system.openExternal('ms-settings:powersleep')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover text-fluent-text transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t.battery.openPowerModeBtn}</span>
          </button>
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
                        {t.battery.activeBadge}
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
                    {t.battery.activateBtn}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
export default BatteryPage

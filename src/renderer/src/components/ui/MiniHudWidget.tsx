import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Cpu,
  Activity,
  Layers,
  Battery,
  BatteryCharging,
  Plug,
  Pin,
  PinOff,
  Sparkles,
  X,
  MousePointer,
  Eye
} from 'lucide-react'
import type { LiveMetrics, TelemetryMetric } from '../../../../shared/types'
import {
  formatHudPercent,
  formatHudWattage,
  formatHudRemainingTime,
  getMetricColor
} from '../../utils/hud-formatter'

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

// --- MEMOIZED HUD TILES (Clean Tabular Typography, Equal Sizing) ---

const HudProgressBar: React.FC<{ percent: number; colorClass: string }> = ({ percent, colorClass }) => (
  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
    <div
      className={`h-full ${colorClass}`}
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
)

const CpuTile = React.memo<{ cpuVal: number }>(({ cpuVal }) => {
  const color = getMetricColor(cpuVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
      {/* Row 1: Label left | Value right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-1 leading-none">
        <div className="flex items-baseline gap-1 min-w-0">
          <Cpu className="w-3 h-3 text-sky-400 shrink-0 self-center" />
          <span className="text-[11px] font-semibold text-slate-300 shrink-0 whitespace-nowrap">CPU</span>
        </div>
        <span
          className={`font-mono text-xs font-bold [font-variant-numeric:tabular-nums] text-right whitespace-nowrap shrink-0 min-w-[5ch] ${color.text}`}
        >
          {formatHudPercent(cpuVal)}
        </span>
      </div>
      <HudProgressBar percent={cpuVal} colorClass={color.bg} />
    </div>
  )
})
CpuTile.displayName = 'CpuTile'

const RamTile = React.memo<{ ramVal: number }>(({ ramVal }) => {
  const color = getMetricColor(ramVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
      {/* Row 1: Label left | Value right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-1 leading-none">
        <div className="flex items-baseline gap-1 min-w-0">
          <Activity className="w-3 h-3 text-indigo-400 shrink-0 self-center" />
          <span className="text-[11px] font-semibold text-slate-300 shrink-0 whitespace-nowrap">RAM</span>
        </div>
        <span
          className={`font-mono text-xs font-bold [font-variant-numeric:tabular-nums] text-right whitespace-nowrap shrink-0 min-w-[5ch] ${color.text}`}
        >
          {formatHudPercent(ramVal)}
        </span>
      </div>
      <HudProgressBar percent={ramVal} colorClass={color.bg} />
    </div>
  )
})
RamTile.displayName = 'RamTile'

const GpuTile = React.memo<{ gpuVal: number }>(({ gpuVal }) => {
  const color = getMetricColor(gpuVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
      {/* Row 1: Label left | Value right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-1 leading-none">
        <div className="flex items-baseline gap-1 min-w-0">
          <Layers className="w-3 h-3 text-purple-400 shrink-0 self-center" />
          <span className="text-[11px] font-semibold text-slate-300 shrink-0 whitespace-nowrap">GPU</span>
        </div>
        <span
          className={`font-mono text-xs font-bold [font-variant-numeric:tabular-nums] text-right whitespace-nowrap shrink-0 min-w-[5ch] ${color.text}`}
        >
          {formatHudPercent(gpuVal)}
        </span>
      </div>
      <HudProgressBar percent={gpuVal} colorClass={color.bg} />
    </div>
  )
})
GpuTile.displayName = 'GpuTile'

const BatteryTile = React.memo<{
  isAcOnline: boolean
  isCharging: boolean
  chargePercent: number
  watts: number
  remainingSeconds?: number
  spanFull?: boolean
}>(({ isAcOnline, isCharging, chargePercent, watts, remainingSeconds, spanFull }) => {
  const percentColor = chargePercent > 20 ? 'text-emerald-400' : 'text-rose-400'
  const barColor = chargePercent > 20 ? 'bg-emerald-400' : 'bg-rose-500'

  const statusText = isCharging ? 'LADEN' : isAcOnline ? 'NETZ' : 'AKKU'
  const timeText = formatHudRemainingTime(remainingSeconds)

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between ${
        spanFull ? 'col-span-2' : ''
      }`}
    >
      {/* Row 1: Label + Time left | 2 Fixed Right Slots (Percent 5ch & Wattage 8ch) */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-2 leading-none">
        <div className="flex items-baseline gap-1.5 min-w-0">
          {isCharging ? (
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0 self-center" />
          ) : isAcOnline ? (
            <Plug className="w-3.5 h-3.5 text-emerald-400 shrink-0 self-center" />
          ) : (
            <Battery className="w-3.5 h-3.5 text-amber-400 shrink-0 self-center" />
          )}
          <span className="text-[11px] font-semibold text-slate-300 shrink-0 whitespace-nowrap">
            {statusText}
          </span>
          {timeText && (
            <span className="text-[9.5px] text-slate-400 font-normal shrink-0 whitespace-nowrap">
              {timeText}
            </span>
          )}
        </div>

        {/* Slot 1: Percent (Right-aligned, tabular 5ch) */}
        <span
          className={`font-mono text-xs font-bold [font-variant-numeric:tabular-nums] text-right whitespace-nowrap shrink-0 min-w-[5ch] ${percentColor}`}
        >
          {formatHudPercent(chargePercent)}
        </span>

        {/* Slot 2: Wattage (Right-aligned, tabular 8ch) */}
        <span className="font-mono text-xs font-semibold [font-variant-numeric:tabular-nums] text-right whitespace-nowrap shrink-0 min-w-[8ch] text-slate-300">
          {formatHudWattage(watts)}
        </span>
      </div>

      <HudProgressBar percent={chargePercent} colorClass={barColor} />
    </div>
  )
})
BatteryTile.displayName = 'BatteryTile'

interface HudBatteryState {
  hasBattery: boolean
  isAcOnline: boolean
  chargePercent: number
  isCharging: boolean
  chargeRateWatts: number
  dischargeRateWatts: number
  remainingSeconds?: number
}

// Dev-only extreme test values for layout stress testing
const DEMO_STEPS = [
  { cpu: 0, ram: 5, bat: 5, watts: -5.2, isCharging: false, isAc: false, remSec: 3600 },
  { cpu: 4, ram: 45, bat: 87, watts: -17.0, isCharging: false, isAc: false, remSec: 7200 },
  { cpu: 9, ram: 100, bat: 100, watts: -105.5, isCharging: false, isAc: false, remSec: 0 },
  { cpu: 10, ram: 45, bat: 87, watts: 65.0, isCharging: true, isAc: true, remSec: 1800 },
  { cpu: 45, ram: 5, bat: 100, watts: 0.0, isCharging: false, isAc: true, remSec: 0 },
  { cpu: 100, ram: 100, bat: 5, watts: -17.0, isCharging: false, isAc: false, remSec: 1200 }
]

export const MiniHudWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [battery, setBattery] = useState<HudBatteryState | null>(null)
  const [showGpuUsage, setShowGpuUsage] = useState<boolean>(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true)
  const [isClickThrough, setIsClickThrough] = useState(false)
  const [opacity, setOpacity] = useState(0.92)
  const [isCleaningRam, setIsCleaningRam] = useState(false)
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null)

  // Demo mode state
  const isDemoMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      window.location.search.includes('demo=1') ||
      window.location.hash.includes('demo=1') ||
      localStorage.getItem('M_TOOLBOX_HUD_DEMO') === '1' ||
      (window as any).__M_TOOLBOX_HUD_DEMO__ === true
    )
  }, [])
  const [demoStepIndex, setDemoStepIndex] = useState(0)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const isMounted = useRef<boolean>(true)
  const lastUpdateRef = useRef<number>(0)
  const pendingMetricsRef = useRef<LiveMetrics | null>(null)
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef<boolean>(true)

  // Dynamic window content-size adjustment via ResizeObserver
  useEffect(() => {
    const el = rootRef.current
    if (!el || !window.mToolbox?.widget?.setHeight) return

    let rafId: number | null = null

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height
        if (height > 0) {
          if (rafId) cancelAnimationFrame(rafId)
          rafId = requestAnimationFrame(() => {
            window.mToolbox?.widget?.setHeight(Math.ceil(height))
          })
        }
      }
    })

    ro.observe(el)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
        throttleTimerRef.current = null
      }
    }
  }, [])

  // Demo mode 2s cycle interval
  useEffect(() => {
    if (!isDemoMode) return
    const timer = setInterval(() => {
      setDemoStepIndex((prev) => (prev + 1) % DEMO_STEPS.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [isDemoMode])

  // Visibility tracking (suspend renderer updates when hidden/minimized/locked)
  useEffect(() => {
    const handleVisChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'
      if (isVisibleRef.current && pendingMetricsRef.current && isMounted.current) {
        lastUpdateRef.current = Date.now()
        setMetrics(pendingMetricsRef.current)
        pendingMetricsRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisChange)

    let unbindWinVis: (() => void) | undefined
    if (window.mToolbox?.system?.onVisibilityChange) {
      unbindWinVis = window.mToolbox.system.onVisibilityChange((vis) => {
        isVisibleRef.current = vis && document.visibilityState === 'visible'
        if (isVisibleRef.current && pendingMetricsRef.current && isMounted.current) {
          lastUpdateRef.current = Date.now()
          setMetrics(pendingMetricsRef.current)
          pendingMetricsRef.current = null
        }
      })
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisChange)
      if (unbindWinVis) unbindWinVis()
    }
  }, [])

  useEffect(() => {
    let unsubscribeMetrics: (() => void) | undefined

    const setupHud = async () => {
      let enableGpu = false
      try {
        if (window.mToolbox?.settings?.getSettings) {
          const s = await window.mToolbox.settings.getSettings()
          enableGpu = Boolean(s?.showGpuUsage)
          if (isMounted.current) {
            setShowGpuUsage(enableGpu)
          }
        }
      } catch {
        // ignore
      }

      if (!isMounted.current) return

      const metricsList: TelemetryMetric[] = ['cpu', 'ram', 'battery', 'watts']
      if (enableGpu) {
        metricsList.push('gpu')
      }

      await window.mToolbox?.dashboard?.startMetricsStream({ metrics: metricsList })

      unsubscribeMetrics = window.mToolbox?.dashboard?.onLiveMetrics((data) => {
        if (data.battery) {
          setBattery({
            hasBattery: data.battery.hasBattery,
            isAcOnline: data.battery.isAcOnline,
            chargePercent: data.battery.percent,
            isCharging: data.battery.isCharging,
            chargeRateWatts: data.battery.chargeRateWatts,
            dischargeRateWatts: data.battery.dischargeRateWatts,
            remainingSeconds: data.battery.remainingSeconds
          })
        }

        if (!isMounted.current || !isVisibleRef.current) {
          pendingMetricsRef.current = data
          return
        }

        const isEco = data.battery?.hasBattery && !data.battery?.isAcOnline
        const minInterval = isEco ? 2000 : 1000
        const now = Date.now()
        const elapsed = now - lastUpdateRef.current

        if (elapsed >= minInterval) {
          lastUpdateRef.current = now
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current)
            throttleTimerRef.current = null
          }
          setMetrics(data)
        } else {
          pendingMetricsRef.current = data
          if (!throttleTimerRef.current) {
            throttleTimerRef.current = setTimeout(() => {
              throttleTimerRef.current = null
              if (pendingMetricsRef.current && isMounted.current && isVisibleRef.current) {
                lastUpdateRef.current = Date.now()
                setMetrics(pendingMetricsRef.current)
                pendingMetricsRef.current = null
              }
            }, minInterval - elapsed)
          }
        }
      })
    }

    setupHud()

    // Sync widget state
    window.mToolbox?.widget?.getState().then((state) => {
      if (state && isMounted.current) {
        setIsAlwaysOnTop(state.alwaysOnTop)
        if (typeof state.clickThrough === 'boolean') setIsClickThrough(state.clickThrough)
        if (typeof state.opacity === 'number') setOpacity(state.opacity)
      }
    }).catch(() => {})

    // Initial battery fetch
    window.mToolbox?.battery?.getInfo(false).then((info) => {
      if (info && isMounted.current) {
        setBattery({
          hasBattery: info.hasBattery,
          isAcOnline: info.isAcOnline,
          chargePercent: info.chargePercent,
          isCharging: info.isCharging,
          chargeRateWatts: info.chargeRateWatts,
          dischargeRateWatts: info.dischargeRateWatts
        })
      }
    }).catch(() => {})

    return () => {
      if (unsubscribeMetrics) unsubscribeMetrics()
      window.mToolbox?.dashboard?.stopMetricsStream()
    }
  }, [])

  const handleTogglePin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextVal = !isAlwaysOnTop
    setIsAlwaysOnTop(nextVal)
    try {
      await window.mToolbox?.widget?.setAlwaysOnTop(nextVal)
    } catch {
      // ignore
    }
  }, [isAlwaysOnTop])

  const handleToggleClickThrough = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextVal = !isClickThrough
    setIsClickThrough(nextVal)
    try {
      await window.mToolbox?.widget?.setClickThrough(nextVal)
    } catch {
      // ignore
    }
  }, [isClickThrough])

  const handleCycleOpacity = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const steps = [0.95, 0.8, 0.6]
    const currentIndex = steps.findIndex((s) => Math.abs(s - opacity) < 0.05)
    const nextOpacity = steps[(currentIndex + 1) % steps.length]
    setOpacity(nextOpacity)
    try {
      await window.mToolbox?.widget?.setOpacity(nextOpacity)
    } catch {
      // ignore
    }
  }, [opacity])

  const handleMouseEnter = useCallback(() => {
    if (isClickThrough) {
      window.mToolbox?.widget?.setClickThrough(false).catch(() => {})
    }
  }, [isClickThrough])

  const handleMouseLeave = useCallback(() => {
    if (isClickThrough) {
      window.mToolbox?.widget?.setClickThrough(true).catch(() => {})
    }
  }, [isClickThrough])

  const handleCleanRam = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCleaningRam) return
    setIsCleaningRam(true)
    try {
      const res = await window.mToolbox?.ram?.cleanWindows()
      const freedMB = res && res.freedBytes ? Math.round(res.freedBytes / (1024 * 1024)) : 0
      if (freedMB > 0) {
        setCleanFeedback(`+${freedMB}M`)
      } else {
        setCleanFeedback('OK')
      }
      setTimeout(() => setCleanFeedback(null), 2200)
    } catch {
      setCleanFeedback('!')
      setTimeout(() => setCleanFeedback(null), 2000)
    } finally {
      setIsCleaningRam(false)
    }
  }, [isCleaningRam])

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.mToolbox?.widget?.close()
  }, [])

  const handleDoubleClick = useCallback(() => {
    window.mToolbox?.widget?.restoreMainWindow()
  }, [])

  // Resolve values (Live vs Demo)
  const currentDemo = isDemoMode ? DEMO_STEPS[demoStepIndex] : null

  const cpuVal = currentDemo ? currentDemo.cpu : metrics?.cpuUsagePercent ?? 0
  const ramVal = currentDemo ? currentDemo.ram : metrics?.ramUsagePercent ?? 0
  const gpuVal = metrics?.gpuUsagePercent ?? 0

  const hasBattery = currentDemo ? true : battery?.hasBattery ?? false
  const isAcOnline = currentDemo ? currentDemo.isAc : battery?.isAcOnline ?? true
  const chargePercent = currentDemo ? currentDemo.bat : battery?.chargePercent ?? 0
  const isCharging = currentDemo ? currentDemo.isCharging : battery?.isCharging ?? false
  const dischargeWatts = battery?.dischargeRateWatts ?? 0
  const chargeWatts = battery?.chargeRateWatts ?? 0

  const wattsNumber = currentDemo
    ? currentDemo.watts
    : isCharging && chargeWatts > 0
    ? chargeWatts
    : !isAcOnline && dischargeWatts > 0
    ? -dischargeWatts
    : 0

  return (
    <div
      ref={rootRef}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-[240px] select-none cursor-move flex flex-col p-2 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-100 font-sans antialiased box-border"
      style={dragStyle}
      title="Doppelklick: M-Toolbox öffnen | Gedrückt halten zum Verschieben"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-0.5 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold tracking-wide text-slate-300 uppercase font-mono whitespace-nowrap shrink-0">
            M-TOOLBOX HUD
          </span>
          {isDemoMode && (
            <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[8px] font-mono font-bold border border-amber-500/30 shrink-0">
              DEMO
            </span>
          )}
        </div>

        {/* Action Buttons (Non-draggable) */}
        <div className="flex items-center gap-0.5" style={noDragStyle}>
          {/* Quick RAM Clean */}
          <button
            onClick={handleCleanRam}
            disabled={isCleaningRam}
            className="p-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 relative transition-colors"
            title="Arbeitsspeicher bereinigen (EmptyWorkingSet)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCleaningRam ? 'animate-spin text-cyan-400' : ''}`} />
            {cleanFeedback && (
              <span className="absolute -bottom-5 right-0 text-[10px] font-bold font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-500/50 whitespace-nowrap shadow-md z-10">
                {cleanFeedback}
              </span>
            )}
          </button>

          {/* Opacity Cycle */}
          <button
            onClick={handleCycleOpacity}
            className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={`Transparenz umschalten (aktuell ${Math.round(opacity * 100)}%)`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Click-Through Toggle */}
          <button
            onClick={handleToggleClickThrough}
            className={`p-0.5 rounded transition-colors ${
              isClickThrough
                ? 'text-sky-400 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={isClickThrough ? 'Click-Through aktiv (Klicks gehen durch)' : 'Click-Through inaktiv'}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Always on top toggle */}
          <button
            onClick={handleTogglePin}
            className={`p-0.5 rounded transition-colors ${
              isAlwaysOnTop
                ? 'text-amber-400 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={
              isAlwaysOnTop
                ? 'Always-on-Top aktiv (klicken zum Lösen)'
                : 'Always-on-Top inaktiv (klicken zum Anheften)'
            }
          >
            {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          {/* Close / Hide Widget */}
          <button
            onClick={handleClose}
            className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Widget schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid with React.memo tiles: Equal columns, consistent gap and padding */}
      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
        <CpuTile cpuVal={cpuVal} />
        <RamTile ramVal={ramVal} />
        {showGpuUsage && <GpuTile gpuVal={gpuVal} />}
        {hasBattery && (
          <BatteryTile
            isAcOnline={isAcOnline}
            isCharging={isCharging}
            chargePercent={chargePercent}
            watts={wattsNumber}
            remainingSeconds={isDemoMode ? currentDemo?.remSec : battery?.remainingSeconds}
            spanFull={!showGpuUsage}
          />
        )}
      </div>
    </div>
  )
}

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

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function getMetricColor(val: number): string {
  if (val < 60) return 'bg-emerald-400 text-emerald-400'
  if (val < 85) return 'bg-amber-400 text-amber-400'
  return 'bg-rose-500 text-rose-500'
}

// --- MEMOIZED HUD TILES (Clean Typography, Zero-Transition, Lightweight) ---

const CpuTile = React.memo<{ cpuVal: number }>(({ cpuVal }) => {
  const color = getMetricColor(cpuVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between leading-none">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" /> CPU
        </span>
        <span className={`font-mono text-xs font-bold ${color.split(' ')[1]}`}>
          {cpuVal}%
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
        <div
          className={`h-full ${color.split(' ')[0]}`}
          style={{ width: `${Math.min(100, Math.max(0, cpuVal))}%` }}
        />
      </div>
    </div>
  )
})
CpuTile.displayName = 'CpuTile'

const RamTile = React.memo<{ ramVal: number; ramGB: number }>(({ ramVal, ramGB }) => {
  const color = getMetricColor(ramVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between leading-none">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
          <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> RAM
        </span>
        <span className={`font-mono text-xs font-bold ${color.split(' ')[1]} flex items-baseline gap-1`}>
          {ramVal}% <span className="text-[10px] font-normal text-slate-400">({ramGB}G)</span>
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
        <div
          className={`h-full ${color.split(' ')[0]}`}
          style={{ width: `${Math.min(100, Math.max(0, ramVal))}%` }}
        />
      </div>
    </div>
  )
})
RamTile.displayName = 'RamTile'

const GpuTile = React.memo<{ gpuVal: number }>(({ gpuVal }) => {
  const color = getMetricColor(gpuVal)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between leading-none">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" /> GPU
        </span>
        <span className={`font-mono text-xs font-bold ${color.split(' ')[1]}`}>
          {gpuVal}%
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
        <div
          className={`h-full ${color.split(' ')[0]}`}
          style={{ width: `${Math.min(100, Math.max(0, gpuVal))}%` }}
        />
      </div>
    </div>
  )
})
GpuTile.displayName = 'GpuTile'

const BatteryTile = React.memo<{
  hasBattery: boolean
  isAcOnline: boolean
  isCharging: boolean
  chargePercent: number
  wattageText: string
  spanFull?: boolean
}>(({ hasBattery, isAcOnline, isCharging, chargePercent, wattageText, spanFull }) => {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-between ${
        spanFull ? 'col-span-2' : ''
      }`}
    >
      <div className="flex items-center justify-between leading-none">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
          {!hasBattery ? (
            <Plug className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : isCharging ? (
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : isAcOnline ? (
            <Plug className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Battery className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          {!hasBattery ? 'NETZ' : isCharging ? 'LADEN' : isAcOnline ? 'NETZ' : 'AKKU'}
        </span>
        <span className="font-mono text-xs font-bold text-slate-100 flex items-baseline gap-1.5 shrink-0">
          {!hasBattery ? (
            <span className="text-emerald-400 text-xs">AC Power</span>
          ) : (
            <>
              <span className={chargePercent > 20 ? 'text-emerald-400' : 'text-rose-400'}>
                {chargePercent}%
              </span>
              {wattageText && (
                <span className="text-[10px] font-normal text-slate-400">
                  {wattageText}
                </span>
              )}
            </>
          )}
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
        <div
          className={`h-full ${
            !hasBattery
              ? 'bg-emerald-400'
              : chargePercent > 20
              ? 'bg-emerald-400'
              : 'bg-rose-500'
          }`}
          style={{
            width: `${!hasBattery ? 100 : Math.min(100, Math.max(0, chargePercent))}%`
          }}
        />
      </div>
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
}

export const MiniHudWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [battery, setBattery] = useState<HudBatteryState | null>(null)
  const [showGpuUsage, setShowGpuUsage] = useState<boolean>(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true)
  const [isClickThrough, setIsClickThrough] = useState(false)
  const [opacity, setOpacity] = useState(0.92)
  const [isCleaningRam, setIsCleaningRam] = useState(false)
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null)

  const isMounted = useRef<boolean>(true)
  const lastUpdateRef = useRef<number>(0)
  const pendingMetricsRef = useRef<LiveMetrics | null>(null)
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef<boolean>(true)

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
            dischargeRateWatts: data.battery.dischargeRateWatts
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

  const cpuVal = metrics?.cpuUsagePercent ?? 0
  const ramVal = metrics?.ramUsagePercent ?? 0
  const ramGB = metrics?.ramUsedGB ?? 0
  const gpuVal = metrics?.gpuUsagePercent ?? 0

  const isAcOnline = battery?.isAcOnline ?? true
  const hasBattery = battery?.hasBattery ?? false
  const chargePercent = battery?.chargePercent ?? 0
  const isCharging = battery?.isCharging ?? false
  const dischargeWatts = battery?.dischargeRateWatts ?? 0
  const chargeWatts = battery?.chargeRateWatts ?? 0

  const wattageText = useMemo(() => {
    if (isCharging) {
      return chargeWatts > 0 ? `+${chargeWatts.toFixed(0)}W` : 'Laden'
    }
    if (!isAcOnline) {
      return dischargeWatts > 0 ? `-${dischargeWatts.toFixed(0)}W` : ''
    }
    return ''
  }, [isCharging, chargeWatts, isAcOnline, dischargeWatts])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full select-none cursor-move flex flex-col justify-between p-2 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-100 font-sans antialiased"
      style={dragStyle}
      title="Doppelklick: M-Toolbox öffnen | Gedrückt halten zum Verschieben"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase font-mono">
            M-TOOLBOX HUD
          </span>
        </div>

        {/* Action Buttons (Non-draggable) */}
        <div
          className="flex items-center gap-1"
          style={noDragStyle}
        >
          {/* Quick RAM Clean */}
          <button
            onClick={handleCleanRam}
            disabled={isCleaningRam}
            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 relative transition-colors"
            title="Arbeitsspeicher bereinigen (EmptyWorkingSet)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCleaningRam ? 'animate-spin text-cyan-400' : ''}`} />
            {cleanFeedback && (
              <span className="absolute -bottom-5 right-0 text-[10px] font-bold font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-500/50 whitespace-nowrap shadow-md">
                {cleanFeedback}
              </span>
            )}
          </button>

          {/* Opacity Cycle */}
          <button
            onClick={handleCycleOpacity}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={`Transparenz umschalten (aktuell ${Math.round(opacity * 100)}%)`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Click-Through Toggle */}
          <button
            onClick={handleToggleClickThrough}
            className={`p-1 rounded-md transition-colors ${
              isClickThrough ? 'text-sky-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={isClickThrough ? 'Click-Through aktiv (Klicks gehen durch)' : 'Click-Through inaktiv'}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Always on top toggle */}
          <button
            onClick={handleTogglePin}
            className={`p-1 rounded-md transition-colors ${
              isAlwaysOnTop ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={isAlwaysOnTop ? 'Always-on-Top aktiv (klicken zum Lösen)' : 'Always-on-Top inaktiv (klicken zum Anheften)'}
          >
            {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          {/* Close / Hide Widget */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Widget schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid with React.memo tiles */}
      <div className="grid grid-cols-2 gap-1.5 mt-1.5 flex-1">
        <CpuTile cpuVal={cpuVal} />
        <RamTile ramVal={ramVal} ramGB={ramGB} />
        {showGpuUsage && <GpuTile gpuVal={gpuVal} />}
        <BatteryTile
          hasBattery={hasBattery}
          isAcOnline={isAcOnline}
          isCharging={isCharging}
          chargePercent={chargePercent}
          wattageText={wattageText}
          spanFull={!showGpuUsage}
        />
      </div>
    </div>
  )
}

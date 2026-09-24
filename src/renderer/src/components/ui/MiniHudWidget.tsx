import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
import type { LiveMetrics } from '../../../../shared/types'

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function getMetricColor(val: number): string {
  if (val < 60) return 'bg-emerald-400 text-emerald-400'
  if (val < 85) return 'bg-amber-400 text-amber-400'
  return 'bg-rose-500 text-rose-500'
}

// --- MEMOIZED HUD TILES (Aufgabe 7) ---

const CpuTile = React.memo<{ cpuVal: number }>(({ cpuVal }) => {
  const color = getMetricColor(cpuVal)
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400 font-semibold">
          <Cpu className="w-3 h-3 text-sky-400" /> CPU
        </span>
        <span className={`font-mono font-bold ${color.split(' ')[1]}`}>
          {cpuVal}%
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color.split(' ')[0]}`}
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
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400 font-semibold">
          <Activity className="w-3 h-3 text-indigo-400" /> RAM
        </span>
        <span className={`font-mono font-bold ${color.split(' ')[1]}`}>
          {ramVal}% <span className="text-[8px] font-normal text-slate-400">({ramGB}G)</span>
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color.split(' ')[0]}`}
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
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400 font-semibold">
          <Layers className="w-3 h-3 text-purple-400" /> GPU
        </span>
        <span className={`font-mono font-bold ${color.split(' ')[1]}`}>
          {gpuVal}%
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color.split(' ')[0]}`}
          style={{ width: `${Math.min(100, Math.max(0, gpuVal))}%` }}
        />
      </div>
    </div>
  )
})
GpuTile.displayName = 'GpuTile'

const BatteryTile = React.memo<{
  hasBattery: boolean
  isCharging: boolean
  chargePercent: number
  wattageText: string
}>(({ hasBattery, isCharging, chargePercent, wattageText }) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400 font-semibold">
          {!hasBattery ? (
            <Plug className="w-3 h-3 text-emerald-400" />
          ) : isCharging ? (
            <BatteryCharging className="w-3 h-3 text-emerald-400" />
          ) : (
            <Battery className="w-3 h-3 text-amber-400" />
          )}
          {!hasBattery ? 'NETZ' : 'AKKU'}
        </span>
        <span className="font-mono font-bold text-slate-100 flex items-center gap-0.5">
          {!hasBattery ? (
            <span className="text-emerald-400 text-[10px]">AC Power</span>
          ) : (
            <>
              <span className={chargePercent > 20 ? 'text-emerald-400' : 'text-rose-400'}>
                {chargePercent}%
              </span>
              {wattageText && (
                <span className="text-[8px] text-slate-400 font-normal">
                  {wattageText}
                </span>
              )}
            </>
          )}
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
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
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true)
  const [isClickThrough, setIsClickThrough] = useState(false)
  const [opacity, setOpacity] = useState(0.92)
  const [isCleaningRam, setIsCleaningRam] = useState(false)
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null)

  useEffect(() => {
    // Start live metrics stream from TelemetryService
    window.mToolbox?.dashboard?.startMetricsStream()
    const unsubscribe = window.mToolbox?.dashboard?.onLiveMetrics((data) => {
      setMetrics(data)
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
    })

    // Sync widget state
    window.mToolbox?.widget?.getState().then((state) => {
      if (state) {
        setIsAlwaysOnTop(state.alwaysOnTop)
        if (typeof state.clickThrough === 'boolean') setIsClickThrough(state.clickThrough)
        if (typeof state.opacity === 'number') setOpacity(state.opacity)
      }
    }).catch(() => {})

    // Initial battery fetch (no polling loop needed!)
    window.mToolbox?.battery?.getInfo(false).then((info) => {
      if (info) {
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
      if (unsubscribe) unsubscribe()
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

  const hasBattery = battery?.hasBattery ?? false
  const chargePercent = battery?.chargePercent ?? 0
  const isCharging = battery?.isCharging ?? false
  const dischargeWatts = battery?.dischargeRateWatts ?? 0
  const chargeWatts = battery?.chargeRateWatts ?? 0

  const wattageText = useMemo(() => {
    if (isCharging) {
      return chargeWatts > 0 ? `+${chargeWatts.toFixed(0)}W` : 'Laden'
    }
    return dischargeWatts > 0 ? `-${dischargeWatts.toFixed(0)}W` : ''
  }, [isCharging, chargeWatts, dischargeWatts])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full select-none cursor-move flex flex-col justify-between p-2 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/60 text-slate-100 hover:border-slate-500/80 transition-colors"
      style={dragStyle}
      title="Doppelklick: M-Toolbox öffnen | Gedrückt halten zum Verschieben"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          <span className="text-[10px] font-black tracking-wider text-slate-300">M-TOOLBOX HUD</span>
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
            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors relative"
            title="Arbeitsspeicher bereinigen (EmptyWorkingSet)"
          >
            <Sparkles className={`w-3 h-3 ${isCleaningRam ? 'animate-spin text-cyan-400' : ''}`} />
            {cleanFeedback && (
              <span className="absolute -bottom-4 right-0 text-[9px] font-bold text-cyan-400 bg-slate-900 px-1 py-0.2 rounded border border-cyan-500/50 whitespace-nowrap">
                {cleanFeedback}
              </span>
            )}
          </button>

          {/* Opacity Cycle (Aufgabe 7) */}
          <button
            onClick={handleCycleOpacity}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={`Transparenz umschalten (aktuell ${Math.round(opacity * 100)}%)`}
          >
            <Eye className="w-3 h-3" />
          </button>

          {/* Click-Through Toggle (Aufgabe 7) */}
          <button
            onClick={handleToggleClickThrough}
            className={`p-1 rounded-md transition-colors ${
              isClickThrough ? 'text-sky-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={isClickThrough ? 'Click-Through aktiv (Klicks gehen durch)' : 'Click-Through inaktiv'}
          >
            <MousePointer className="w-3 h-3" />
          </button>

          {/* Always on top toggle */}
          <button
            onClick={handleTogglePin}
            className={`p-1 rounded-md transition-colors ${
              isAlwaysOnTop ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={isAlwaysOnTop ? 'Always-on-Top aktiv (klicken zum Lösen)' : 'Always-on-Top inaktiv (klicken zum Anheften)'}
          >
            {isAlwaysOnTop ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
          </button>

          {/* Close / Hide Widget */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Widget schließen"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2x2 Mini Metrics Grid with React.memo tiles */}
      <div className="grid grid-cols-2 gap-1.5 mt-1.5 flex-1">
        <CpuTile cpuVal={cpuVal} />
        <RamTile ramVal={ramVal} ramGB={ramGB} />
        <GpuTile gpuVal={gpuVal} />
        <BatteryTile
          hasBattery={hasBattery}
          isCharging={isCharging}
          chargePercent={chargePercent}
          wattageText={wattageText}
        />
      </div>
    </div>
  )
}

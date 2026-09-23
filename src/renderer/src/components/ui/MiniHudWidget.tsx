import React, { useEffect, useState } from 'react'
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
  X
} from 'lucide-react'
import type { LiveMetrics } from '../../../../shared/types'
import type { BatteryInfo } from '../../../../shared/battery.types'

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export const MiniHudWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [battery, setBattery] = useState<BatteryInfo | null>(null)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true)
  const [isCleaningRam, setIsCleaningRam] = useState(false)
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null)

  useEffect(() => {
    // Start live metrics stream
    window.mToolbox?.dashboard?.startMetricsStream()
    const unsubscribe = window.mToolbox?.dashboard?.onLiveMetrics((data) => {
      setMetrics(data)
    })

    // Sync widget always-on-top state
    window.mToolbox?.widget?.getState().then((state) => {
      if (state) setIsAlwaysOnTop(state.alwaysOnTop)
    }).catch(() => {})

    // Battery polling every 8s (lightweight, skips 250ms process scan)
    const fetchBattery = () => {
      window.mToolbox?.battery?.getInfo(false).then((info) => {
        setBattery(info)
      }).catch(() => {})
    }

    fetchBattery()
    const batteryInterval = setInterval(fetchBattery, 8000)

    return () => {
      if (unsubscribe) unsubscribe()
      clearInterval(batteryInterval)
    }
  }, [])

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextVal = !isAlwaysOnTop
    setIsAlwaysOnTop(nextVal)
    try {
      await window.mToolbox?.widget?.setAlwaysOnTop(nextVal)
    } catch {
      // ignore
    }
  }

  const handleCleanRam = async (e: React.MouseEvent) => {
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
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.mToolbox?.widget?.close()
  }

  const handleDoubleClick = () => {
    window.mToolbox?.widget?.restoreMainWindow()
  }

  const getMetricColor = (val: number) => {
    if (val < 60) return 'bg-emerald-400 text-emerald-400'
    if (val < 85) return 'bg-amber-400 text-amber-400'
    return 'bg-rose-500 text-rose-500'
  }

  const cpuVal = metrics?.cpuUsagePercent ?? 0
  const ramVal = metrics?.ramUsagePercent ?? 0
  const ramGB = metrics?.ramUsedGB ?? 0
  const gpuVal = metrics?.gpuUsagePercent ?? 0

  const hasBattery = battery?.hasBattery ?? false
  const chargePercent = battery?.chargePercent ?? 0
  const isCharging = battery?.isCharging ?? false
  const dischargeWatts = battery?.dischargeRateWatts ?? 0
  const chargeWatts = battery?.chargeRateWatts ?? 0

  const wattageText = isCharging
    ? chargeWatts > 0 ? `+${chargeWatts.toFixed(0)}W` : 'Laden'
    : dischargeWatts > 0 ? `-${dischargeWatts.toFixed(0)}W` : ''

  return (
    <div
      onDoubleClick={handleDoubleClick}
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

      {/* 2x2 Mini Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5 mt-1.5 flex-1">
        {/* CPU */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-400 font-semibold">
              <Cpu className="w-3 h-3 text-sky-400" /> CPU
            </span>
            <span className={`font-mono font-bold ${getMetricColor(cpuVal).split(' ')[1]}`}>
              {cpuVal}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(cpuVal).split(' ')[0]}`}
              style={{ width: `${Math.min(100, Math.max(0, cpuVal))}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-400 font-semibold">
              <Activity className="w-3 h-3 text-indigo-400" /> RAM
            </span>
            <span className={`font-mono font-bold ${getMetricColor(ramVal).split(' ')[1]}`}>
              {ramVal}% <span className="text-[8px] font-normal text-slate-400">({ramGB}G)</span>
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(ramVal).split(' ')[0]}`}
              style={{ width: `${Math.min(100, Math.max(0, ramVal))}%` }}
            />
          </div>
        </div>

        {/* GPU */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-400 font-semibold">
              <Layers className="w-3 h-3 text-purple-400" /> GPU
            </span>
            <span className={`font-mono font-bold ${getMetricColor(gpuVal).split(' ')[1]}`}>
              {gpuVal}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(gpuVal).split(' ')[0]}`}
              style={{ width: `${Math.min(100, Math.max(0, gpuVal))}%` }}
            />
          </div>
        </div>

        {/* Battery or AC */}
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
              ) : battery ? (
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
              ) : (
                '--'
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
      </div>
    </div>
  )
}


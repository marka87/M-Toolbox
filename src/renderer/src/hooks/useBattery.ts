import { useState, useEffect, useCallback, useRef } from 'react'
import type { BatteryInfo, BatteryReportResult, BatteryDrainProcess } from '@shared/battery.types'
import type { PowerProfileInfo, PowerProfileMode } from '@shared/types'

export function useBattery() {
  const [info, setInfo] = useState<BatteryInfo | null>(null)
  const [powerProfiles, setPowerProfiles] = useState<PowerProfileInfo[]>([])
  const [drainProcesses, setDrainProcesses] = useState<BatteryDrainProcess[]>([])
  const [lastDrainScanTime, setLastDrainScanTime] = useState<number | null>(null)
  const [isScanningDrain, setIsScanningDrain] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false)
  const [switchingMode, setSwitchingMode] = useState<PowerProfileMode | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportResult, setReportResult] = useState<BatteryReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isLiveMonitoring, setIsLiveMonitoring] = useState(true)
  const [liveIntervalSec, setLiveIntervalSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('M_TOOLBOX_BATTERY_LIVE_INTERVAL')
      if (saved) {
        const val = parseInt(saved, 10)
        if ([3, 6, 9].includes(val)) return val
      }
    } catch {
      // ignore
    }
    return 6
  })

  const setPollInterval = useCallback((sec: number) => {
    setLiveIntervalSec(sec)
    try {
      localStorage.setItem('M_TOOLBOX_BATTERY_LIVE_INTERVAL', String(sec))
    } catch {
      // ignore
    }
  }, [])

  const [killingPid, setKillingPid] = useState<number | null>(null)
  const [alertDismissed, setAlertDismissed] = useState(false)

  const isMounted = useRef(true)

  const fetchInfo = useCallback(async (forceProfiles = false) => {
    if (!window.mToolbox?.battery) return
    try {
      const data = await window.mToolbox.battery.getInfo()
      if (isMounted.current) {
        setInfo(data)
        setError(null)
      }
      if (window.mToolbox.battery.getPowerProfiles) {
        const profiles = await window.mToolbox.battery.getPowerProfiles(forceProfiles)
        if (isMounted.current) {
          setPowerProfiles(profiles)
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        console.warn('[useBattery] fetchInfo error:', err)
        setError(err?.message || 'Fehler beim Laden der Akkudaten.')
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const fetchDrainScan = useCallback(async () => {
    if (!window.mToolbox?.battery?.scanDrainProcesses) return
    setIsScanningDrain(true)
    try {
      const procs = await window.mToolbox.battery.scanDrainProcesses()
      if (isMounted.current) {
        setDrainProcesses(procs)
        const now = Date.now()
        setLastDrainScanTime(now)
        setInfo((prev) => (prev ? { ...prev, drainProcesses: procs, lastDrainScanTimestamp: now } : prev))
      }
    } catch (err) {
      console.warn('[useBattery] scanDrainProcesses error:', err)
    } finally {
      if (isMounted.current) {
        setIsScanningDrain(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const [isDocVisible, setIsDocVisible] = useState(() => {
    return typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  })

  // Listen to document.visibilityState
  useEffect(() => {
    const handleVisChange = () => {
      setIsDocVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleVisChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisChange)
    }
  }, [])

  // Listen to native window/power visibility events from Electron Main
  useEffect(() => {
    if (!window.mToolbox?.system?.onVisibilityChange) return
    const unbind = window.mToolbox.system.onVisibilityChange((visible) => {
      setIsWindowVisible(visible)
    })
    return () => {
      unbind()
    }
  }, [])

  useEffect(() => {
    const isVisible = isLiveMonitoring && isDocVisible && isWindowVisible

    if (!isVisible) return

    // Immediately fetch fresh snapshot when becoming visible/active (force profiles refresh)
    fetchInfo(true)

    // Poll live battery status every X seconds only while visible (use 60s cached profiles)
    const interval = setInterval(() => {
      fetchInfo(false)
    }, liveIntervalSec * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchInfo, isLiveMonitoring, isDocVisible, isWindowVisible, liveIntervalSec])

  // Decoupled drain inspector polling every 30s only while visible
  useEffect(() => {
    const isVisible = isLiveMonitoring && isDocVisible && isWindowVisible

    if (!isVisible) return

    // Immediately trigger drain scan when page becomes visible
    fetchDrainScan()

    const drainInterval = setInterval(() => {
      fetchDrainScan()
    }, 30000)

    return () => {
      clearInterval(drainInterval)
    }
  }, [fetchDrainScan, isLiveMonitoring, isDocVisible, isWindowVisible])

  const toggleLiveMonitoring = useCallback(() => {
    setIsLiveMonitoring((prev) => !prev)
  }, [])

  const dismissAlert = useCallback(() => {
    setAlertDismissed(true)
  }, [])

  const killDrainProcess = useCallback(
    async (pid: number) => {
      if (!window.mToolbox?.battery) return { success: false, message: 'API nicht verfügbar' }
      setKillingPid(pid)
      try {
        const res = await window.mToolbox.battery.killProcess(pid)
        if (isMounted.current) {
          await Promise.all([fetchInfo(), fetchDrainScan()])
        }
        return res
      } catch (err: any) {
        return { success: false, message: err?.message || 'Fehler beim Beenden des Prozesses.' }
      } finally {
        if (isMounted.current) {
          setKillingPid(null)
        }
      }
    },
    [fetchInfo, fetchDrainScan]
  )

  const setPowerPlan = useCallback(
    async (guid: string) => {
      if (!window.mToolbox?.battery) return { success: false }
      setIsSwitchingPlan(true)
      try {
        const res = await window.mToolbox.battery.setPowerPlan(guid)
        if (isMounted.current) {
          await fetchInfo()
        }
        return res
      } catch (err: any) {
        return { success: false, message: err?.message || 'Fehler beim Wechseln des Energieschemas.' }
      } finally {
        if (isMounted.current) {
          setIsSwitchingPlan(false)
        }
      }
    },
    [fetchInfo]
  )

  const generateReport = useCallback(async () => {
    if (!window.mToolbox?.battery) return
    setIsGeneratingReport(true)
    setReportResult(null)
    try {
      const res = await window.mToolbox.battery.generateReport()
      if (isMounted.current) {
        setReportResult(res)
      }
      return res
    } catch (err: any) {
      const res = { success: false, error: err?.message || 'Fehler beim Generieren des Akkuberichts.' }
      if (isMounted.current) {
        setReportResult(res)
      }
      return res
    } finally {
      if (isMounted.current) {
        setIsGeneratingReport(false)
      }
    }
  }, [])

  const setPowerProfile = useCallback(
    async (mode: PowerProfileMode) => {
      if (!window.mToolbox?.battery?.setPowerProfile) return { success: false, message: 'API nicht verfügbar' }
      setIsSwitchingPlan(true)
      setSwitchingMode(mode)

      // Optimistic instant UI update: mark clicked profile active immediately
      setPowerProfiles((prev) =>
        prev.map((p) => ({
          ...p,
          isActive: p.mode === mode
        }))
      )

      try {
        const res = await window.mToolbox.battery.setPowerProfile(mode)
        if (isMounted.current) {
          await fetchInfo()
        }
        return res
      } catch (err: any) {
        if (isMounted.current) {
          await fetchInfo()
        }
        return { success: false, message: err?.message || 'Fehler beim Wechseln des Profils.' }
      } finally {
        if (isMounted.current) {
          setIsSwitchingPlan(false)
          setSwitchingMode(null)
        }
      }
    },
    [fetchInfo]
  )

  const refresh = useCallback(async () => {
    await Promise.all([fetchInfo(true), fetchDrainScan()])
  }, [fetchInfo, fetchDrainScan])

  return {
    info,
    powerProfiles,
    isLoading,
    isSwitchingPlan,
    switchingMode,
    isGeneratingReport,
    isLiveMonitoring,
    liveIntervalSec,
    setPollInterval,
    killingPid,
    alertDismissed,
    reportResult,
    error,
    drainProcesses,
    lastDrainScanTime,
    isScanningDrain,
    scanDrainProcesses: fetchDrainScan,
    refresh,
    toggleLiveMonitoring,
    dismissAlert,
    killDrainProcess,
    setPowerPlan,
    setPowerProfile,
    generateReport
  }
}



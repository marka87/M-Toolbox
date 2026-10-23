import { useState, useEffect, useCallback, useRef } from 'react'
import type { BatteryInfo, BatteryReportResult } from '@shared/battery.types'

export function useBattery() {
  const [info, setInfo] = useState<BatteryInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false)
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

const isMounted = useRef(true)

  const fetchInfo = useCallback(async () => {
    if (!window.mToolbox?.battery) return
    try {
      const data = await window.mToolbox.battery.getInfo()
      if (isMounted.current) {
        setInfo(data)
        setError(null)
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

    // Immediately fetch fresh snapshot when becoming visible/active
    fetchInfo()

    // Poll live battery status every X seconds only while visible
    const interval = setInterval(() => {
      fetchInfo()
    }, liveIntervalSec * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchInfo, isLiveMonitoring, isDocVisible, isWindowVisible, liveIntervalSec])

  const toggleLiveMonitoring = useCallback(() => {
    setIsLiveMonitoring((prev) => !prev)
  }, [])

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

  const refresh = useCallback(async () => {
    await fetchInfo()
  }, [fetchInfo])

  return {
    info,
    isLoading,
    isSwitchingPlan,
    isGeneratingReport,
    isLiveMonitoring,
    liveIntervalSec,
    setPollInterval,
    reportResult,
    error,
    refresh,
    toggleLiveMonitoring,
    setPowerPlan,
    generateReport
  }
}


import { useState, useEffect, useCallback, useRef } from 'react'
import type { BatteryInfo, BatteryReportResult } from '@shared/battery.types'
import type { PowerProfileInfo, PowerProfileMode } from '@shared/types'

export function useBattery() {
  const [info, setInfo] = useState<BatteryInfo | null>(null)
  const [powerProfiles, setPowerProfiles] = useState<PowerProfileInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false)
  const [switchingMode, setSwitchingMode] = useState<PowerProfileMode | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportResult, setReportResult] = useState<BatteryReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isLiveMonitoring, setIsLiveMonitoring] = useState(true)
  const [killingPid, setKillingPid] = useState<number | null>(null)
  const [alertDismissed, setAlertDismissed] = useState(false)

  const isMounted = useRef(true)

  const fetchInfo = useCallback(async () => {
    if (!window.mToolbox?.battery) return
    try {
      const data = await window.mToolbox.battery.getInfo()
      if (isMounted.current) {
        setInfo(data)
        setError(null)
      }
      if (window.mToolbox.battery.getPowerProfiles) {
        const profiles = await window.mToolbox.battery.getPowerProfiles()
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

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    fetchInfo()

    if (!isLiveMonitoring) return

    // Poll live battery status & drain every 8 seconds (optimal energy efficiency)
    const interval = setInterval(() => {
      fetchInfo()
    }, 8000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchInfo, isLiveMonitoring])

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
          await fetchInfo()
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
    [fetchInfo]
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

  return {
    info,
    powerProfiles,
    isLoading,
    isSwitchingPlan,
    switchingMode,
    isGeneratingReport,
    isLiveMonitoring,
    killingPid,
    alertDismissed,
    reportResult,
    error,
    refresh: fetchInfo,
    toggleLiveMonitoring,
    dismissAlert,
    killDrainProcess,
    setPowerPlan,
    setPowerProfile,
    generateReport
  }
}



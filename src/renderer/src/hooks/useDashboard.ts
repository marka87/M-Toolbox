import { useState, useEffect, useCallback, useRef } from 'react'
import type { SystemInfo, LiveMetrics, TelemetryMetric } from '@shared/types'

export function useDashboard() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
  const [showGpuUsage, setShowGpuUsage] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef<boolean>(true)
  const lastUpdateRef = useRef<number>(0)
  const pendingMetricsRef = useRef<LiveMetrics | null>(null)
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef<boolean>(true)

  const fetchSystemInfo = useCallback(async (force = false) => {
    if (!window.mToolbox?.dashboard) {
      if (isMounted.current) {
        setError('Elektronische Schnittstelle (IPC) wird initialisiert...')
        setIsLoading(false)
      }
      return
    }
    try {
      if (isMounted.current) {
        setIsLoading(true)
        setError(null)
      }
      const data = await window.mToolbox.dashboard.getSystemInfo(force)
      if (isMounted.current) {
        setSystemInfo(data)
      }
    } catch (err: any) {
      console.error('Error fetching system info:', err)
      if (isMounted.current) {
        setError(err?.message || 'Systeminformationen konnten nicht geladen werden.')
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
        setLiveMetrics(pendingMetricsRef.current)
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
          setLiveMetrics(pendingMetricsRef.current)
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
    if (!window.mToolbox?.dashboard) return

    fetchSystemInfo(false)

    let unsubscribeMetrics: (() => void) | undefined

    const setupStream = async () => {
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

      const metricsList: TelemetryMetric[] = ['cpu', 'ram', 'net']
      if (enableGpu) {
        metricsList.push('gpu')
      }

      await window.mToolbox.dashboard.startMetricsStream({ metrics: metricsList })

      unsubscribeMetrics = window.mToolbox.dashboard.onLiveMetrics((incoming: LiveMetrics) => {
        if (!isMounted.current || !isVisibleRef.current) {
          pendingMetricsRef.current = incoming
          return
        }

        const isEco = incoming.battery?.hasBattery && !incoming.battery?.isAcOnline
        const minInterval = isEco ? 2000 : 1000
        const now = Date.now()
        const elapsed = now - lastUpdateRef.current

        if (elapsed >= minInterval) {
          lastUpdateRef.current = now
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current)
            throttleTimerRef.current = null
          }
          setLiveMetrics(incoming)
        } else {
          pendingMetricsRef.current = incoming
          if (!throttleTimerRef.current) {
            throttleTimerRef.current = setTimeout(() => {
              throttleTimerRef.current = null
              if (pendingMetricsRef.current && isMounted.current && isVisibleRef.current) {
                lastUpdateRef.current = Date.now()
                setLiveMetrics(pendingMetricsRef.current)
                pendingMetricsRef.current = null
              }
            }, minInterval - elapsed)
          }
        }
      })
    }

    setupStream()

    return () => {
      if (unsubscribeMetrics) unsubscribeMetrics()
      window.mToolbox?.dashboard?.stopMetricsStream()
    }
  }, [fetchSystemInfo])

  return {
    systemInfo,
    liveMetrics,
    showGpuUsage,
    isLoading,
    error,
    refresh: () => fetchSystemInfo(true)
  }
}

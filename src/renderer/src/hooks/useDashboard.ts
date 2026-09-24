import { useState, useEffect, useCallback } from 'react'
import type { SystemInfo, LiveMetrics } from '@shared/types'

export function useDashboard() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSystemInfo = useCallback(async (force = false) => {
    if (!window.mToolbox?.dashboard) {
      setError('Elektronische Schnittstelle (IPC) wird initialisiert...')
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await window.mToolbox.dashboard.getSystemInfo(force)
      setSystemInfo(data)
    } catch (err: any) {
      console.error('Error fetching system info:', err)
      setError(err?.message || 'Systeminformationen konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!window.mToolbox?.dashboard) return

    // Initial fetch
    fetchSystemInfo(false)

    // Start live metrics streaming (Dashboard only requires cpu, ram, and net)
    window.mToolbox.dashboard.startMetricsStream({ metrics: ['cpu', 'ram', 'net'] })

    const unsubscribe = window.mToolbox.dashboard.onLiveMetrics((metrics: LiveMetrics) => {
      setLiveMetrics(metrics)
    })

    return () => {
      unsubscribe()
      window.mToolbox?.dashboard?.stopMetricsStream()
    }
  }, [fetchSystemInfo])

  return {
    systemInfo,
    liveMetrics,
    isLoading,
    error,
    refresh: () => fetchSystemInfo(true)
  }
}

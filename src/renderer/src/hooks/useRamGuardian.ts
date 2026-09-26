import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  RAMLiveStats,
  RAMProcessItem,
  AppHygieneReport,
  RAMRecommendation,
  RAMHealthScore,
  RAMHistoryPoint,
  RAMCleanupResult
} from '@shared/ram.types'

export function useRamGuardian() {
  const [stats, setStats] = useState<RAMLiveStats | null>(null)
  const [processes, setProcesses] = useState<RAMProcessItem[]>([])
  const [hygiene, setHygiene] = useState<AppHygieneReport | null>(null)
  const [recommendations, setRecommendations] = useState<RAMRecommendation[]>([])
  const [healthScore, setHealthScore] = useState<RAMHealthScore | null>(null)
  const [history24h, setHistory24h] = useState<RAMHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCleaning, setIsCleaning] = useState<boolean>(false)
  const [cleanupResult, setCleanupResult] = useState<RAMCleanupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef(true)

  const fetchStats = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getStats()
      if (isMounted.current) {
        setStats(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM stats:', err)
    }
  }, [])

  const fetchProcesses = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getTopProcesses()
      if (isMounted.current) {
        setProcesses(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM processes:', err)
    }
  }, [])

  const fetchHygiene = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getHygiene()
      if (isMounted.current) {
        setHygiene(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM hygiene:', err)
    }
  }, [])

  const fetchRecommendations = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getRecommendations()
      if (isMounted.current) {
        setRecommendations(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM recommendations:', err)
    }
  }, [])

  const fetchHealthScore = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getHealthScore()
      if (isMounted.current) {
        setHealthScore(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM health score:', err)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    try {
      const data = await window.mToolbox.ram.getHistory24h()
      if (isMounted.current) {
        setHistory24h(data)
      }
    } catch (err: any) {
      console.warn('Failed to fetch RAM history:', err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.allSettled([
        fetchStats(),
        fetchProcesses(),
        fetchHygiene(),
        fetchRecommendations(),
        fetchHealthScore(),
        fetchHistory()
      ])
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der RAM-Guardian-Daten.')
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [fetchStats, fetchProcesses, fetchHygiene, fetchRecommendations, fetchHealthScore, fetchHistory])

  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const [isDocVisible, setIsDocVisible] = useState(() => {
    return typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  })

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

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

  // Periodic polling (paused when window/document is hidden, minimized or screen locked)
  useEffect(() => {
    const isVisible = isDocVisible && isWindowVisible
    if (!isVisible) return

    // Immediately fetch fresh stats upon becoming visible
    refreshAll()

    // Fast poll for live stats (every 3 seconds)
    const statsTimer = setInterval(() => {
      fetchStats()
    }, 3000)

    // Slower poll for processes & health (every 8 seconds)
    const procTimer = setInterval(() => {
      fetchProcesses()
      fetchHealthScore()
    }, 8000)

    return () => {
      clearInterval(statsTimer)
      clearInterval(procTimer)
    }
  }, [refreshAll, fetchStats, fetchProcesses, fetchHealthScore, isDocVisible, isWindowVisible])

  // Safe Windows Cleanup
  const cleanWindows = useCallback(async () => {
    if (!window.mToolbox?.ram) return
    setIsCleaning(true)
    setCleanupResult(null)
    try {
      const res = await window.mToolbox.ram.cleanWindows()
      if (isMounted.current) {
        setCleanupResult(res)
        await refreshAll()
      }
    } catch (err: any) {
      if (isMounted.current) {
        setCleanupResult({
          success: false,
          freedBytes: 0,
          details: [],
          error: err?.message || 'Bereinigung fehlgeschlagen'
        })
      }
    } finally {
      if (isMounted.current) {
        setIsCleaning(false)
      }
    }
  }, [refreshAll])

  // Disable startup item
  const disableStartup = useCallback(
    async (itemId: string) => {
      if (!window.mToolbox?.ram) return
      try {
        await window.mToolbox.ram.disableStartup(itemId)
        await Promise.allSettled([fetchHygiene(), fetchRecommendations(), fetchHealthScore()])
      } catch (err: any) {
        console.error('Failed to disable startup item:', err)
      }
    },
    [fetchHygiene, fetchRecommendations, fetchHealthScore]
  )

  return {
    stats,
    processes,
    hygiene,
    recommendations,
    healthScore,
    history24h,
    isLoading,
    isCleaning,
    cleanupResult,
    error,
    refreshAll,
    cleanWindows,
    disableStartup
  }
}


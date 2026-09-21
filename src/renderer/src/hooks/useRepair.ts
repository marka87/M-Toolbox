import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  RepairActionItem,
  SystemHealthStatus,
  RepairCategory,
  RepairLogEvent,
  RepairResult
} from '@shared/types'

export function useRepair() {
  const [health, setHealth] = useState<SystemHealthStatus | null>(null)
  const [actions, setActions] = useState<RepairActionItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<RepairCategory>('all')
  const [runningActionId, setRunningActionId] = useState<string | null>(null)
  const [logs, setLogs] = useState<RepairLogEvent[]>([])
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState<boolean>(false)
  const [lastResult, setLastResult] = useState<RepairResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Health-Status abfragen
  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.mToolbox.repair.getHealth()
      setHealth(res.health)
      setActions(res.actions || [])
    } catch (err: any) {
      console.error('[useRepair] Fehler beim Abfragen des Gesundheitsstatus:', err)
      setError(err?.message || 'Fehler beim Laden des Reparatur-Status.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // Progress Log Listener
  useEffect(() => {
    const unsubscribe = window.mToolbox.repair.onProgress((event) => {
      setLogs((prev) => [...prev, event])
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Reparatur-Aktion ausführen
  const runRepair = useCallback(
    async (actionId: string) => {
      if (runningActionId) return

      const action = actions.find((a) => a.id === actionId)
      setRunningActionId(actionId)
      setIsLogDrawerOpen(true)
      setLogs((prev) => [
        ...prev,
        {
          actionId,
          text: `[REPAIR] Starte "${action?.title || actionId}"...`,
          type: 'info'
        }
      ])

      try {
        const result = await window.mToolbox.repair.runAction(actionId)
        setLastResult(result)
        await fetchHealth()
      } catch (err: any) {
        setLogs((prev) => [
          ...prev,
          {
            actionId,
            text: `[FEHLER] ${err?.message || 'Unerwarteter Fehler bei der Reparatur.'}`,
            type: 'error'
          }
        ])
      } finally {
        setRunningActionId(null)
      }
    },
    [actions, runningActionId, fetchHealth]
  )

  // Als Administrator neu starten
  const restartAsAdmin = useCallback(async () => {
    try {
      await window.mToolbox.repair.restartAsAdmin()
    } catch (err: any) {
      console.error('[useRepair] Fehler beim Admin-Neustart:', err)
    }
  }, [])

  // Gefilterte Aktionen
  const filteredActions = useMemo(() => {
    if (selectedCategory === 'all') return actions
    return actions.filter((a) => a.category === selectedCategory)
  }, [actions, selectedCategory])

  return {
    health,
    actions,
    filteredActions,
    selectedCategory,
    setSelectedCategory,
    runningActionId,
    logs,
    isLogDrawerOpen,
    setIsLogDrawerOpen,
    lastResult,
    loading,
    error,
    fetchHealth,
    runRepair,
    restartAsAdmin
  }
}


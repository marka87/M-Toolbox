import { useState, useEffect, useCallback } from 'react'
import type { PerformanceModeState } from '@shared/types'

export function usePerformance() {
  const [state, setState] = useState<PerformanceModeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const loadState = useCallback(async () => {
    if (!window.mToolbox?.performance) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await window.mToolbox.performance.getState()
      setState(res)
    } catch (err) {
      console.error('[usePerformance] Error reading state:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  const toggle = async (): Promise<boolean> => {
    if (!window.mToolbox?.performance) return false
    setIsToggling(true)
    try {
      const res = await window.mToolbox.performance.toggle()
      setLastMessage(res.message)
      await loadState()
      return res.success
    } catch (err) {
      console.error('[usePerformance] Toggle error:', err)
      return false
    } finally {
      setIsToggling(false)
    }
  }

  const setActive = async (active: boolean): Promise<boolean> => {
    if (!window.mToolbox?.performance) return false
    setIsToggling(true)
    try {
      const res = await window.mToolbox.performance.setActive(active)
      setLastMessage(res.message)
      await loadState()
      return res.success
    } catch (err) {
      console.error('[usePerformance] Set active error:', err)
      return false
    } finally {
      setIsToggling(false)
    }
  }

  return {
    state,
    loading,
    isToggling,
    lastMessage,
    refresh: loadState,
    toggle,
    setActive
  }
}

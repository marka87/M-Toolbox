import { useCallback, useEffect, useState } from 'react'
import type { DeviceItem, DriverPackage, DriverStats, InstalledPackage } from '@shared/types'
import type {
  ReinstallArchiveSummary,
  ReinstallCreateOptions,
  ReinstallProgress,
  ReinstallRestoreOptions,
  ReinstallResult
} from '@shared/reinstall.types'

export function useReinstall() {
  const [apps, setApps] = useState<InstalledPackage[]>([])
  const [drivers, setDrivers] = useState<{ devices: DeviceItem[]; packages: DriverPackage[]; stats: DriverStats } | null>(null)
  const [system, setSystem] = useState<Record<string, unknown>>({})
  const [history, setHistory] = useState<Array<{ createdAt: string; status: string; details?: string }>>([])
  const [progress, setProgress] = useState<ReinstallProgress | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.mToolbox.reinstall.onProgress(setProgress)
    return unsubscribe
  }, [])

  const discover = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await window.mToolbox.reinstall.discover()
      setApps(result.apps)
      setDrivers(result.drivers)
      setSystem(result.system)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    } finally {
      setIsBusy(false)
    }
  }, [])

  const create = useCallback(async (filePath: string, options?: ReinstallCreateOptions): Promise<ReinstallResult> => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await window.mToolbox.reinstall.create(filePath, options)
      if (!result.success) setError(result.error || 'Installationsplan konnte nicht erstellt werden.')
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsBusy(false)
    }
  }, [])

  const preview = useCallback(async (filePath: string): Promise<ReinstallArchiveSummary | null> => {
    setError(null)
    try {
      return await window.mToolbox.reinstall.preview(filePath)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [])

  const restore = useCallback(async (filePath: string, options?: ReinstallRestoreOptions) => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await window.mToolbox.reinstall.restore(filePath, options)
      setHistory(await window.mToolbox.reinstall.history())
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsBusy(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistory(await window.mToolbox.reinstall.history())
  }, [])

  return { apps, drivers, system, history, progress, isBusy, error, discover, create, preview, restore, loadHistory }
}

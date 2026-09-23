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
  const [data, setData] = useState<{
    apps: InstalledPackage[]
    drivers: { devices: DeviceItem[]; packages: DriverPackage[]; stats: DriverStats } | null
    system: Record<string, unknown>
    history: Array<{ createdAt: string; status: string; details?: string }>
  }>({ apps: [], drivers: null, system: {}, history: [] })

  const [progress, setProgress] = useState<ReinstallProgress | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.mToolbox.reinstall.onProgress(setProgress)
    window.mToolbox.reinstall.history().then((history) => setData((d) => ({ ...d, history })))
    return unsubscribe
  }, [])

  const discover = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await window.mToolbox.reinstall.discover()
      setData((d) => ({ ...d, apps: result.apps, drivers: result.drivers, system: result.system }))
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [])

  const restore = useCallback(async (filePath: string, options?: ReinstallRestoreOptions) => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await window.mToolbox.reinstall.restore(filePath, options)
      const history = await window.mToolbox.reinstall.history()
      setData((d) => ({ ...d, history }))
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
    const history = await window.mToolbox.reinstall.history()
    setData((d) => ({ ...d, history }))
  }, [])

  return {
    apps: data.apps,
    drivers: data.drivers,
    system: data.system,
    history: data.history,
    progress,
    isBusy,
    error,
    discover,
    create,
    preview,
    restore,
    loadHistory
  }
}

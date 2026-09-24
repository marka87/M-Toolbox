import { useState, useEffect, useCallback } from 'react'
import type {
  SoftwarePackage,
  InstalledPackage,
  PackageUpdate,
  OperationLogEvent
} from '@shared/types'

export function useSoftware() {
  const [catalog, setCatalog] = useState<SoftwarePackage[]>([])
  const [installed, setInstalled] = useState<InstalledPackage[]>([])
  const [updates, setUpdates] = useState<PackageUpdate[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isOperating, setIsOperating] = useState<boolean>(false)
  const [activePackageId, setActivePackageId] = useState<string | null>(null)
  const [operationLogs, setOperationLogs] = useState<string[]>([])
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    if (!window.mToolbox?.software) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [cat, inst, upd] = await Promise.all([
        window.mToolbox.software.getCatalog(),
        window.mToolbox.software.getInstalled(),
        window.mToolbox.software.getUpdates()
      ])
      setCatalog(cat)
      setInstalled(inst)
      setUpdates(upd)
    } catch (err) {
      console.error('[useSoftware] loadData error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    if (!window.mToolbox?.software) return

    const unsubscribe = window.mToolbox.software.onProgress((event: OperationLogEvent) => {
      const line = event.line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim()
      if (!line || /^[-/\\|]$/.test(line)) return

      setOperationLogs((prev) => {
        const isProgress = /\b\d{1,3}%\b/.test(line) || /^[█░▒▓\s-]+\d+%/.test(line)
        if (isProgress && prev.length > 0) {
          const last = prev[prev.length - 1]
          if (/\b\d{1,3}%\b/.test(last) || /^[█░▒▓\s-]+\d+%/.test(last)) {
            return [...prev.slice(0, -1), line]
          }
        }
        return [...prev, line]
      })
    })

    return () => {
      unsubscribe()
    }
  }, [loadData])

  const toggleSelectPackage = (id: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedPackages(new Set())
  }

  const clearLogs = () => {
    setOperationLogs([])
  }

  const installPackage = async (packageId: string): Promise<boolean> => {
    setIsOperating(true)
    setActivePackageId(packageId)
    try {
      const res = await window.mToolbox.software.install(packageId)
      await loadData()
      return res.success
    } catch (err) {
      console.error('Install error:', err)
      return false
    } finally {
      setIsOperating(false)
      setActivePackageId(null)
    }
  }

  const uninstallPackage = async (packageId: string): Promise<boolean> => {
    setIsOperating(true)
    setActivePackageId(packageId)
    try {
      const res = await window.mToolbox.software.uninstall(packageId)
      await loadData()
      return res.success
    } catch (err) {
      console.error('Uninstall error:', err)
      return false
    } finally {
      setIsOperating(false)
      setActivePackageId(null)
    }
  }

  const upgradePackage = async (packageId: string): Promise<boolean> => {
    setIsOperating(true)
    setActivePackageId(packageId)
    try {
      const res = await window.mToolbox.software.upgrade(packageId)
      await loadData()
      return res.success
    } catch (err) {
      console.error('Upgrade error:', err)
      return false
    } finally {
      setIsOperating(false)
      setActivePackageId(null)
    }
  }

  const upgradeAll = async (): Promise<boolean> => {
    setIsOperating(true)
    try {
      const res = await window.mToolbox.software.upgradeAll()
      await loadData()
      return res.success
    } catch (err) {
      console.error('Upgrade all error:', err)
      return false
    } finally {
      setIsOperating(false)
    }
  }

  const installBatch = async (packageIds: string[]): Promise<void> => {
    setIsOperating(true)
    try {
      for (const id of packageIds) {
        setActivePackageId(id)
        await window.mToolbox.software.install(id)
      }
      clearSelection()
      await loadData()
    } catch (err) {
      console.error('Batch install error:', err)
    } finally {
      setIsOperating(false)
      setActivePackageId(null)
    }
  }

  const searchOnline = useCallback(async (query: string): Promise<SoftwarePackage[]> => {
    if (!window.mToolbox?.software?.search) return []
    try {
      return await window.mToolbox.software.search(query)
    } catch (err) {
      console.error('[useSoftware] searchOnline error:', err)
      return []
    }
  }, [])

  return {
    catalog,
    installed,
    updates,
    isLoading,
    isOperating,
    activePackageId,
    operationLogs,
    selectedPackages,
    toggleSelectPackage,
    clearSelection,
    clearLogs,
    refresh: loadData,
    installPackage,
    uninstallPackage,
    upgradePackage,
    upgradeAll,
    installBatch,
    searchOnline
  }
}


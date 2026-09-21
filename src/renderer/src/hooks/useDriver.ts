import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  DeviceItem,
  DriverPackage,
  DriverStats,
  DriverCategory,
  DriverExportResult,
  DriverOperationResult,
  GpuInfo,
  WindowsUpdateDriver
} from '@shared/types'

export type DriverVendorFilter = 'all' | 'oem' | 'microsoft' | 'amd' | 'nvidia' | 'intel' | 'hp' | 'realtek'

export function useDriver() {
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [packages, setPackages] = useState<DriverPackage[]>([])
  const [stats, setStats] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<DriverCategory>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [onlyProblems, setOnlyProblems] = useState<boolean>(false)
  const [onlyThirdParty, setOnlyThirdParty] = useState<boolean>(false)
  const [vendorFilter, setVendorFilter] = useState<DriverVendorFilter>('all')

  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportLogs, setExportLogs] = useState<string[]>([])
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState<boolean>(false)
  const [selectedDeviceForDetails, setSelectedDeviceForDetails] = useState<DeviceItem | null>(null)
  const [operationMessage, setOperationMessage] = useState<string | null>(null)

  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null)
  const [windowsUpdateDrivers, setWindowsUpdateDrivers] = useState<WindowsUpdateDriver[]>([])
  const [isCheckingWindowsUpdate, setIsCheckingWindowsUpdate] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, gpu] = await Promise.all([
        window.mToolbox.driver.getData(),
        window.mToolbox.driver.getGpuInfo().catch(() => null)
      ])
      setDevices(data.devices || [])
      setPackages(data.packages || [])
      setStats(data.stats || null)
      setGpuInfo(gpu)
    } catch (err: any) {
      console.error('[useDriver] Fehler beim Laden:', err)
      setError(err?.message || 'Fehler beim Laden der Geräte und Treiber.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Progress Listener
  useEffect(() => {
    const unsubscribe = window.mToolbox.driver.onProgress((log) => {
      setExportLogs((prev) => [...prev, log])
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Kategorie-Zähler
  const categoryCounts = useMemo(() => {
    const counts: Record<DriverCategory, number> = {
      all: devices.length,
      problems: 0,
      display: 0,
      net: 0,
      media: 0,
      input: 0,
      storage: 0,
      usb: 0,
      system: 0,
      other: 0
    }

    for (const d of devices) {
      if (d.status === 'Problem' || d.problemCode !== '') {
        counts.problems++
      }
      if (counts[d.category] !== undefined) {
        counts[d.category]++
      }
    }

    return counts
  }, [devices])

  // Hersteller-Zähler
  const vendorCounts = useMemo(() => {
    const counts: Record<DriverVendorFilter, number> = {
      all: devices.length,
      oem: 0,
      microsoft: 0,
      amd: 0,
      nvidia: 0,
      intel: 0,
      hp: 0,
      realtek: 0
    }

    for (const d of devices) {
      const mfg = (d.manufacturerName || '').toLowerCase()
      const provider = (d.driverProvider || '').toLowerCase()
      const desc = (d.deviceDescription || '').toLowerCase()

      if (d.isThirdParty) counts.oem++
      if (provider.includes('microsoft') || (!d.isThirdParty && !provider)) counts.microsoft++
      if (mfg.includes('amd') || mfg.includes('advanced micro devices') || mfg.includes('ati') || provider.includes('amd') || desc.includes('radeon')) counts.amd++
      if (mfg.includes('nvidia') || provider.includes('nvidia') || desc.includes('geforce') || desc.includes('nvidia')) counts.nvidia++
      if (mfg.includes('intel') || provider.includes('intel') || desc.includes('intel')) counts.intel++
      if (mfg.includes('hp') || mfg.includes('hewlett') || provider.includes('hp')) counts.hp++
      if (mfg.includes('realtek') || provider.includes('realtek') || desc.includes('realtek')) counts.realtek++
    }

    return counts
  }, [devices])

  // Gefilterte Geräte
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // 1. Problem-Filter
      if (onlyProblems && d.status !== 'Problem' && !d.problemCode) {
        return false
      }

      // 2. Drittanbieter-Filter
      if (onlyThirdParty && !d.isThirdParty) {
        return false
      }

      // 3. Hersteller / System Filter
      if (vendorFilter !== 'all') {
        const mfg = (d.manufacturerName || '').toLowerCase()
        const provider = (d.driverProvider || '').toLowerCase()
        const desc = (d.deviceDescription || '').toLowerCase()

        if (vendorFilter === 'oem') {
          if (!d.isThirdParty) return false
        } else if (vendorFilter === 'microsoft') {
          const isMs = provider.includes('microsoft') || (!d.isThirdParty && !provider)
          if (!isMs) return false
        } else if (vendorFilter === 'amd') {
          const isAmd =
            mfg.includes('amd') ||
            mfg.includes('advanced micro devices') ||
            mfg.includes('ati') ||
            provider.includes('amd') ||
            provider.includes('advanced micro devices') ||
            provider.includes('ati') ||
            desc.includes('amd') ||
            desc.includes('radeon')
          if (!isAmd) return false
        } else if (vendorFilter === 'nvidia') {
          const isNvidia =
            mfg.includes('nvidia') ||
            provider.includes('nvidia') ||
            desc.includes('geforce') ||
            desc.includes('nvidia')
          if (!isNvidia) return false
        } else if (vendorFilter === 'intel') {
          const isIntel =
            mfg.includes('intel') ||
            provider.includes('intel') ||
            desc.includes('intel')
          if (!isIntel) return false
        } else if (vendorFilter === 'hp') {
          const isHp =
            mfg.includes('hp') ||
            mfg.includes('hewlett') ||
            provider.includes('hp') ||
            provider.includes('hewlett')
          if (!isHp) return false
        } else if (vendorFilter === 'realtek') {
          const isRealtek =
            mfg.includes('realtek') ||
            provider.includes('realtek') ||
            desc.includes('realtek')
          if (!isRealtek) return false
        }
      }

      // 4. Kategorie-Filter
      if (selectedCategory === 'problems') {
        if (d.status !== 'Problem' && !d.problemCode) return false
      } else if (selectedCategory !== 'all') {
        if (d.category !== selectedCategory) return false
      }

      // 5. Suche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = d.deviceDescription.toLowerCase().includes(q)
        const matchMfg = d.manufacturerName.toLowerCase().includes(q)
        const matchDriver = d.driverName.toLowerCase().includes(q)
        const matchProvider = (d.driverProvider || '').toLowerCase().includes(q)
        const matchInstance = d.instanceId.toLowerCase().includes(q)
        if (!matchName && !matchMfg && !matchDriver && !matchProvider && !matchInstance) {
          return false
        }
      }

      return true
    })
  }, [devices, selectedCategory, searchQuery, onlyProblems, onlyThirdParty, vendorFilter])

  // Export aller Drittanbieter-Treiber
  const handleExportAll = async () => {
    try {
      const selectedDir = await window.mToolbox.driver.selectExportDir()
      if (!selectedDir) return

      setIsExporting(true)
      setIsLogDrawerOpen(true)
      setExportLogs([`[INFO] Starte Voll-Export aller Drittanbieter-Treiber nach: ${selectedDir}`])

      const result: DriverExportResult = await window.mToolbox.driver.exportDrivers(selectedDir, '*')
      if (result.success) {
        setOperationMessage(`Erfolg: ${result.exportedCount} Treiberpakete exportiert!`)
      } else {
        setOperationMessage(`Fehler beim Export: ${result.error || 'Unbekannt'}`)
      }
    } catch (err: any) {
      setOperationMessage(`Fehler: ${err?.message || 'Export abgebrochen'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Export eines einzelnen Treibers
  const handleExportSingle = async (infName: string) => {
    try {
      const cleanInf = infName.split(' ')[0] // falls z. B. "oem12.inf (name.inf)"
      const selectedDir = await window.mToolbox.driver.selectExportDir()
      if (!selectedDir) return

      setIsExporting(true)
      setIsLogDrawerOpen(true)
      setExportLogs([`[INFO] Starte Einzel-Export für ${cleanInf} nach: ${selectedDir}`])

      const result = await window.mToolbox.driver.exportDrivers(selectedDir, cleanInf)
      if (result.success) {
        setOperationMessage(`Treiber ${cleanInf} erfolgreich nach ${selectedDir} exportiert!`)
      } else {
        setOperationMessage(`Fehler: ${result.error || 'Treiber konnte nicht exportiert werden'}`)
      }
    } catch (err: any) {
      setOperationMessage(`Fehler: ${err?.message || 'Export fehlgeschlagen'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Hardware neu scannen
  const handleScanHardware = async () => {
    setLoading(true)
    setOperationMessage('Scanne Hardware auf Änderungen...')
    try {
      const res: DriverOperationResult = await window.mToolbox.driver.scanHardware()
      setOperationMessage(res.message)
      await fetchData()
    } catch (err: any) {
      setOperationMessage(`Scan-Fehler: ${err?.message || 'Fehler beim Scannen'}`)
    } finally {
      setLoading(false)
    }
  }

  // Geräte-Manager öffnen
  const handleOpenDeviceManager = async () => {
    await window.mToolbox.driver.openDeviceManager()
  }

  // Gerät neu starten
  const handleRestartDevice = async (instanceId: string) => {
    setOperationMessage(`Starte Gerät neu: ${instanceId}...`)
    try {
      const res = await window.mToolbox.driver.restartDevice(instanceId)
      setOperationMessage(res.message)
      await fetchData()
    } catch (err: any) {
      setOperationMessage(`Fehler beim Neustart des Geräts: ${err?.message || 'Fehlgeschlagen'}`)
    }
  }

  // Windows Update Treiber suchen
  const handleCheckWindowsUpdate = async () => {
    setIsCheckingWindowsUpdate(true)
    setOperationMessage('Prüfe Windows Update auf zertifizierte Treiber-Aktualisierungen...')
    try {
      const updates = await window.mToolbox.driver.checkWindowsUpdate()
      setWindowsUpdateDrivers(updates)
      if (updates.length === 0) {
        setOperationMessage('Windows Update: Keine ausstehenden Treiber-Updates gefunden. Treiber sind aktuell!')
      } else {
        setOperationMessage(`Windows Update: ${updates.length} Treiber-Update(s) verfügbar!`)
      }
    } catch (err: any) {
      setOperationMessage(`Windows Update Suche fehlgeschlagen: ${err?.message || 'Fehler'}`)
    } finally {
      setIsCheckingWindowsUpdate(false)
    }
  }

  // Online im Microsoft Update-Katalog suchen
  const handleSearchOnline = async (query: string) => {
    try {
      await window.mToolbox.driver.searchOnline(query)
    } catch (err: any) {
      console.error('[useDriver] Online-Suche Fehler:', err)
    }
  }

  // Hersteller-Downloadportal öffnen
  const handleOpenVendorPortal = async (url: string) => {
    try {
      await window.mToolbox.system.openExternal(url)
    } catch (err: any) {
      console.error('[useDriver] Fehler beim Öffnen des Herstellerportals:', err)
    }
  }

  // Windows Update Einstellungen öffnen
  const handleOpenWindowsUpdateSettings = async () => {
    try {
      await window.mToolbox.system.openExternal('ms-settings:windowsupdate')
    } catch (err: any) {
      console.error('[useDriver] Fehler beim Öffnen von Windows Update:', err)
    }
  }

  return {
    devices,
    packages,
    stats,
    loading,
    error,
    gpuInfo,
    windowsUpdateDrivers,
    isCheckingWindowsUpdate,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    onlyProblems,
    setOnlyProblems,
    onlyThirdParty,
    setOnlyThirdParty,
    vendorFilter,
    setVendorFilter,
    vendorCounts,
    filteredDevices,
    categoryCounts,
    isExporting,
    exportLogs,
    isLogDrawerOpen,
    setIsLogDrawerOpen,
    selectedDeviceForDetails,
    setSelectedDeviceForDetails,
    operationMessage,
    setOperationMessage,
    fetchData,
    handleExportAll,
    handleExportSingle,
    handleScanHardware,
    handleOpenDeviceManager,
    handleRestartDevice,
    handleCheckWindowsUpdate,
    handleSearchOnline,
    handleOpenVendorPortal,
    handleOpenWindowsUpdateSettings
  }
}


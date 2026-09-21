import { useState, useEffect, useCallback } from 'react'
import type {
  NetworkAdapterInfo,
  WanIpInfo,
  PingResultItem,
  DnsBenchmarkItem,
  PortScanReport
} from '@shared/types'

export function useNetwork() {
  const [adapters, setAdapters] = useState<NetworkAdapterInfo[]>([])
  const [wan, setWan] = useState<WanIpInfo>({ ip: null, isOnline: false })
  const [defaultGateway, setDefaultGateway] = useState<string | null>(null)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(true)

  // Ping State
  const [pingResults, setPingResults] = useState<PingResultItem[]>([])
  const [isPinging, setIsPinging] = useState<boolean>(false)
  const [customPingHost, setCustomPingHost] = useState<string>('')

  // DNS Benchmark State
  const [dnsResults, setDnsResults] = useState<DnsBenchmarkItem[]>([])
  const [isBenchmarkingDns, setIsBenchmarkingDns] = useState<boolean>(false)
  const [dnsTestDomain, setDnsTestDomain] = useState<string>('google.com')

  // Port Scanner State
  const [portScanReport, setPortScanReport] = useState<PortScanReport | null>(null)
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false)

  // Tool Actions State
  const [isFlushingDns, setIsFlushingDns] = useState<boolean>(false)
  const [isRenewingIp, setIsRenewingIp] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type })
  }

  // Clear toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return
    const t = setTimeout(() => setToastMessage(null), 4000)
    return () => clearTimeout(t)
  }, [toastMessage])

  // Load diagnostics & perform initial ping
  const loadDiagnostics = useCallback(async () => {
    try {
      setLoadingDiagnostics(true)
      const data = await window.mToolbox.network.getDiagnostics()
      setAdapters(data.adapters)
      setWan(data.wan)
      setDefaultGateway(data.defaultGateway)
    } catch (err) {
      console.error('Failed to load network diagnostics:', err)
      showToast('Fehler beim Laden der Netzwerkadapter.', 'error')
    } finally {
      setLoadingDiagnostics(false)
    }
  }, [])

  const runPingTest = useCallback(async (customHost?: string) => {
    try {
      setIsPinging(true)
      const results = await window.mToolbox.network.pingTargets(customHost)
      setPingResults(results)
    } catch (err) {
      console.error('Failed to run ping test:', err)
      showToast('Latenzmessung fehlgeschlagen.', 'error')
    } finally {
      setIsPinging(false)
    }
  }, [])

  const runDnsBenchmark = useCallback(async (domain?: string) => {
    try {
      setIsBenchmarkingDns(true)
      const targetDomain = domain || dnsTestDomain || 'google.com'
      const results = await window.mToolbox.network.benchmarkDns(targetDomain)
      setDnsResults(results)
      showToast(`DNS-Benchmark für ${targetDomain} abgeschlossen.`, 'success')
    } catch (err) {
      console.error('Failed to benchmark DNS:', err)
      showToast('DNS-Benchmark fehlgeschlagen.', 'error')
    } finally {
      setIsBenchmarkingDns(false)
    }
  }, [dnsTestDomain])

  const runPortScan = useCallback(async (target: string, ports: number[]) => {
    try {
      setIsScanningPorts(true)
      const report = await window.mToolbox.network.scanPorts(target, ports)
      setPortScanReport(report)
      showToast(`Port-Scan für ${report.target} abgeschlossen (${report.openCount} offene Ports).`, 'success')
    } catch (err) {
      console.error('Failed to scan ports:', err)
      showToast('Port-Scan fehlgeschlagen.', 'error')
    } finally {
      setIsScanningPorts(false)
    }
  }, [])

  const flushDns = useCallback(async () => {
    try {
      setIsFlushingDns(true)
      const res = await window.mToolbox.network.flushDns()
      showToast(res.message, res.success ? 'success' : 'error')
    } catch (err: any) {
      showToast(`Fehler beim Leeren des DNS-Caches: ${err?.message || 'Unbekannt'}`, 'error')
    } finally {
      setIsFlushingDns(false)
    }
  }, [])

  const renewIp = useCallback(async () => {
    try {
      setIsRenewingIp(true)
      const res = await window.mToolbox.network.renewIp()
      showToast(res.message, res.success ? 'success' : 'error')
      await loadDiagnostics()
    } catch (err: any) {
      showToast(`Fehler beim Erneuern der IP-Adresse: ${err?.message || 'Unbekannt'}`, 'error')
    } finally {
      setIsRenewingIp(false)
    }
  }, [loadDiagnostics])

  const openNetworkConnections = useCallback(async () => {
    await window.mToolbox.network.openNetworkConnections()
  }, [])

  useEffect(() => {
    loadDiagnostics()
    runPingTest()
  }, [loadDiagnostics, runPingTest])

  return {
    adapters,
    wan,
    defaultGateway,
    loadingDiagnostics,
    pingResults,
    isPinging,
    customPingHost,
    setCustomPingHost,
    runPingTest,
    dnsResults,
    isBenchmarkingDns,
    dnsTestDomain,
    setDnsTestDomain,
    runDnsBenchmark,
    portScanReport,
    isScanningPorts,
    runPortScan,
    isFlushingDns,
    isRenewingIp,
    toastMessage,
    flushDns,
    renewIp,
    openNetworkConnections,
    reload: loadDiagnostics
  }
}

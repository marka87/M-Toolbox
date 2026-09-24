import * as net from 'net'
import * as https from 'https'
import * as dns from 'dns'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'
import type {
  NetworkAdapterInfo,
  WanIpInfo,
  PingResultItem,
  DnsBenchmarkItem,
  PortScanItem,
  PortScanReport,
  NetworkDiagnosticsData
} from '../../shared/types'

const PORT_SERVICES: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  135: 'MS RPC',
  139: 'NetBIOS',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  1433: 'MS SQL',
  1521: 'Oracle DB',
  3000: 'Node / React Dev',
  3306: 'MySQL / MariaDB',
  3389: 'RDP (Remote Desktop)',
  5173: 'Vite Dev Server',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP Alt / Proxy',
  8443: 'HTTPS Alt',
  27017: 'MongoDB'
}

export class NetworkService {
  private static instance: NetworkService

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  /**
   * Reads all physical & virtual network adapters along with IP configurations.
   */
  public async getDiagnostics(): Promise<NetworkDiagnosticsData> {
    const psScript = `& {
      $adapters = Get-NetAdapter -ErrorAction SilentlyContinue
      $ipConfigs = Get-NetIPConfiguration -ErrorAction SilentlyContinue

      $results = @()
      foreach ($a in $adapters) {
        $ip = $ipConfigs | Where-Object { $_.InterfaceIndex -eq $a.InterfaceIndex -or $_.InterfaceAlias -eq $a.Name } | Select-Object -First 1
        
        $ipv4 = ""
        $ipv6 = ""
        $gw = ""
        $dnsList = @()

        if ($ip) {
          if ($ip.IPv4Address) { $ipv4 = ($ip.IPv4Address.IPAddress -join ", ") }
          if ($ip.IPv6Address) { $ipv6 = ($ip.IPv6Address.IPAddress -join ", ") }
          if ($ip.IPv4DefaultGateway) { $gw = ($ip.IPv4DefaultGateway.NextHop -join ", ") }
          if ($ip.DNSServer) { $dnsList = ($ip.DNSServer.ServerAddresses | Where-Object { $_ -ne "" }) }
        }

        [PSCustomObject]@{
          id = [string]$a.InterfaceIndex
          name = $a.Name
          description = $a.InterfaceDescription
          status = [string]$a.Status
          linkSpeed = $a.LinkSpeed
          macAddress = $a.MacAddress
          ipv4Address = $ipv4
          ipv6Address = $ipv6
          gateway = $gw
          dnsServers = $dnsList
          isPrimary = ($gw -ne "" -and $a.Status -eq "Up")
        }
      }

      $results | ConvertTo-Json -Compress
    }`

    let adapters: NetworkAdapterInfo[] = []
    let defaultGateway: string | null = null

    try {
      const stdout = await powershellService.runPowerShell(psScript, 12000)

      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        const rawList = Array.isArray(parsed) ? parsed : [parsed]

        adapters = rawList.map((item: any) => ({
          id: String(item.id || item.name),
          name: String(item.name || 'Unbekannt'),
          description: String(item.description || ''),
          status: item.status === 'Up' ? 'Up' : item.status === 'Down' ? 'Down' : 'Unknown',
          linkSpeed: String(item.linkSpeed || '0 bps'),
          macAddress: String(item.macAddress || '-'),
          ipv4Address: String(item.ipv4Address || ''),
          ipv6Address: String(item.ipv6Address || ''),
          gateway: String(item.gateway || ''),
          dnsServers: Array.isArray(item.dnsServers)
            ? item.dnsServers.map(String)
            : item.dnsServers
            ? [String(item.dnsServers)]
            : [],
          isPrimary: Boolean(item.isPrimary)
        }))

        // Sort: Primary first, then Up, then others
        adapters.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1
          if (!a.isPrimary && b.isPrimary) return 1
          if (a.status === 'Up' && b.status !== 'Up') return -1
          if (a.status !== 'Up' && b.status === 'Up') return 1
          return a.name.localeCompare(b.name)
        })

        const primary = adapters.find((a) => a.isPrimary && a.gateway)
        if (primary) {
          defaultGateway = primary.gateway.split(',')[0].trim()
        }
      }
    } catch (err) {
      console.error('Failed to query network adapters via PowerShell:', err)
    }

    // Query WAN IP in parallel with timeout
    const wan = await this.getWanIp()

    return {
      adapters,
      wan,
      defaultGateway
    }
  }

  /**
   * Fast WAN IP lookup using ipify HTTPS.
   */
  public async getWanIp(): Promise<WanIpInfo> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ ip: null, isOnline: false })
      }, 3500)

      const req = https.get(
        'https://api.ipify.org?format=json',
        { headers: { 'User-Agent': 'M-Toolbox-Client' } },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            clearTimeout(timeout)
            try {
              const data = JSON.parse(body)
              resolve({
                ip: data.ip || null,
                isOnline: true
              })
            } catch {
              resolve({ ip: null, isOnline: false })
            }
          })
        }
      )

      req.on('error', () => {
        clearTimeout(timeout)
        resolve({ ip: null, isOnline: false })
      })

      req.on('timeout', () => {
        req.destroy()
        clearTimeout(timeout)
        resolve({ ip: null, isOnline: false })
      })
    })
  }

  /**
   * Pings multiple key targets concurrently.
   */
  public async pingTargets(customHost?: string): Promise<PingResultItem[]> {
    const targets: { target: string; name: string }[] = [
      { target: '1.1.1.1', name: 'Cloudflare DNS' },
      { target: '8.8.8.8', name: 'Google DNS' },
      { target: '9.9.9.9', name: 'Quad9 DNS' },
      { target: 'www.microsoft.com', name: 'Microsoft' }
    ]

    if (customHost && customHost.trim()) {
      const cleanCustom = customHost.trim().replace(/^https?:\/\//, '').split('/')[0]
      if (cleanCustom) {
        targets.push({ target: cleanCustom, name: `Benutzerdefiniert (${cleanCustom})` })
      }
    }

    // Ping using PowerShell Test-Connection in parallel for fast execution
    const psScript = `& {
      $targets = @(${targets.map((t) => `'${t.target}'`).join(',')})
      $jobs = foreach ($t in $targets) {
        Start-Job -ScriptBlock {
          param($dest)
          $r = Test-Connection -ComputerName $dest -Count 2 -ErrorAction SilentlyContinue
          if ($r) {
            $avg = ($r | Measure-Object -Property ResponseTime -Average).Average
            $min = ($r | Measure-Object -Property ResponseTime -Minimum).Minimum
            $max = ($r | Measure-Object -Property ResponseTime -Maximum).Maximum
            [PSCustomObject]@{
              Target = $dest
              Success = $true
              Avg = [math]::Round($avg)
              Min = [math]::Round($min)
              Max = [math]::Round($max)
              Loss = 0
            }
          } else {
            [PSCustomObject]@{
              Target = $dest
              Success = $false
              Avg = -1
              Min = -1
              Max = -1
              Loss = 100
            }
          }
        } -ArgumentList $t
      }
      $results = $jobs | Wait-Job -Timeout 6 | Receive-Job
      $jobs | Remove-Job -Force
      $results | ConvertTo-Json -Compress
    }`

    try {
      const stdout = await powershellService.runPowerShell(psScript, 10000)

      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim())
        const list = Array.isArray(parsed) ? parsed : [parsed]
        const map = new Map<string, any>()
        list.forEach((item) => map.set(item.Target.toLowerCase(), item))

        return targets.map((t) => {
          const res = map.get(t.target.toLowerCase())
          const isAlive = res ? Boolean(res.Success) : false
          const latency = isAlive ? Number(res.Avg) : -1

          let status: PingResultItem['status'] = 'offline'
          if (isAlive) {
            if (latency < 25) status = 'excellent'
            else if (latency < 60) status = 'good'
            else if (latency < 120) status = 'moderate'
            else status = 'high'
          }

          return {
            target: t.target,
            name: t.name,
            isAlive,
            latencyMs: latency,
            minMs: res ? Number(res.Min) : undefined,
            maxMs: res ? Number(res.Max) : undefined,
            packetLossPercent: res ? Number(res.Loss) : 100,
            status
          }
        })
      }
    } catch (err) {
      console.error('Ping targets failed:', err)
    }

    // Fallback if PowerShell jobs fail
    return targets.map((t) => ({
      target: t.target,
      name: t.name,
      isAlive: false,
      latencyMs: -1,
      packetLossPercent: 100,
      status: 'offline'
    }))
  }

  /**
   * Benchmarks DNS resolution latency across major public DNS resolvers.
   */
  public async benchmarkDns(domain: string = 'google.com'): Promise<DnsBenchmarkItem[]> {
    const resolvers = [
      { id: 'system', name: 'System DNS (Default)', server: 'System' },
      { id: 'cloudflare', name: 'Cloudflare', server: '1.1.1.1' },
      { id: 'google', name: 'Google Public DNS', server: '8.8.8.8' },
      { id: 'quad9', name: 'Quad9', server: '9.9.9.9' },
      { id: 'opendns', name: 'Cisco OpenDNS', server: '208.67.222.222' },
      { id: 'adguard', name: 'AdGuard DNS', server: '94.140.14.14' }
    ]

    const resolveWithTimer = async (
      server: string,
      targetDomain: string
    ): Promise<{ latencyMs: number; status: 'success' | 'timeout' | 'error'; errorMessage?: string }> => {
      const startTime = performance.now()

      const resolvePromise = new Promise<{ latencyMs: number; status: 'success' | 'timeout' | 'error'; errorMessage?: string }>(
        (resolve) => {
          if (server === 'System') {
            dns.promises
              .lookup(targetDomain)
              .then(() => {
                const duration = Math.round(performance.now() - startTime)
                resolve({ latencyMs: duration, status: 'success' })
              })
              .catch((err) => {
                resolve({ latencyMs: -1, status: 'error', errorMessage: err.message })
              })
          } else {
            const customResolver = new dns.promises.Resolver()
            customResolver.setServers([server])
            customResolver
              .resolve4(targetDomain)
              .then(() => {
                const duration = Math.round(performance.now() - startTime)
                resolve({ latencyMs: duration, status: 'success' })
              })
              .catch((err) => {
                resolve({ latencyMs: -1, status: 'error', errorMessage: err.message })
              })
          }
        }
      )

      // Strict 2500ms timeout race
      const timeoutPromise = new Promise<{ latencyMs: number; status: 'success' | 'timeout' | 'error'; errorMessage?: string }>(
        (resolve) => {
          setTimeout(() => {
            resolve({ latencyMs: -1, status: 'timeout', errorMessage: 'Zeitüberschreitung (Timeout)' })
          }, 2500)
        }
      )

      return Promise.race([resolvePromise, timeoutPromise])
    }

    const results: DnsBenchmarkItem[] = []

    for (const r of resolvers) {
      const res = await resolveWithTimer(r.server, domain)
      results.push({
        id: r.id,
        name: r.name,
        server: r.server,
        latencyMs: res.latencyMs,
        status: res.status,
        errorMessage: res.errorMessage
      })
    }

    // Sort by latency: successful with lowest latency first, then errors/timeouts
    results.sort((a, b) => {
      if (a.status === 'success' && b.status !== 'success') return -1
      if (a.status !== 'success' && b.status === 'success') return 1
      if (a.status === 'success' && b.status === 'success') return a.latencyMs - b.latencyMs
      return 0
    })

    return results
  }

  /**
   * Fast native socket port scanner.
   */
  public async scanPorts(target: string = '127.0.0.1', ports: number[]): Promise<PortScanReport> {
    const startTime = performance.now()
    const cleanTarget = target.trim().replace(/^https?:\/\//, '').split('/')[0] || '127.0.0.1'

    const checkPort = (port: number, timeoutMs = 800): Promise<PortScanItem> => {
      return new Promise((resolve) => {
        const socket = new net.Socket()
        socket.setTimeout(timeoutMs)

        socket.on('connect', () => {
          socket.destroy()
          resolve({
            port,
            service: PORT_SERVICES[port] || 'Unbekannt',
            isOpen: true,
            status: 'open'
          })
        })

        socket.on('timeout', () => {
          socket.destroy()
          resolve({
            port,
            service: PORT_SERVICES[port] || 'Unbekannt',
            isOpen: false,
            status: 'timeout'
          })
        })

        socket.on('error', () => {
          socket.destroy()
          resolve({
            port,
            service: PORT_SERVICES[port] || 'Unbekannt',
            isOpen: false,
            status: 'closed'
          })
        })

        socket.connect(port, cleanTarget)
      })
    }

    // Limit to max 50 ports per scan for safety and responsiveness
    const safePorts = ports.slice(0, 50)
    const scanResults = await Promise.all(safePorts.map((p) => checkPort(p)))

    // Sort: open ports first, then by port number
    scanResults.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1
      if (!a.isOpen && b.isOpen) return 1
      return a.port - b.port
    })

    const durationMs = Math.round(performance.now() - startTime)
    const openCount = scanResults.filter((r) => r.isOpen).length

    return {
      target: cleanTarget,
      openCount,
      scannedCount: scanResults.length,
      durationMs,
      results: scanResults
    }
  }

  /**
   * Flushes Windows DNS client cache.
   */
  public async flushDns(): Promise<{ success: boolean; message: string }> {
    try {
      await powershellService.runPowerShell('Clear-DnsClientCache; ipconfig /flushdns', 8000)
      return {
        success: true,
        message: 'DNS-Auflösungscache wurde erfolgreich geleert (Flush DNS abgeschlossen).'
      }
    } catch (err: any) {
      console.error('Flush DNS failed:', err)
      return {
        success: false,
        message: `Fehler beim Leeren des DNS-Caches: ${err?.message || 'Unbekannt'}`
      }
    }
  }

  /**
   * Releases and renews IP configuration via ipconfig.
   */
  public async renewIp(): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync('ipconfig /renew', { timeout: 15000 })
      return {
        success: true,
        message: 'IP-Adresse und DHCP-Lease wurden erfolgreich beim Router erneuert.'
      }
    } catch (err: any) {
      console.error('Renew IP failed:', err)
      return {
        success: false,
        message: `Fehler beim Erneuern der IP-Adresse: ${err?.message || 'Unbekannt'}`
      }
    }
  }

  /**
   * Opens classic Windows Network Connections applet (ncpa.cpl).
   */
  public async openNetworkConnections(): Promise<void> {
    try {
      await execAsync('control.exe ncpa.cpl')
    } catch (err) {
      console.error('Failed to open ncpa.cpl:', err)
    }
  }
}

export const networkService = NetworkService.getInstance()


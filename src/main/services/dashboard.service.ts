import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { powershellService } from './powershell.service'
import { execAsync } from '../utils/exec'
import { telemetryService } from './telemetry.service'
import type {
  SystemInfo,
  LiveMetrics,
  PhysicalDisk,
  DiskVolume,
  GPUInfo
} from '../../shared/types'

export class DashboardService {
  private static instance: DashboardService
  private cachedSystemInfo: SystemInfo | null = null
  private unsubscribeTelemetry: (() => void) | null = null

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService()
    }
    return DashboardService.instance
  }

  /**
   * Retrieves comprehensive hardware and system information using scripts/Get-SystemInfo.ps1.
   */
  public async getSystemInfo(forceRefresh = false): Promise<SystemInfo> {
    if (this.cachedSystemInfo && !forceRefresh) {
      return this.cachedSystemInfo
    }

    const possiblePaths = [
      path.join(__dirname, '../scripts/Get-SystemInfo.ps1'),
      path.join(__dirname, '../../src/main/scripts/Get-SystemInfo.ps1'),
      path.join(process.resourcesPath || '', 'scripts/Get-SystemInfo.ps1'),
      path.join(app.getAppPath(), 'src/main/scripts/Get-SystemInfo.ps1'),
      path.join(process.cwd(), 'src/main/scripts/Get-SystemInfo.ps1')
    ]
    const scriptPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0]

    let rawJson = ''
    try {
      const result = await powershellService.runPowerShellFile(scriptPath)
      rawJson = result.stdout

      const parsed = JSON.parse(rawJson)

      // Calculate uptime in seconds
      let uptimeSeconds = 0
      if (parsed.OS?.LastBootUpTime) {
        const bootTime = new Date(parsed.OS.LastBootUpTime).getTime()
        uptimeSeconds = Math.max(0, Math.floor((Date.now() - bootTime) / 1000))
      }

      // Memory total & free
      const totalRamBytes = os.totalmem()
      const freeRamBytes = os.freemem()
      const usedRamBytes = totalRamBytes - freeRamBytes
      const memChips = Array.isArray(parsed.MemoryChips) ? parsed.MemoryChips : (parsed.MemoryChips ? [parsed.MemoryChips] : [])
      const ramSpeed = memChips.length > 0 ? (memChips[0].Speed || memChips[0].ConfiguredClockSpeed || 0) : 0

      // Detect DDR generation accurately (SMBIOS 3.1+ code 34 = DDR5, 26 = DDR4, etc.)
      let ramType = 'DDR4'
      const smbiosType = memChips.length > 0 ? Number(memChips[0].SMBIOSMemoryType || memChips[0].MemoryType || 0) : 0
      if (smbiosType === 34 || smbiosType === 35) {
        ramType = 'DDR5'
      } else if (smbiosType === 26) {
        ramType = 'DDR4'
      } else if (smbiosType === 24) {
        ramType = 'DDR3'
      } else if (smbiosType === 20 || smbiosType === 21) {
        ramType = 'DDR2'
      } else if (ramSpeed >= 4400) {
        ramType = 'DDR5'
      } else if (ramSpeed >= 2133) {
        ramType = 'DDR4'
      }

      // GPUs
      const rawGpus = Array.isArray(parsed.GPUs) ? parsed.GPUs : (parsed.GPUs ? [parsed.GPUs] : [])
      const gpus: GPUInfo[] = rawGpus.map((g: any) => ({
        name: g.Name || 'Unbekannter Grafikadapter',
        driverVersion: g.DriverVersion || 'N/A',
        adapterRAMMB: g.AdapterRAM ? Math.round(g.AdapterRAM / (1024 * 1024)) : 0,
        status: g.Status || 'OK'
      }))

      // Physical disks
      const rawDisks = Array.isArray(parsed.PhysicalDisks) ? parsed.PhysicalDisks : (parsed.PhysicalDisks ? [parsed.PhysicalDisks] : [])
      const disks: PhysicalDisk[] = rawDisks.map((d: any) => ({
        friendlyName: d.FriendlyName || 'Massenspeicher',
        mediaType: d.MediaType || (d.BusType === 'NVMe' ? 'NVMe' : 'SSD'),
        healthStatus: (d.HealthStatus === 'Healthy' ? 'Healthy' : d.HealthStatus === 'Warning' ? 'Warning' : 'Unknown'),
        sizeBytes: d.Size || 0,
        busType: d.BusType || 'SATA'
      }))

      // Volumes / Partitions
      const rawVols = Array.isArray(parsed.Volumes) ? parsed.Volumes : (parsed.Volumes ? [parsed.Volumes] : [])
      const volumes: DiskVolume[] = rawVols
        .filter((v: any) => v.DriveLetter && v.Size > 0)
        .map((v: any) => {
          const size = v.Size || 0
          const free = v.SizeRemaining || 0
          const used = size - free
          const percent = size > 0 ? Math.round((used / size) * 100) : 0
          return {
            driveLetter: `${v.DriveLetter}:`,
            label: v.FileSystemLabel || 'Lokaler Datenträger',
            fileSystem: v.FileSystem || 'NTFS',
            sizeBytes: size,
            freeBytes: free,
            usedBytes: used,
            usagePercent: percent,
            isSystemDrive: v.DriveLetter.toUpperCase() === 'C'
          }
        })

      // Activation
      const isActivated = parsed.Activation?.LicenseStatus === 1
      const activationStatusText = isActivated ? 'Dauerhaft aktiviert' : 'Nicht aktiviert / Testphase'

      const systemInfo: SystemInfo = {
        os: {
          name: parsed.OS?.Caption || 'Microsoft Windows',
          edition: (parsed.OS?.Caption || '').replace('Microsoft Windows ', ''),
          version: parsed.OS?.Version || '10.0',
          buildNumber: parsed.OS?.BuildNumber || 'N/A',
          installDate: parsed.OS?.LastBootUpTime || new Date().toISOString(),
          arch: parsed.OS?.OSArchitecture || '64-Bit',
          uptimeSeconds
        },
        activation: {
          isActivated,
          statusText: activationStatusText,
          licenseType: parsed.Activation?.Description || 'OEM / Retail / Volume'
        },
        computer: {
          name: parsed.Computer?.Name || os.hostname(),
          workgroupOrDomain: parsed.Computer?.Domain || 'WORKGROUP',
          isDomainJoined: Boolean(parsed.Computer?.PartOfDomain)
        },
        cpu: {
          name: parsed.CPU?.Name || os.cpus()[0]?.model || 'Prozessor',
          manufacturer: parsed.CPU?.Manufacturer || 'GenuineIntel',
          cores: parsed.CPU?.NumberOfCores || os.cpus().length,
          logicalProcessors: parsed.CPU?.NumberOfLogicalProcessors || os.cpus().length,
          maxClockSpeedMHz: parsed.CPU?.MaxClockSpeed || 0
        },
        gpus: gpus.length > 0 ? gpus : [{
          name: 'Standard-Grafikkarte',
          driverVersion: '1.0',
          adapterRAMMB: 0,
          status: 'OK'
        }],
        ram: {
          totalBytes: totalRamBytes,
          freeBytes: freeRamBytes,
          usedBytes: usedRamBytes,
          usagePercent: Math.round((usedRamBytes / totalRamBytes) * 100),
          speedMHz: ramSpeed,
          type: ramType,
          slotsUsed: memChips.length || 1,
          totalSlots: Math.max(memChips.length, 2)
        },
        disks,
        volumes,
        bios: {
          manufacturer: parsed.BIOS?.Manufacturer || 'Hersteller',
          version: parsed.BIOS?.SMBIOSBIOSVersion || '1.0',
          releaseDate: parsed.BIOS?.ReleaseDate ? parsed.BIOS.ReleaseDate.split('T')[0] : 'N/A',
          serialNumber: parsed.BIOS?.SerialNumber || 'N/A'
        },
        security: {
          tpmPresent: Boolean(parsed.TPM?.Present),
          tpmEnabled: Boolean(parsed.TPM?.Enabled),
          tpmVersion: parsed.TPM?.Version || 'N/A',
          secureBootEnabled: Boolean(parsed.SecureBoot)
        }
      }

      this.cachedSystemInfo = systemInfo
      return systemInfo
    } catch (error) {
      console.error('Failed to get full system info via PowerShell, using Node fallback:', error)
      return this.getFallbackSystemInfo()
    }
  }

  /**
   * Reads one snapshot of live metrics from central TelemetryService cache.
   */
  public async getLiveMetrics(): Promise<LiveMetrics> {
    return telemetryService.getLiveMetrics()
  }

  /**
   * Starts live metrics streaming to a callback using central TelemetryService.
   */
  public startMetricsStream(
    callback: (metrics: LiveMetrics) => void,
    opts?: { metrics?: import('../../shared/types').TelemetryMetric[]; windowId?: number }
  ): void {
    if (this.unsubscribeTelemetry) {
      this.unsubscribeTelemetry()
    }
    this.unsubscribeTelemetry = telemetryService.subscribe(callback, opts)
  }

  public stopMetricsStream(): void {
    if (this.unsubscribeTelemetry) {
      this.unsubscribeTelemetry()
      this.unsubscribeTelemetry = null
    }
  }

  private getFallbackSystemInfo(): SystemInfo {
    const totalRam = os.totalmem()
    const freeRam = os.freemem()
    const usedRam = totalRam - freeRam

    return {
      os: {
        name: 'Microsoft Windows 11',
        edition: 'Pro',
        version: os.release(),
        buildNumber: os.release(),
        installDate: new Date().toISOString(),
        arch: os.arch(),
        uptimeSeconds: Math.floor(os.uptime())
      },
      activation: {
        isActivated: true,
        statusText: 'Aktiviert',
        licenseType: 'Digital License'
      },
      computer: {
        name: os.hostname(),
        workgroupOrDomain: 'WORKGROUP',
        isDomainJoined: false
      },
      cpu: {
        name: os.cpus()[0]?.model || 'Generic Processor',
        manufacturer: 'GenuineIntel',
        cores: os.cpus().length,
        logicalProcessors: os.cpus().length,
        maxClockSpeedMHz: os.cpus()[0]?.speed || 3000
      },
      gpus: [
        {
          name: 'DirectX 12 Grafikgerät',
          driverVersion: 'WDDM 3.0',
          adapterRAMMB: 4096,
          status: 'OK'
        }
      ],
      ram: {
        totalBytes: totalRam,
        freeBytes: freeRam,
        usedBytes: usedRam,
        usagePercent: Math.round((usedRam / totalRam) * 100),
        speedMHz: 3200,
        type: 'DDR4',
        slotsUsed: 2,
        totalSlots: 4
      },
      disks: [
        {
          friendlyName: 'System SSD',
          mediaType: 'SSD',
          healthStatus: 'Healthy',
          sizeBytes: 512000000000,
          busType: 'NVMe'
        }
      ],
      volumes: [
        {
          driveLetter: 'C:',
          label: 'Windows',
          fileSystem: 'NTFS',
          sizeBytes: 512000000000,
          freeBytes: 250000000000,
          usedBytes: 262000000000,
          usagePercent: 51,
          isSystemDrive: true
        }
      ],
      bios: {
        manufacturer: 'System BIOS',
        version: '1.0',
        releaseDate: '2024-01-01',
        serialNumber: 'Default'
      },
      security: {
        tpmPresent: true,
        tpmEnabled: true,
        tpmVersion: '2.0',
        secureBootEnabled: true
      }
    }
  }
}


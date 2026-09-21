import React from 'react'
import {
  Cpu,
  Activity,
  HardDrive,
  Shield,
  RefreshCw,
  Clock,
  Laptop,
  AlertTriangle,
  Layers,
  Zap,
  Radio
} from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { Card } from '../components/ui/Card'
import { LiveMetricCard } from '../components/ui/LiveMetricCard'
import { InfoItem } from '../components/ui/InfoItem'
import { DiskBar } from '../components/ui/DiskBar'
import { StatusBadge, StatusType } from '../components/ui/StatusBadge'

export const DashboardPage: React.FC = () => {
  const { systemInfo, liveMetrics, isLoading, error, refresh } = useDashboard()

  const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor((seconds % (3600 * 24)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const getMetricStatus = (percent: number): StatusType => {
    if (percent >= 90) return 'red'
    if (percent >= 70) return 'yellow'
    return 'green'
  }

  const cpuPercent = liveMetrics?.cpuUsagePercent ?? 0
  const ramPercent = liveMetrics?.ramUsagePercent ?? systemInfo?.ram.usagePercent ?? 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-2.5rem)] pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            System Dashboard
          </h1>
          <p className="text-xs text-fluent-muted mt-1">
            Echtzeit-Hardware-Telemetrie und Windows-Systemdiagnose
          </p>
        </div>

        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-fluent bg-fluent-card border border-fluent-border hover:border-fluent-accent/50 text-xs font-medium text-slate-200 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-fluent-accent' : ''}`} />
          <span>Neu laden</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-fluent bg-fluent-status-red-bg border border-fluent-status-red-border text-fluent-status-red text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Live Telemetry Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiveMetricCard
          title="CPU Auslastung"
          value={`${cpuPercent}%`}
          subValue={systemInfo ? `${systemInfo.cpu.logicalProcessors} Threads` : undefined}
          percentage={cpuPercent}
          icon={<Cpu className="w-5 h-5" />}
          status={getMetricStatus(cpuPercent)}
          statusText={cpuPercent >= 90 ? 'Hoch' : cpuPercent >= 70 ? 'Mittel' : 'Normal'}
          secondaryInfo={[
            {
              label: 'Kerne',
              value: systemInfo ? `${systemInfo.cpu.cores}C / ${systemInfo.cpu.logicalProcessors}T` : '-'
            },
            {
              label: 'Basistakt',
              value: systemInfo ? `${(systemInfo.cpu.maxClockSpeedMHz / 1000).toFixed(2)} GHz` : '-'
            }
          ]}
        />

        <LiveMetricCard
          title="RAM Auslastung"
          value={`${ramPercent}%`}
          subValue={
            liveMetrics
              ? `${liveMetrics.ramUsedGB} / ${liveMetrics.ramTotalGB} GB`
              : systemInfo
              ? `${Math.round(systemInfo.ram.usedBytes / 1073741824)} / ${Math.round(systemInfo.ram.totalBytes / 1073741824)} GB`
              : undefined
          }
          percentage={ramPercent}
          icon={<Activity className="w-5 h-5" />}
          status={getMetricStatus(ramPercent)}
          statusText={ramPercent >= 90 ? 'Kritisch' : ramPercent >= 75 ? 'Belastet' : 'Optimal'}
          secondaryInfo={[
            {
              label: 'Geschwindigkeit',
              value: systemInfo?.ram.speedMHz ? `${systemInfo.ram.speedMHz} MHz` : 'Standard'
            },
            {
              label: 'Steckplätze',
              value: systemInfo ? `${systemInfo.ram.slotsUsed} von ${systemInfo.ram.totalSlots}` : '-'
            }
          ]}
        />

        <LiveMetricCard
          title="Netzwerk Live"
          value={
            liveMetrics
              ? `${liveMetrics.networkReceiveKBps > 1024 ? (liveMetrics.networkReceiveKBps / 1024).toFixed(1) + ' MB/s' : liveMetrics.networkReceiveKBps + ' KB/s'}`
              : '0 KB/s'
          }
          subValue="Eingehend"
          icon={<Radio className="w-5 h-5" />}
          status="green"
          statusText="Aktiv"
          secondaryInfo={[
            {
              label: 'Download',
              value: liveMetrics
                ? liveMetrics.networkReceiveKBps > 1024
                  ? `${(liveMetrics.networkReceiveKBps / 1024).toFixed(2)} MB/s`
                  : `${liveMetrics.networkReceiveKBps} KB/s`
                : '0 KB/s'
            },
            {
              label: 'Upload',
              value: liveMetrics
                ? liveMetrics.networkSendKBps > 1024
                  ? `${(liveMetrics.networkSendKBps / 1024).toFixed(2)} MB/s`
                  : `${liveMetrics.networkSendKBps} KB/s`
                : '0 KB/s'
            }
          ]}
        />
      </div>

      {/* 2. System & Sicherheit (Windows-Version, Aktivierung, Computername, TPM, Secure Boot) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Windows & Systemidentität"
          subtitle="Betriebssystem und Lizenzstatus"
          icon={<Laptop className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <InfoItem
              label="Windows Edition"
              value={systemInfo?.os.name || 'Wird ermittelt...'}
              badge={
                <StatusBadge
                  status={systemInfo?.activation.isActivated ? 'green' : 'red'}
                  text={systemInfo?.activation.isActivated ? 'Aktiviert' : 'Nicht aktiviert'}
                />
              }
            />
            <InfoItem
              label="Build-Nummer"
              value={systemInfo ? `${systemInfo.os.version} (Build ${systemInfo.os.buildNumber})` : '-'}
              subValue={systemInfo?.os.arch}
            />
            <InfoItem
              label="Computername"
              value={systemInfo?.computer.name || '-'}
              subValue={
                systemInfo?.computer.isDomainJoined
                  ? `Domäne: ${systemInfo.computer.workgroupOrDomain}`
                  : `Arbeitsgruppe: ${systemInfo?.computer.workgroupOrDomain}`
              }
            />
            <InfoItem
              label="System-Laufzeit (Uptime)"
              value={systemInfo ? formatUptime(systemInfo.os.uptimeSeconds) : '-'}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <InfoItem
              label="Lizenzkanal"
              value={systemInfo?.activation.licenseType || 'Standard'}
            />
          </div>
        </Card>

        <Card
          title="Sicherheit & Hardware-Integrität"
          subtitle="Hardware-Sicherheitsmodule und Boot-Status"
          icon={<Shield className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <InfoItem
              label="TPM (Trusted Platform Module)"
              value={
                systemInfo?.security.tpmPresent
                  ? `Version ${systemInfo.security.tpmVersion}`
                  : 'Nicht erkannt / Deaktiviert'
              }
              badge={
                <StatusBadge
                  status={
                    systemInfo?.security.tpmPresent && systemInfo.security.tpmEnabled
                      ? 'green'
                      : 'red'
                  }
                  text={
                    systemInfo?.security.tpmPresent && systemInfo.security.tpmEnabled
                      ? 'Aktiviert & Bereit'
                      : 'Deaktiviert'
                  }
                />
              }
            />

            <InfoItem
              label="Secure Boot (Sicherer Start)"
              value={systemInfo?.security.secureBootEnabled ? 'UEFI geschützt' : 'Deaktiviert oder Legacy'}
              badge={
                <StatusBadge
                  status={systemInfo?.security.secureBootEnabled ? 'green' : 'red'}
                  text={systemInfo?.security.secureBootEnabled ? 'Aktiviert' : 'Deaktiviert'}
                />
              }
            />

            <InfoItem
              label="BIOS Hersteller"
              value={systemInfo?.bios.manufacturer || '-'}
            />

            <InfoItem
              label="BIOS Version"
              value={systemInfo?.bios.version || '-'}
              subValue={systemInfo?.bios.releaseDate ? `Datum: ${systemInfo.bios.releaseDate}` : undefined}
            />

            <InfoItem
              label="Seriennummer"
              value={systemInfo?.bios.serialNumber || '-'}
            />
          </div>
        </Card>
      </div>

      {/* 3. Hardware Details (CPU, GPU, RAM) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <Card
          title="Prozessor"
          subtitle="CPU Spezifikationen"
          icon={<Cpu className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
              <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                Modell
              </span>
              <span className="text-xs font-bold text-slate-100 mt-1 block">
                {systemInfo?.cpu.name || 'Wird ermittelt...'}
              </span>
            </div>
            <InfoItem
              label="Physische Kerne"
              value={systemInfo?.cpu.cores ?? '-'}
            />
            <InfoItem
              label="Logische Prozessoren"
              value={systemInfo?.cpu.logicalProcessors ?? '-'}
            />
            <InfoItem
              label="Max. Taktfrequenz"
              value={systemInfo ? `${systemInfo.cpu.maxClockSpeedMHz} MHz` : '-'}
            />
          </div>
        </Card>

        {/* GPU */}
        <Card
          title="Grafikkarte"
          subtitle="GPU & Treiber"
          icon={<Zap className="w-4 h-4" />}
        >
          <div className="space-y-2">
            {systemInfo?.gpus && systemInfo.gpus.length > 0 ? (
              systemInfo.gpus.map((gpu, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
                    <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                      Grafikadapter {systemInfo.gpus.length > 1 ? `#${idx + 1}` : ''}
                    </span>
                    <span className="text-xs font-bold text-slate-100 mt-1 block">
                      {gpu.name}
                    </span>
                  </div>
                  <InfoItem
                    label="Treiberversion"
                    value={gpu.driverVersion}
                  />
                  <InfoItem
                    label="Dedizierter VRAM"
                    value={gpu.adapterRAMMB > 0 ? `${gpu.adapterRAMMB} MB` : 'Gemeinsam genutzt'}
                  />
                  <InfoItem
                    label="Hardwarestatus"
                    value={gpu.status}
                    badge={<StatusBadge status="green" text="Funktionsfähig" />}
                  />
                </div>
              ))
            ) : (
              <div className="text-xs text-fluent-muted py-4 text-center">
                Keine dedizierte Grafikkarte ermittelt
              </div>
            )}
          </div>
        </Card>

        {/* RAM */}
        <Card
          title="Arbeitsspeicher"
          subtitle="RAM Konfiguration"
          icon={<Layers className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
              <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                Gesamtkapazität
              </span>
              <span className="text-base font-bold text-slate-100 mt-0.5 block font-mono">
                {systemInfo ? `${(systemInfo.ram.totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB RAM` : '-'}
              </span>
            </div>
            <InfoItem
              label="Speichertyp"
              value={systemInfo?.ram.type || 'DDR4'}
            />
            <InfoItem
              label="Taktfrequenz"
              value={systemInfo?.ram.speedMHz ? `${systemInfo.ram.speedMHz} MHz` : 'Standard'}
            />
            <InfoItem
              label="Belegte Riegel"
              value={systemInfo ? `${systemInfo.ram.slotsUsed} / ${systemInfo.ram.totalSlots} Slots` : '-'}
            />
          </div>
        </Card>
      </div>

      {/* 4. Massenspeicher & Laufwerke */}
      <Card
        title="Massenspeicher & Partitionen"
        subtitle="Erkannte physische Datenträger und Windows-Volumes"
        icon={<HardDrive className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {/* Physical Disks summary */}
          {systemInfo?.disks && systemInfo.disks.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-fluent-muted uppercase tracking-wider block mb-2">
                Physische Laufwerke
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {systemInfo.disks.map((disk, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-fluent bg-fluent-sidebar/40 border border-fluent-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-fluent-card border border-fluent-border text-fluent-accent">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block truncate max-w-[220px]">
                          {disk.friendlyName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-fluent-subtext mt-0.5">
                          <span>{disk.mediaType}</span>
                          <span>•</span>
                          <span>{disk.busType}</span>
                          <span>•</span>
                          <span>{disk.sizeBytes > 0 ? (disk.sizeBytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      status={disk.healthStatus === 'Healthy' ? 'green' : 'yellow'}
                      text={disk.healthStatus === 'Healthy' ? 'Gut' : disk.healthStatus}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volumes */}
          <div>
            <span className="text-xs font-semibold text-fluent-muted uppercase tracking-wider block mb-2">
              Partitionen & Speicherplatz
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemInfo?.volumes && systemInfo.volumes.length > 0 ? (
                systemInfo.volumes.map((vol) => (
                  <DiskBar key={vol.driveLetter} volume={vol} />
                ))
              ) : (
                <div className="text-xs text-fluent-muted p-4 text-center">
                  Lade Laufwerksinformationen...
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

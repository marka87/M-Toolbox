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
import { useTranslation } from '../i18n/LanguageContext'

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const { systemInfo, liveMetrics, showGpuUsage, isLoading, error, refresh } = useDashboard()

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
  const gpuPercent = liveMetrics?.gpuUsagePercent ?? 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-2.5rem)] pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {t.dashboard.title}
          </h1>
          <p className="text-xs text-fluent-muted mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>

        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-fluent bg-fluent-card border border-fluent-border hover:border-fluent-accent/50 text-xs font-medium text-slate-200 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-fluent-accent' : ''}`} />
          <span>{t.dashboard.refresh}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-fluent bg-fluent-status-red-bg border border-fluent-status-red-border text-fluent-status-red text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Live Telemetry Metric Cards */}
      <div className={`grid grid-cols-1 ${showGpuUsage ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <LiveMetricCard
          title={t.dashboard.cpuUsage}
          value={`${cpuPercent}%`}
          subValue={systemInfo ? t.dashboard.threads.replace('{count}', String(systemInfo.cpu.logicalProcessors)) : undefined}
          percentage={cpuPercent}
          icon={<Cpu className="w-5 h-5" />}
          status={getMetricStatus(cpuPercent)}
          statusText={cpuPercent >= 90 ? t.dashboard.statusHigh : cpuPercent >= 70 ? t.dashboard.statusMedium : t.dashboard.statusNormal}
          secondaryInfo={[
            {
              label: t.dashboard.cores,
              value: systemInfo ? t.dashboard.coresFormat.replace('{cores}', String(systemInfo.cpu.cores)).replace('{threads}', String(systemInfo.cpu.logicalProcessors)) : '-'
            },
            {
              label: t.dashboard.baseClock,
              value: systemInfo ? `${(systemInfo.cpu.maxClockSpeedMHz / 1000).toFixed(2)} GHz` : '-'
            }
          ]}
        />

        <LiveMetricCard
          title={t.dashboard.ramUsage}
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
          statusText={ramPercent >= 90 ? t.dashboard.statusCritical : ramPercent >= 75 ? t.dashboard.statusLoaded : t.dashboard.statusOptimal}
          secondaryInfo={[
            {
              label: t.dashboard.speed,
              value: systemInfo?.ram.speedMHz ? `${systemInfo.ram.speedMHz} MHz` : t.dashboard.defaultVal
            },
            {
              label: t.dashboard.slots,
              value: systemInfo ? t.dashboard.slotsFormat.replace('{used}', String(systemInfo.ram.slotsUsed)).replace('{total}', String(systemInfo.ram.totalSlots)) : '-'
            }
          ]}
        />

        {showGpuUsage && (
          <LiveMetricCard
            title={t.dashboard.gpuUsage}
            value={`${gpuPercent}%`}
            subValue={systemInfo?.gpus?.[0]?.name ? systemInfo.gpus[0].name.slice(0, 24) : undefined}
            percentage={gpuPercent}
            icon={<Zap className="w-5 h-5" />}
            status={getMetricStatus(gpuPercent)}
            statusText={gpuPercent >= 90 ? t.dashboard.statusHigh : gpuPercent >= 70 ? t.dashboard.statusMedium : t.dashboard.statusNormal}
            secondaryInfo={
              systemInfo?.gpus?.[0]
                ? [
                    {
                      label: t.dashboard.driver,
                      value: systemInfo.gpus[0].driverVersion || '-'
                    },
                    {
                      label: t.dashboard.vram,
                      value:
                        systemInfo.gpus[0].adapterRAMMB > 0
                          ? `${systemInfo.gpus[0].adapterRAMMB} MB`
                          : t.dashboard.sharedVram
                    }
                  ]
                : undefined
            }
          />
        )}

        <LiveMetricCard
          title={t.dashboard.networkLive}
          value={
            liveMetrics
              ? `${liveMetrics.networkReceiveKBps > 1024 ? (liveMetrics.networkReceiveKBps / 1024).toFixed(1) + ' MB/s' : liveMetrics.networkReceiveKBps + ' KB/s'}`
              : '0 KB/s'
          }
          subValue={t.dashboard.incoming}
          icon={<Radio className="w-5 h-5" />}
          status="green"
          statusText={t.dashboard.statusActive}
          secondaryInfo={[
            {
              label: t.dashboard.download,
              value: liveMetrics
                ? liveMetrics.networkReceiveKBps > 1024
                  ? `${(liveMetrics.networkReceiveKBps / 1024).toFixed(2)} MB/s`
                  : `${liveMetrics.networkReceiveKBps} KB/s`
                : '0 KB/s'
            },
            {
              label: t.dashboard.upload,
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
          title={t.dashboard.winIdentityTitle}
          subtitle={t.dashboard.winIdentitySubtitle}
          icon={<Laptop className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <InfoItem
              label={t.dashboard.winEdition}
              value={systemInfo?.os.name || t.dashboard.loading}
              badge={
                <StatusBadge
                  status={systemInfo?.activation.isActivated ? 'green' : 'red'}
                  text={systemInfo?.activation.isActivated ? t.dashboard.activated : t.dashboard.notActivated}
                />
              }
            />
            <InfoItem
              label={t.dashboard.buildNumber}
              value={systemInfo ? `${systemInfo.os.version} (Build ${systemInfo.os.buildNumber})` : '-'}
              subValue={systemInfo?.os.arch}
            />
            <InfoItem
              label={t.dashboard.computerName}
              value={systemInfo?.computer.name || '-'}
              subValue={
                systemInfo?.computer.isDomainJoined
                  ? t.dashboard.domainPrefix.replace('{name}', systemInfo.computer.workgroupOrDomain)
                  : t.dashboard.workgroupPrefix.replace('{name}', systemInfo?.computer.workgroupOrDomain || '')
              }
            />
            <InfoItem
              label={t.dashboard.systemUptime}
              value={systemInfo ? formatUptime(systemInfo.os.uptimeSeconds) : '-'}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <InfoItem
              label={t.dashboard.licenseChannel}
              value={systemInfo?.activation.licenseType || t.dashboard.defaultVal}
            />
          </div>
        </Card>

        <Card
          title={t.dashboard.securityTitle}
          subtitle={t.dashboard.securitySubtitle}
          icon={<Shield className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <InfoItem
              label={t.dashboard.tpm}
              value={
                systemInfo?.security.tpmPresent
                  ? t.dashboard.tpmVersion.replace('{version}', systemInfo.security.tpmVersion)
                  : t.dashboard.tpmNotDetected
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
                      ? t.dashboard.tpmActiveReady
                      : t.dashboard.tpmDisabled
                  }
                />
              }
            />

            <InfoItem
              label={t.dashboard.secureBoot}
              value={systemInfo?.security.secureBootEnabled ? t.dashboard.secureBootProtected : t.dashboard.secureBootDisabled}
              badge={
                <StatusBadge
                  status={systemInfo?.security.secureBootEnabled ? 'green' : 'red'}
                  text={systemInfo?.security.secureBootEnabled ? t.dashboard.activated : t.dashboard.tpmDisabled}
                />
              }
            />

            <InfoItem
              label={t.dashboard.biosManufacturer}
              value={systemInfo?.bios.manufacturer || '-'}
            />

            <InfoItem
              label={t.dashboard.biosVersion}
              value={systemInfo?.bios.version || '-'}
              subValue={systemInfo?.bios.releaseDate ? t.dashboard.biosDate.replace('{date}', systemInfo.bios.releaseDate) : undefined}
            />

            <InfoItem
              label={t.dashboard.serialNumber}
              value={systemInfo?.bios.serialNumber || '-'}
            />
          </div>
        </Card>
      </div>

      {/* 3. Hardware Details (CPU, GPU, RAM) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <Card
          title={t.dashboard.processorTitle}
          subtitle={t.dashboard.processorSubtitle}
          icon={<Cpu className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
              <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                {t.dashboard.model}
              </span>
              <span className="text-xs font-bold text-slate-100 mt-1 block">
                {systemInfo?.cpu.name || t.dashboard.loading}
              </span>
            </div>
            <InfoItem
              label={t.dashboard.physicalCores}
              value={systemInfo?.cpu.cores ?? '-'}
            />
            <InfoItem
              label={t.dashboard.logicalProcessors}
              value={systemInfo?.cpu.logicalProcessors ?? '-'}
            />
            <InfoItem
              label={t.dashboard.maxClockSpeed}
              value={systemInfo ? `${systemInfo.cpu.maxClockSpeedMHz} MHz` : '-'}
            />
          </div>
        </Card>

        {/* GPU */}
        <Card
          title={t.dashboard.graphicsTitle}
          subtitle={t.dashboard.graphicsSubtitle}
          icon={<Zap className="w-4 h-4" />}
        >
          <div className="space-y-2">
            {systemInfo?.gpus && systemInfo.gpus.length > 0 ? (
              systemInfo.gpus.map((gpu, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
                    <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                      {t.dashboard.graphicsAdapter} {systemInfo.gpus.length > 1 ? `#${idx + 1}` : ''}
                    </span>
                    <span className="text-xs font-bold text-slate-100 mt-1 block">
                      {gpu.name}
                    </span>
                  </div>
                  <InfoItem
                    label={t.dashboard.driverVersion}
                    value={gpu.driverVersion}
                  />
                  <InfoItem
                    label={t.dashboard.dedicatedVram}
                    value={gpu.adapterRAMMB > 0 ? `${gpu.adapterRAMMB} MB` : t.dashboard.sharedVramDesc}
                  />
                  <InfoItem
                    label={t.dashboard.hardwareStatus}
                    value={gpu.status}
                    badge={<StatusBadge status="green" text={t.dashboard.functional} />}
                  />
                </div>
              ))
            ) : (
              <div className="text-xs text-fluent-muted py-4 text-center">
                {t.dashboard.noDedicatedGpu}
              </div>
            )}
          </div>
        </Card>

        {/* RAM */}
        <Card
          title={t.dashboard.memoryTitle}
          subtitle={t.dashboard.memorySubtitle}
          icon={<Layers className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <div className="p-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border">
              <span className="text-[11px] text-fluent-subtext block uppercase font-semibold tracking-wider">
                {t.dashboard.totalCapacity}
              </span>
              <span className="text-base font-bold text-slate-100 mt-0.5 block font-mono">
                {systemInfo ? `${(systemInfo.ram.totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB RAM` : '-'}
              </span>
            </div>
            <InfoItem
              label={t.dashboard.memoryType}
              value={systemInfo?.ram.type || 'RAM'}
            />
            <InfoItem
              label={t.dashboard.clockSpeed}
              value={systemInfo?.ram.speedMHz ? `${systemInfo.ram.speedMHz} MHz` : t.dashboard.defaultVal}
            />
            <InfoItem
              label={t.dashboard.usedSlots}
              value={systemInfo ? t.dashboard.slotsFormatShort.replace('{used}', String(systemInfo.ram.slotsUsed)).replace('{total}', String(systemInfo.ram.totalSlots)) : '-'}
            />
          </div>
        </Card>
      </div>

      {/* 4. Massenspeicher & Laufwerke */}
      <Card
        title={t.dashboard.storageTitle}
        subtitle={t.dashboard.storageSubtitle}
        icon={<HardDrive className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {/* Physical Disks summary */}
          {systemInfo?.disks && systemInfo.disks.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-fluent-muted uppercase tracking-wider block mb-2">
                {t.dashboard.physicalDrives}
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
                      text={disk.healthStatus === 'Healthy' ? t.dashboard.healthHealthy : disk.healthStatus}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volumes */}
          <div>
            <span className="text-xs font-semibold text-fluent-muted uppercase tracking-wider block mb-2">
              {t.dashboard.partitionsStorage}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemInfo?.volumes && systemInfo.volumes.length > 0 ? (
                systemInfo.volumes.map((vol) => (
                  <DiskBar key={vol.driveLetter} volume={vol} />
                ))
              ) : (
                <div className="text-xs text-fluent-muted p-4 text-center">
                  {t.dashboard.loadingDisks}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

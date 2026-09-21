import React from 'react'
import {
  Monitor,
  Wifi,
  Volume2,
  Keyboard,
  HardDrive,
  Usb,
  Cpu,
  Layers,
  AlertTriangle,
  RotateCcw,
  Download,
  Info,
  CheckCircle2,
  XCircle,
  Globe
} from 'lucide-react'
import type { DeviceItem, DriverCategory } from '@shared/types'

export type DriverViewMode = 'normal' | 'compact'

interface DeviceCardProps {
  device: DeviceItem
  viewMode?: DriverViewMode
  onShowDetails: (device: DeviceItem) => void
  onExport: (infName: string) => void
  onRestart: (instanceId: string) => void
  onSearchOnline?: (query: string) => void
  isExporting?: boolean
}

function getCategoryIcon(category: DriverCategory) {
  switch (category) {
    case 'display':
      return <Monitor className="w-5 h-5 text-sky-400" />
    case 'net':
      return <Wifi className="w-5 h-5 text-emerald-400" />
    case 'media':
      return <Volume2 className="w-5 h-5 text-indigo-400" />
    case 'input':
      return <Keyboard className="w-5 h-5 text-amber-400" />
    case 'storage':
      return <HardDrive className="w-5 h-5 text-purple-400" />
    case 'usb':
      return <Usb className="w-5 h-5 text-cyan-400" />
    case 'system':
      return <Cpu className="w-5 h-5 text-blue-400" />
    default:
      return <Layers className="w-5 h-5 text-fluent-muted" />
  }
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  viewMode = 'normal',
  onShowDetails,
  onExport,
  onRestart,
  onSearchOnline,
  isExporting
}) => {
  const isProblem = device.status === 'Problem' || Boolean(device.problemCode)
  const isDisabled = device.status === 'Disabled'

  if (viewMode === 'compact') {
    return (
      <div
        className={`group relative flex items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl border transition-all duration-200 bg-fluent-card/70 hover:bg-fluent-card hover:border-fluent-border-hover backdrop-blur-sm ${
          isProblem
            ? 'border-red-500/40 bg-red-950/10'
            : isDisabled
            ? 'border-amber-500/40 bg-amber-950/10'
            : 'border-fluent-border'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-fluent-card-subtle/80 border border-fluent-border/60 shrink-0">
            {getCategoryIcon(device.category)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4
                className="text-xs font-semibold text-fluent-text truncate group-hover:text-fluent-accent transition-colors"
                title={device.deviceDescription}
              >
                {device.deviceDescription}
              </h4>
              {device.isThirdParty && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30 shrink-0">
                  OEM
                </span>
              )}
            </div>
            <p className="text-[11px] text-fluent-muted truncate mt-0.5" title={device.manufacturerName}>
              {device.manufacturerName} • <span className="font-mono text-[10px]">{device.driverName || 'Kein Treiber'}</span> (v{device.driverVersion || 'Standard'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Status Badge */}
          {isProblem ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Problem
            </span>
          ) : isDisabled ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <XCircle className="w-3 h-3 text-amber-400" />
              Inaktiv
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Aktiv
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onShowDetails(device)}
              className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover transition-colors"
              title="Details anzeigen"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {device.driverName && device.driverName.toLowerCase().includes('.inf') && (
              <button
                onClick={() => onExport(device.driverName)}
                disabled={isExporting}
                className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-accent hover:bg-fluent-card-hover transition-colors disabled:opacity-50"
                title="Treiber sichern (.inf)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {onSearchOnline && (
              <button
                onClick={() =>
                  onSearchOnline(
                    device.deviceDescription || device.driverName || device.instanceId
                  )
                }
                className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-accent hover:bg-fluent-card-hover transition-colors"
                title="Online nach Treiber suchen"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onRestart(device.instanceId)}
              className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-accent hover:bg-fluent-card-hover transition-colors"
              title="Gerät neu starten"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 bg-fluent-card/70 hover:bg-fluent-card hover:border-fluent-border-hover backdrop-blur-sm ${
        isProblem
          ? 'border-red-500/40 bg-red-950/10'
          : isDisabled
          ? 'border-amber-500/40 bg-amber-950/10'
          : 'border-fluent-border'
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-fluent-card-subtle/80 border border-fluent-border/60 shrink-0">
              {getCategoryIcon(device.category)}
            </div>
            <div className="min-w-0">
              <h4
                className="text-sm font-semibold text-fluent-text truncate group-hover:text-fluent-accent transition-colors"
                title={device.deviceDescription}
              >
                {device.deviceDescription}
              </h4>
              <p className="text-xs text-fluent-muted truncate" title={device.manufacturerName}>
                {device.manufacturerName}
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isProblem ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Problem {device.problemCode ? `(Code ${device.problemCode})` : ''}
              </span>
            ) : isDisabled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <XCircle className="w-3 h-3 text-amber-400" />
                Deaktiviert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Aktiv
              </span>
            )}

            {device.isThirdParty && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-fluent-accent/15 text-fluent-accent border border-fluent-accent/30">
                OEM
              </span>
            )}
          </div>
        </div>

        {/* Problem warning box if problem exists */}
        {isProblem && device.problemDescription && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-[11px] text-red-200">
            {device.problemDescription}
          </div>
        )}

        {/* Driver Details Snippet */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-fluent-card-subtle/50 border border-fluent-border/40 mb-3">
          <div className="truncate">
            <span className="text-fluent-muted text-[11px] block">Treiber:</span>
            <span className="text-fluent-text font-medium truncate block" title={device.driverName}>
              {device.driverName || 'Kein Treiber'}
            </span>
          </div>
          <div className="truncate">
            <span className="text-fluent-muted text-[11px] block">Version:</span>
            <span className="text-fluent-text font-medium truncate block" title={device.driverVersion || 'N/A'}>
              {device.driverVersion || 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-fluent-border/40 mt-1">
        <button
          onClick={() => onShowDetails(device)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-fluent-text hover:bg-fluent-card-hover transition-colors"
          title="Vollständige Treiber- und Geräte-Details anzeigen"
        >
          <Info className="w-3.5 h-3.5 text-fluent-muted" />
          Details
        </button>

        <div className="flex items-center gap-1.5">
          {device.driverName && device.driverName.toLowerCase().includes('.inf') && (
            <button
              onClick={() => onExport(device.driverName)}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-fluent-card-subtle text-fluent-text hover:bg-fluent-accent hover:text-white transition-all disabled:opacity-50"
              title="Diesen Treiber separat exportieren"
            >
              <Download className="w-3.5 h-3.5" />
              Sichern
            </button>
          )}

          {onSearchOnline && (
            <button
              onClick={() =>
                onSearchOnline(
                  device.deviceDescription || device.driverName || device.instanceId
                )
              }
              className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-accent hover:bg-fluent-card-hover transition-colors"
              title="Online im Microsoft Update-Katalog nach zertifizierten Treibern suchen"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onRestart(device.instanceId)}
            className="p-1.5 rounded-lg text-fluent-muted hover:text-fluent-accent hover:bg-fluent-card-hover transition-colors"
            title="Gerät neu starten"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}


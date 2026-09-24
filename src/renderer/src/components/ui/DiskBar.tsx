import React from 'react'
import { HardDrive } from 'lucide-react'
import { StatusBadge, StatusType } from './StatusBadge'
import type { DiskVolume } from '@shared/types'
import { formatBytes } from '@shared/utils/format'

interface DiskBarProps {
  volume: DiskVolume
}

export const DiskBar: React.FC<DiskBarProps> = ({ volume }) => {
  const getStatus = (percent: number): StatusType => {
    if (percent >= 90) return 'red'
    if (percent >= 75) return 'yellow'
    return 'green'
  }

  const status = getStatus(volume.usagePercent)
  const barColor =
    status === 'red'
      ? 'bg-fluent-status-red'
      : status === 'yellow'
      ? 'bg-fluent-status-yellow'
      : 'bg-fluent-accent'

  return (
    <div className="p-3.5 rounded-fluent bg-fluent-sidebar/60 border border-fluent-border hover:border-fluent-border/90 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-fluent bg-fluent-card border border-fluent-border text-fluent-accent">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 font-mono">
                {volume.driveLetter}
              </span>
              {volume.label && (
                <span className="text-xs text-fluent-muted">
                  ({volume.label})
                </span>
              )}
              {volume.isSystemDrive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-fluent-accent-muted text-fluent-accent font-medium">
                  System
                </span>
              )}
            </div>
            <span className="text-[11px] text-fluent-subtext">
              {volume.fileSystem}
            </span>
          </div>
        </div>
        <StatusBadge
          status={status}
          text={`${volume.usagePercent}% belegt`}
        />
      </div>

      <div className="w-full bg-fluent-card h-2 rounded-full overflow-hidden border border-fluent-border/60 my-2">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${volume.usagePercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-fluent-muted font-mono">
        <span>{formatBytes(volume.freeBytes)} frei</span>
        <span>Gesamt: {formatBytes(volume.sizeBytes)}</span>
      </div>
    </div>
  )
}

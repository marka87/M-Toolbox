import React from 'react'
import { HardDrive } from 'lucide-react'
import type { DiskStorageInfo } from '@shared/types'
import { formatBytes } from '../../hooks/useCleanup'
import { useTranslation } from '../../i18n/LanguageContext'

interface DiskSpaceCardProps {
  disk: DiskStorageInfo
}

export const DiskSpaceCard: React.FC<DiskSpaceCardProps> = ({ disk }) => {
  const { t } = useTranslation()
  const isDanger = disk.usagePercent >= 90
  const isWarning = disk.usagePercent >= 75 && disk.usagePercent < 90

  const getProgressColor = () => {
    if (isDanger) return 'bg-red-500'
    if (isWarning) return 'bg-amber-500'
    return 'bg-fluent-accent'
  }

  const getBadgeColor = () => {
    if (isDanger) return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (isWarning) return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    return 'bg-fluent-accent/15 text-fluent-accent border-fluent-accent/30'
  }

  return (
    <div className="p-4 rounded-2xl bg-fluent-card border border-fluent-border hover:border-fluent-border-hover transition-colors">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-fluent-card-subtle text-fluent-accent shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-fluent-text truncate">
              {disk.volumeName}
            </h4>
            <p className="text-xs text-fluent-muted">
              {t.cleanup.diskFreeOf
                .replace('{free}', formatBytes(disk.freeBytes))
                .replace('{total}', formatBytes(disk.totalBytes))}
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${getBadgeColor()}`}
        >
          {t.cleanup.diskUsed.replace('{percent}', String(disk.usagePercent))}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-fluent-card-subtle overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, disk.usagePercent))}%` }}
        />
      </div>
    </div>
  )
}


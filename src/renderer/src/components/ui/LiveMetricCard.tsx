import React from 'react'
import { StatusBadge, StatusType } from './StatusBadge'

interface LiveMetricCardProps {
  title: string
  value: string
  subValue?: string
  percentage?: number
  icon: React.ReactNode
  status: StatusType
  statusText: string
  secondaryInfo?: {
    label: string
    value: string
  }[]
}

export const LiveMetricCard: React.FC<LiveMetricCardProps> = React.memo(({
  title,
  value,
  subValue,
  percentage,
  icon,
  status,
  statusText,
  secondaryInfo
}) => {
  const getProgressColor = (s: StatusType) => {
    switch (s) {
      case 'green':
        return 'bg-fluent-status-green'
      case 'yellow':
        return 'bg-fluent-status-yellow'
      case 'red':
        return 'bg-fluent-status-red'
    }
  }

  return (
    <div className="bg-fluent-card/90 border border-fluent-border rounded-fluent-lg p-5 shadow-fluent relative overflow-hidden hover:border-fluent-border/90">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-fluent bg-fluent-accent-muted/40 text-fluent-accent">
            {icon}
          </div>
          <div>
            <span className="text-xs font-medium text-fluent-muted uppercase tracking-wider block">
              {title}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {value}
              </span>
              {subValue && (
                <span className="text-xs text-fluent-subtext font-normal">
                  {subValue}
                </span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={status} text={statusText} />
      </div>

      {percentage !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-fluent-sidebar h-2 rounded-full overflow-hidden border border-fluent-border/60">
            <div
              className={`h-full ${getProgressColor(status)} rounded-full`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>
      )}

      {secondaryInfo && secondaryInfo.length > 0 && (
        <div className="mt-4 pt-3 border-t border-fluent-border-subtle/80 flex items-center justify-between text-xs">
          {secondaryInfo.map((info, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-fluent-subtext text-[11px]">{info.label}</span>
              <span className="font-semibold text-slate-200 mt-0.5 font-mono">{info.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
LiveMetricCard.displayName = 'LiveMetricCard'

import React from 'react'

interface InfoItemProps {
  label: string
  value: string | number
  subValue?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  subValue,
  icon,
  badge,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-fluent bg-fluent-sidebar/50 border border-fluent-border-subtle/50 hover:border-fluent-border transition-colors ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-fluent-muted shrink-0 text-sm">{icon}</span>}
        <span className="text-xs font-medium text-fluent-muted truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-100 block font-mono">{value}</span>
          {subValue && <span className="text-[10px] text-fluent-subtext block">{subValue}</span>}
        </div>
        {badge}
      </div>
    </div>
  )
}


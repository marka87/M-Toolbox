import React from 'react'

export type StatusType = 'green' | 'yellow' | 'red'

interface StatusBadgeProps {
  status: StatusType
  text: string
  className?: string
  showDot?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  className = '',
  showDot = true
}) => {
  const styles: Record<StatusType, { bg: string; text: string; dot: string; border: string }> = {
    green: {
      bg: 'bg-fluent-status-green-bg',
      text: 'text-fluent-status-green',
      dot: 'bg-fluent-status-green',
      border: 'border-fluent-status-green-border'
    },
    yellow: {
      bg: 'bg-fluent-status-yellow-bg',
      text: 'text-fluent-status-yellow',
      dot: 'bg-fluent-status-yellow',
      border: 'border-fluent-status-yellow-border'
    },
    red: {
      bg: 'bg-fluent-status-red-bg',
      text: 'text-fluent-status-red',
      dot: 'bg-fluent-status-red',
      border: 'border-fluent-status-red-border'
    }
  }

  const current = styles[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot} animate-pulse`} />
      )}
      {text}
    </span>
  )
}


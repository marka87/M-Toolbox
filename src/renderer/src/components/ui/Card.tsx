import React from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  badge,
  children,
  className = '',
  headerAction
}) => {
  return (
    <div
      className={`bg-fluent-card/85 backdrop-blur-md border border-fluent-border rounded-fluent-lg p-5 shadow-fluent transition-all duration-200 hover:border-fluent-border/80 ${className}`}
    >
      {(title || subtitle || icon || headerAction) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-fluent-border-subtle/80">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-fluent bg-fluent-accent-muted/40 text-fluent-accent flex items-center justify-center">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {title && <h3 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h3>}
                {badge}
              </div>
              {subtitle && <p className="text-xs text-fluent-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  )
}


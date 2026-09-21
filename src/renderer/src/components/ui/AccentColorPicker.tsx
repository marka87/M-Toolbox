import React from 'react'
import { Check } from 'lucide-react'
import type { AccentColor } from '@shared/types'
import { ACCENT_COLOR_CONFIG } from '../../hooks/useSettings'

interface AccentColorPickerProps {
  currentColor: AccentColor
  onChange: (color: AccentColor) => void
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  currentColor,
  onChange
}) => {
  const colorKeys = Object.keys(ACCENT_COLOR_CONFIG) as AccentColor[]

  return (
    <div className="flex flex-wrap items-center gap-3">
      {colorKeys.map((key) => {
        const config = ACCENT_COLOR_CONFIG[key]
        const isSelected = currentColor === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-fluent border transition-all ${
              isSelected
                ? 'bg-fluent-card border-fluent-accent ring-1 ring-fluent-accent shadow-fluent-sm'
                : 'bg-fluent-sidebar/40 border-fluent-border/60 hover:bg-fluent-sidebar/80 hover:border-fluent-border'
            }`}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
              style={{ backgroundColor: config.hex }}
            >
              {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </span>
            <span className={`text-xs font-medium ${isSelected ? 'text-slate-100' : 'text-fluent-muted'}`}>
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}


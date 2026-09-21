import React from 'react'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import type { AppTheme } from '@shared/types'

interface ThemeSelectorProps {
  currentTheme: AppTheme
  onChange: (theme: AppTheme) => void
}

const THEMES: Array<{
  id: AppTheme
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    id: 'dark',
    label: 'Dunkel',
    description: 'Fluent Dark Mode (Standard)',
    icon: <Moon className="w-5 h-5 text-indigo-400" />
  },
  {
    id: 'light',
    label: 'Hell',
    description: 'Helles Windows-Farbschema',
    icon: <Sun className="w-5 h-5 text-amber-400" />
  },
  {
    id: 'system',
    label: 'System',
    description: 'Windows 11 Design automatisch folgen',
    icon: <Monitor className="w-5 h-5 text-blue-400" />
  }
]

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onChange }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {THEMES.map((theme) => {
        const isSelected = currentTheme === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`flex flex-col items-start p-3.5 rounded-fluent-lg border text-left transition-all relative ${
              isSelected
                ? 'bg-fluent-accent-muted/30 border-fluent-accent text-slate-100 shadow-fluent-sm ring-1 ring-fluent-accent'
                : 'bg-fluent-sidebar/50 border-fluent-border/60 hover:border-fluent-border hover:bg-fluent-sidebar/80 text-fluent-muted'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-2 rounded-fluent bg-fluent-card/80 border border-fluent-border/40">
                {theme.icon}
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-fluent-accent flex items-center justify-center text-white text-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <div className="font-medium text-sm text-slate-200">{theme.label}</div>
            <div className="text-xs text-fluent-muted mt-0.5 leading-snug">{theme.description}</div>
          </button>
        )
      })}
    </div>
  )
}


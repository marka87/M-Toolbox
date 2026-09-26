import React from 'react'
import {
  LayoutDashboard,
  Package,
  Cpu,
  Trash2,
  Wrench,
  Sliders,
  Network,
  Terminal,
  Settings,
  ShieldCheck,
  Activity,
  Archive,
  BatteryCharging
} from 'lucide-react'
import type { NavigationModule } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface NavItemConfig {
  id: NavigationModule
  icon: React.ComponentType<{ className?: string }>
  hasBadge?: boolean
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'software', icon: Package },
  { id: 'backup', icon: Archive },
  { id: 'driver', icon: Cpu },
  { id: 'ram-guardian', icon: Activity },
  { id: 'battery', icon: BatteryCharging, hasBadge: true },
  { id: 'cleanup', icon: Trash2 },
  { id: 'repair', icon: Wrench },
  { id: 'tweaks', icon: Sliders },
  { id: 'network', icon: Network },
  { id: 'advanced', icon: Terminal },
  { id: 'settings', icon: Settings },
]

interface SidebarProps {
  activeModule: NavigationModule
  onSelectModule: (module: NavigationModule) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule }) => {
  const { t } = useTranslation()

  return (
    <aside className="w-64 bg-fluent-sidebar border-r border-fluent-border flex flex-col justify-between select-none shrink-0 h-full">
      <div className="p-3">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-fluent-subtext uppercase">
          {t.nav.modulesHeader}
        </div>
        <nav className="space-y-1 mt-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.id
            const label = t.nav[item.id] || item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-fluent text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-fluent-card text-white shadow-fluent-sm border border-fluent-border/80'
                    : 'text-fluent-muted hover:text-slate-200 hover:bg-fluent-card/50'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-fluent-accent rounded-r" />
                )}
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-fluent-accent' : 'text-fluent-subtext group-hover:text-slate-300'
                    }`}
                  />
                  <span>{label}</span>
                </div>
                {item.hasBadge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-fluent-border text-fluent-subtext">
                    {t.common.new}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-fluent-border bg-fluent-bg/40">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-fluent bg-fluent-card/40 border border-fluent-border/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-fluent-status-green" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-200">{t.sidebar.systemProtected}</span>
              <span className="text-[10px] text-fluent-subtext">{t.sidebar.readyForMaintenance}</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-fluent-status-green animate-ping" />
        </div>
      </div>
    </aside>
  )
}

import React, { useState } from 'react'
import { Titlebar } from './components/layout/Titlebar'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { SoftwarePage } from './pages/SoftwarePage'
import { BackupMigrationPage } from './pages/BackupMigrationPage'
import { CleanupPage } from './pages/CleanupPage'
import { RepairPage } from './pages/RepairPage'
import { TweaksPage } from './pages/TweaksPage'
import { AdvancedPage } from './pages/AdvancedPage'
import { SettingsPage } from './pages/SettingsPage'
import { BatteryPage } from './pages/BatteryPage'
import { MiniHudWidget } from './components/ui/MiniHudWidget'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useSettings } from './hooks/useSettings'
import type { NavigationModule } from '@shared/types'

export const App: React.FC = () => {
  const isWidgetView =
    window.location.search.includes('view=widget') ||
    window.location.hash.includes('widget')

  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard')

  // Initialize app settings, accent colors and theme DOM styling on root load
  useSettings()

  if (isWidgetView) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-transparent p-0 m-0">
        <MiniHudWidget />
      </div>
    )
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage />
      case 'software':
        return <SoftwarePage />
      case 'backup':
      case 'reinstall':
        return <BackupMigrationPage />
      case 'battery':
        return <BatteryPage />
      case 'cleanup':
        return <CleanupPage />
      case 'repair':
        return <RepairPage />
      case 'tweaks':
        return <TweaksPage />
      case 'advanced':
        return <AdvancedPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-fluent-bg text-fluent-text">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeModule={activeModule} onSelectModule={setActiveModule} />
        <main className="flex-1 overflow-y-auto bg-fluent-bg">
          <ErrorBoundary>
            {renderModuleContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App

import React, { useState } from 'react'
import { Titlebar } from './components/layout/Titlebar'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { SoftwarePage } from './pages/SoftwarePage'
import { BackupPage } from './pages/BackupPage'
import { DriverPage } from './pages/DriverPage'
import { CleanupPage } from './pages/CleanupPage'
import { RepairPage } from './pages/RepairPage'
import { TweaksPage } from './pages/TweaksPage'
import { NetworkPage } from './pages/NetworkPage'
import { AdvancedPage } from './pages/AdvancedPage'
import { SettingsPage } from './pages/SettingsPage'
import { ReinstallPage } from './pages/ReinstallPage'
import { RAMGuardianPage } from './pages/RAMGuardianPage'
import { useSettings } from './hooks/useSettings'
import type { NavigationModule } from '@shared/types'

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard')

  // Initialize app settings, accent colors and theme DOM styling on root load
  useSettings()

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage />
      case 'software':
        return <SoftwarePage />
      case 'backup':
        return <BackupPage />
      case 'reinstall':
        return <ReinstallPage />
      case 'driver':
        return <DriverPage />
      case 'ram-guardian':
        return <RAMGuardianPage />
      case 'cleanup':
        return <CleanupPage />
      case 'repair':
        return <RepairPage />
      case 'tweaks':
        return <TweaksPage />
      case 'network':
        return <NetworkPage />
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
          {renderModuleContent()}
        </main>
      </div>
    </div>
  )
}

export default App

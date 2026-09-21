import React, { useState } from 'react'
import { Titlebar } from './components/layout/Titlebar'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { SoftwarePage } from './pages/SoftwarePage'
import { BackupPage } from './pages/BackupPage'
import { DriverPage } from './pages/DriverPage'
import { CleanupPage } from './pages/CleanupPage'
import type { NavigationModule } from '@shared/types'
import { Card } from './components/ui/Card'
import { Wrench } from 'lucide-react'

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard')

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage />
      case 'software':
        return <SoftwarePage />
      case 'backup':
        return <BackupPage />
      case 'driver':
        return <DriverPage />
      case 'cleanup':
        return <CleanupPage />
      default: {
        const moduleTitles: Record<NavigationModule, string> = {
          dashboard: 'Dashboard',
          software: 'Software Center',
          backup: 'Backup & Restore',
          driver: 'Driver Center',
          cleanup: 'Cleanup Center',
          repair: 'Repair Center',
          tweaks: 'Tweaks',
          network: 'Netzwerk Toolkit',
          advanced: 'Advanced Tools',
          settings: 'Settings'
        }

        return (
          <div className="p-8 max-w-4xl mx-auto">
            <Card
              title={moduleTitles[activeModule]}
              subtitle="Modul bereit für Implementierung"
              icon={<Wrench className="w-5 h-5" />}
            >
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-fluent-muted">
                  Dieses Modul wird gemäß Entwicklungsplan als nächster Schritt nach Bestätigung von Modul 1 (Dashboard) vollständig implementiert.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fluent-accent-muted text-fluent-accent text-xs font-semibold">
                  Nächster Schritt in der Entwicklungs-Pipeline
                </div>
              </div>
            </Card>
          </div>
        )
      }
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

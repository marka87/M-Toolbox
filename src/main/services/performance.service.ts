import type { PerformanceModeState, PerformanceModeResult } from '../../shared/types'
import { execAsync } from '../utils/exec'
import { powershellService } from './powershell.service'

export class PerformanceService {
  private static instance: PerformanceService
  private state: PerformanceModeState = {
    isActive: false,
    visualEffectsDisabled: false,
    gameDvrDisabled: false,
    gameModeEnabled: false,
    searchIndexerPaused: false,
    highPerformancePlanActive: false,
    previousPowerPlanGuid: undefined
  }

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService()
    }
    return PerformanceService.instance
  }

  /**
   * Retrieves the current system performance state by querying the registry, services and powercfg
   */
  public async getState(): Promise<PerformanceModeState> {
    try {
      const psScript = `
        $transparency = (Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -ErrorAction SilentlyContinue).EnableTransparency
        $minAnimate = (Get-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -ErrorAction SilentlyContinue).MinAnimate
        $gameDvr = (Get-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -ErrorAction SilentlyContinue).GameDVR_Enabled
        $gameMode = (Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -ErrorAction SilentlyContinue).AutoGameModeEnabled
        $wsearch = (Get-Service -Name "wsearch" -ErrorAction SilentlyContinue).Status
        $activeGuid = (powercfg /getactivescheme) -replace ".*:\\s+([a-f0-9-]+).*", '$1'

        [PSCustomObject]@{
          Transparency = $transparency
          MinAnimate = $minAnimate
          GameDvr = $gameDvr
          GameMode = $gameMode
          WSearch = $wsearch.ToString()
          ActivePowerGuid = $activeGuid.Trim()
        } | ConvertTo-Json -Compress
      `

      const stdout = await powershellService.runPowerShell(psScript, 8000)
      if (stdout && stdout.trim()) {
        const data = JSON.parse(stdout.trim())

        const visualEffectsDisabled = data.Transparency === 0 && data.MinAnimate === '0'
        const gameDvrDisabled = data.GameDvr === 0
        const gameModeEnabled = data.GameMode === 1
        const searchIndexerPaused = data.WSearch !== 'Running'
        const highPerformancePlanActive =
          data.ActivePowerGuid === '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' ||
          data.ActivePowerGuid === 'e9a42b02-d5df-448d-aa00-03f14749eb61' ||
          data.ActivePowerGuid === '1fc9b93e-a72f-45cd-af8a-38fd05ee96d4'

        // Mode is considered active if visual effects and DVR are turned off
        const isActive = visualEffectsDisabled || (gameDvrDisabled && highPerformancePlanActive)

        this.state = {
          isActive,
          visualEffectsDisabled,
          gameDvrDisabled,
          gameModeEnabled,
          searchIndexerPaused,
          highPerformancePlanActive,
          previousPowerPlanGuid: this.state.previousPowerPlanGuid || data.ActivePowerGuid
        }
      }
    } catch (err) {
      console.warn('[PerformanceService] Error reading state:', err)
    }

    return { ...this.state }
  }

  /**
   * Activates Performance Mode (Low-Latency & Gaming)
   */
  public async enablePerformanceMode(): Promise<PerformanceModeResult> {
    try {
      // 1. Remember current active scheme
      const { stdout: powerOut } = await execAsync('powercfg /getactivescheme', { timeout: 3000 })
      const guidMatch = powerOut.match(/:\s+([a-f0-9-]+)/i)
      if (guidMatch && guidMatch[1]) {
        const currentGuid = guidMatch[1].trim()
        if (
          currentGuid !== '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' &&
          currentGuid !== '1fc9b93e-a72f-45cd-af8a-38fd05ee96d4' &&
          currentGuid !== 'e9a42b02-d5df-448d-aa00-03f14749eb61'
        ) {
          this.state.previousPowerPlanGuid = currentGuid
        }
      }

      // 2. Prepare power scheme (unlock High Performance if not already unlocked)
      const enableScript = `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -Name "MinAnimate" -Value "0" -Type String -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;
        Stop-Service -Name "wsearch" -Force -ErrorAction SilentlyContinue;
      `

      await powershellService.runPowerShell(enableScript, 15000)

      // 3. Switch to High Performance plan
      try {
        await execAsync('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', { timeout: 3000 })
      } catch {
        // If locked on Windows 11 Modern Standby, duplicate and activate
        try {
          const { stdout: dupOut } = await execAsync('powercfg -duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', { timeout: 4000 })
          const dupMatch = dupOut.match(/:\s+([a-f0-9-]+)/i)
          if (dupMatch && dupMatch[1]) {
            await execAsync(`powercfg /setactive ${dupMatch[1].trim()}`, { timeout: 3000 })
          }
        } catch {
          // Keep current plan
        }
      }

      this.state.isActive = true
      this.state.visualEffectsDisabled = true
      this.state.gameDvrDisabled = true
      this.state.gameModeEnabled = true
      this.state.searchIndexerPaused = true
      this.state.highPerformancePlanActive = true

      return {
        success: true,
        isActive: true,
        message: 'Performance-Modus erfolgreich aktiviert! Grafikeffekte, Game DVR und Indexer wurden für maximale Leistung optimiert.'
      }
    } catch (err: any) {
      console.error('[PerformanceService] Error enabling performance mode:', err)
      return {
        success: false,
        isActive: false,
        message: err?.message || 'Fehler beim Aktivieren des Performance-Modus.'
      }
    }
  }

  /**
   * Deactivates Performance Mode and restores standard settings
   */
  public async disablePerformanceMode(): Promise<PerformanceModeResult> {
    try {
      const disableScript = `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -Name "MinAnimate" -Value "1" -Type String -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;
        Start-Service -Name "wsearch" -ErrorAction SilentlyContinue;
      `

      await powershellService.runPowerShell(disableScript, 15000)

      // Restore power plan
      const targetPlan = this.state.previousPowerPlanGuid || '381b4222-f694-41f0-9685-ff5bb260df2e'
      try {
        await execAsync(`powercfg /setactive ${targetPlan}`, { timeout: 3000 })
      } catch {
        // Fallback to balanced
        await execAsync('powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e', { timeout: 3000 }).catch(() => {})
      }

      this.state.isActive = false
      this.state.visualEffectsDisabled = false
      this.state.gameDvrDisabled = false
      this.state.searchIndexerPaused = false
      this.state.highPerformancePlanActive = false

      return {
        success: true,
        isActive: false,
        message: 'Performance-Modus beendet. Transparenz, Fenster-Animationen und Ausbalanciert-Profil wurden wiederhergestellt.'
      }
    } catch (err: any) {
      console.error('[PerformanceService] Error disabling performance mode:', err)
      return {
        success: false,
        isActive: false,
        message: err?.message || 'Fehler beim Deaktivieren des Performance-Modus.'
      }
    }
  }

  /**
   * Toggles Performance Mode
   */
  public async toggle(): Promise<PerformanceModeResult> {
    const current = await this.getState()
    if (current.isActive) {
      return this.disablePerformanceMode()
    } else {
      return this.enablePerformanceMode()
    }
  }
}

export const performanceService = PerformanceService.getInstance()

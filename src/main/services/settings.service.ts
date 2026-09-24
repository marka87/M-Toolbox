import { app, shell, session } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import type {
  AppSettings,
  UpdateCheckResult,
  AppVersionInfo
} from '../../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'blue',
  startModule: 'dashboard',
  autoStart: false,
  minimizeToTray: false,
  transparencyEffects: true,
  hardwareAcceleration: true,
  experimentalHybridGpuCounters: false
}

export class SettingsService {
  private static instance: SettingsService
  private settingsFilePath: string
  private cachedSettings: AppSettings | null = null

  private constructor() {
    this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json')
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  /**
   * Retrieves current application settings.
   */
  public getSettings(): AppSettings {
    if (this.cachedSettings) {
      return this.cachedSettings
    }

    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf8')
        const parsed = JSON.parse(raw)
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...parsed }
      } else {
        this.cachedSettings = { ...DEFAULT_SETTINGS }
        this.writeSettingsToDisk(this.cachedSettings)
      }
    } catch (err) {
      console.error('Failed to read settings from disk:', err)
      this.cachedSettings = { ...DEFAULT_SETTINGS }
    }

    // Sync with Electron's actual login item settings
    try {
      const loginSettings = app.getLoginItemSettings()
      if (this.cachedSettings) {
        this.cachedSettings.autoStart = Boolean(loginSettings.openAtLogin)
      }
    } catch {
      // ignore
    }

    return this.cachedSettings || DEFAULT_SETTINGS
  }

  /**
   * Updates application settings.
   */
  public saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const updated: AppSettings = { ...current, ...newSettings }

    // Update Windows autostart if changed
    if (newSettings.autoStart !== undefined && newSettings.autoStart !== current.autoStart) {
      try {
        app.setLoginItemSettings({
          openAtLogin: newSettings.autoStart,
          name: 'M-Toolbox'
        })
      } catch (err) {
        console.error('Failed to set login item settings:', err)
      }
    }

    this.cachedSettings = updated
    this.writeSettingsToDisk(updated)
    return updated
  }

  /**
   * Resets settings back to defaults.
   */
  public resetSettings(): AppSettings {
    this.cachedSettings = { ...DEFAULT_SETTINGS }
    this.writeSettingsToDisk(this.cachedSettings)
    try {
      app.setLoginItemSettings({ openAtLogin: false })
    } catch {
      // ignore
    }
    return this.cachedSettings
  }

  private writeSettingsToDisk(settings: AppSettings): void {
    try {
      const dir = path.dirname(this.settingsFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to write settings to disk:', err)
    }
  }

  /**
   * Checks GitHub repository tags for updates.
   */
  public async checkUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion() || '1.9.0'
    const releaseUrl = 'https://github.com/marka87/M-Toolbox/releases'

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseUrl
        })
      }, 5000)

      const req = https.get(
        'https://api.github.com/repos/marka87/M-Toolbox/tags',
        {
          headers: {
            'User-Agent': 'M-Toolbox-App',
            Accept: 'application/vnd.github.v3+json'
          }
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            clearTimeout(timeout)
            try {
              const tags = JSON.parse(body)
              if (Array.isArray(tags) && tags.length > 0) {
                const latestTagName = tags[0].name || ''
                const cleanLatest = latestTagName.replace(/^v/, '')
                const cleanCurrent = currentVersion.replace(/^v/, '')

                // Simple semver comparison
                const hasUpdate = this.compareSemver(cleanLatest, cleanCurrent) > 0

                resolve({
                  hasUpdate,
                  currentVersion,
                  latestVersion: cleanLatest,
                  releaseUrl: `https://github.com/marka87/M-Toolbox/releases/tag/${latestTagName}`
                })
              } else {
                resolve({
                  hasUpdate: false,
                  currentVersion,
                  latestVersion: currentVersion,
                  releaseUrl
                })
              }
            } catch {
              resolve({
                hasUpdate: false,
                currentVersion,
                latestVersion: currentVersion,
                releaseUrl
              })
            }
          })
        }
      )

      req.on('error', () => {
        clearTimeout(timeout)
        resolve({
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseUrl
        })
      })

      req.on('timeout', () => {
        req.destroy()
        clearTimeout(timeout)
        resolve({
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseUrl
        })
      })
    })
  }

  private compareSemver(v1: string, v2: string): number {
    const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0)
    const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0
      const num2 = p2[i] || 0
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    return 0
  }

  /**
   * Returns comprehensive application and system version info.
   */
  public getAppInfo(): AppVersionInfo {
    return {
      version: app.getVersion() || '1.9.0',
      electronVersion: process.versions.electron || '34.0.0',
      nodeVersion: process.versions.node || '20.0.0',
      chromeVersion: process.versions.chrome || '132.0.0',
      v8Version: process.versions.v8 || '12.0.0',
      osVersion: `${os.type()} ${os.release()}`,
      osBuild: os.version() || '',
      arch: os.arch(),
      userDataPath: app.getPath('userData'),
      logsPath: app.getPath('userData')
    }
  }

  /**
   * Opens the user data directory in Explorer.
   */
  public async openUserDataFolder(): Promise<void> {
    const dir = app.getPath('userData')
    await shell.openPath(dir)
  }

  /**
   * Clears application session cache.
   */
  public async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      await session.defaultSession.clearCache()
      await session.defaultSession.clearStorageData({
        storages: ['cachestorage', 'serviceworkers']
      })
      return { success: true, message: 'Anwendungs-Cache wurde erfolgreich geleert.' }
    } catch (err: any) {
      return { success: false, message: `Fehler beim Leeren des Caches: ${err?.message || 'Unbekannt'}` }
    }
  }
}

export const settingsService = SettingsService.getInstance()


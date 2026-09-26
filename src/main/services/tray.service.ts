import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { WidgetService } from './widget.service'

// 32x32 RGBA PNG icon: Rounded Fluent-blue square with crisp white 'M'
const TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAdElEQVR4nO3QSw6AMAgE0B7bg3qfujIxBCxt+OiUSVgYwXmxtYqU4+ymk1Y8BfEuHyJSAVHlIqIAzBKN9uOqu98B7mdNOXeLARgh6B4mQEJwO7gA7nfP3GIAnu9XbjEAb1MAE4DrfA8QiRCTDohAqJNWvFsuaOZ9jGD7fL8AAAAASUVORK5CYII='

export class TrayService {
  private static instance: TrayService
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private isQuitting = false

  private constructor() {}

  public static getInstance(): TrayService {
    if (!TrayService.instance) {
      TrayService.instance = new TrayService()
    }
    return TrayService.instance
  }

  public setQuitting(quitting: boolean): void {
    this.isQuitting = quitting
  }

  public getIsQuitting(): boolean {
    return this.isQuitting
  }

  public init(mainWindow: BrowserWindow): void {
    if (this.tray) {
      this.mainWindow = mainWindow
      return
    }

    this.mainWindow = mainWindow

    const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL)
    this.tray = new Tray(icon)
    this.tray.setToolTip('M-Toolbox')

    this.updateContextMenu()

    this.tray.on('click', () => {
      this.showMainWindow()
    })

    this.tray.on('double-click', () => {
      this.showMainWindow()
    })
  }

  public updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'M-Toolbox öffnen',
        click: () => this.showMainWindow()
      },
      {
        label: 'Desktop Mini-HUD',
        click: () => {
          WidgetService.getInstance().toggle()
        }
      },
      { type: 'separator' },
      {
        label: 'Beenden',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  public destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy()
      this.tray = null
    }
    this.mainWindow = null
  }
}

export const trayService = TrayService.getInstance()

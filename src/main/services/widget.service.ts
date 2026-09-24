import { BrowserWindow, app, screen } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type { WidgetState } from '../../shared/types'

export class WidgetService {
  private static instance: WidgetService
  private widgetWindow: BrowserWindow | null = null
  private mainWindow: BrowserWindow | null = null
  private boundsFilePath: string
  private alwaysOnTop = true
  private clickThrough = false
  private opacity = 0.92

  private constructor() {
    this.boundsFilePath = path.join(app.getPath('userData'), 'widget-bounds.json')
    this.loadBounds()
  }

  public static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService()
    }
    return WidgetService.instance
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private loadBounds(): { x?: number; y?: number; alwaysOnTop?: boolean; opacity?: number } {
    try {
      if (fs.existsSync(this.boundsFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.boundsFilePath, 'utf8'))
        if (typeof data.alwaysOnTop === 'boolean') {
          this.alwaysOnTop = data.alwaysOnTop
        }
        if (typeof data.opacity === 'number' && data.opacity >= 0.2 && data.opacity <= 1.0) {
          this.opacity = data.opacity
        }
        return data
      }
    } catch {
      // ignore
    }
    return {}
  }

  private saveBounds(): void {
    try {
      if (!this.widgetWindow) return
      const bounds = this.widgetWindow.getBounds()
      const data = {
        x: bounds.x,
        y: bounds.y,
        alwaysOnTop: this.alwaysOnTop,
        opacity: this.opacity
      }
      fs.writeFileSync(this.boundsFilePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to save widget bounds:', err)
    }
  }

  /**
   * Toggles the Desktop Widget window open / closed.
   */
  public toggle(): boolean {
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      if (this.widgetWindow.isVisible()) {
        this.widgetWindow.hide()
        return false
      } else {
        this.widgetWindow.show()
        return true
      }
    }

    this.createWidgetWindow()
    return true
  }

  public getState(): WidgetState {
    const isOpen = Boolean(this.widgetWindow && !this.widgetWindow.isDestroyed() && this.widgetWindow.isVisible())
    return {
      isOpen,
      alwaysOnTop: this.alwaysOnTop,
      clickThrough: this.clickThrough,
      opacity: this.opacity
    }
  }

  public setAlwaysOnTop(val: boolean): void {
    this.alwaysOnTop = val
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      this.widgetWindow.setAlwaysOnTop(val, 'floating')
    }
    this.saveBounds()
  }

  public setClickThrough(val: boolean): void {
    this.clickThrough = val
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      this.widgetWindow.setIgnoreMouseEvents(val, { forward: true })
    }
  }

  public setOpacity(val: number): void {
    this.opacity = Math.max(0.2, Math.min(1.0, val))
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      this.widgetWindow.setOpacity(this.opacity)
    }
    this.saveBounds()
  }

  public restoreMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  public closeWidget(): void {
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      this.saveBounds()
      this.widgetWindow.hide()
    }
  }

  private createWidgetWindow(): void {
    const saved = this.loadBounds()

    // Default positioning in bottom-right corner if not previously placed
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    const widgetWidth = 240
    const widgetHeight = 120

    let startX = screenWidth - widgetWidth - 24
    let startY = screenHeight - widgetHeight - 24

    if (typeof saved.x === 'number' && typeof saved.y === 'number') {
      // Validate that saved position is within some display boundary
      const displays = screen.getAllDisplays()
      const isVisibleOnAnyDisplay = displays.some(d => {
        const { x, y, width, height } = d.bounds
        return (
          saved.x! >= x - 50 &&
          saved.x! <= x + width - 50 &&
          saved.y! >= y - 50 &&
          saved.y! <= y + height - 50
        )
      })
      if (isVisibleOnAnyDisplay) {
        startX = saved.x
        startY = saved.y
      }
    }

    const preloadJs = path.join(__dirname, '../preload/index.js')
    const preloadMjs = path.join(__dirname, '../preload/index.mjs')
    const preloadPath = fs.existsSync(preloadMjs) ? preloadMjs : preloadJs

    this.widgetWindow = new BrowserWindow({
      title: 'M-Toolbox HUD',
      width: widgetWidth,
      height: widgetHeight,
      x: startX,
      y: startY,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      alwaysOnTop: this.alwaysOnTop,
      skipTaskbar: true,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (this.alwaysOnTop) {
      this.widgetWindow.setAlwaysOnTop(true, 'floating')
    }
    this.widgetWindow.setOpacity(this.opacity)
    if (this.clickThrough) {
      this.widgetWindow.setIgnoreMouseEvents(true, { forward: true })
    }

    const rendererDist = path.join(process.env.APP_ROOT || path.join(__dirname, '../..'), 'dist')

    if (process.env.VITE_DEV_SERVER_URL) {
      this.widgetWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=widget`)
    } else {
      this.widgetWindow.loadFile(path.join(rendererDist, 'index.html'), {
        query: { view: 'widget' },
        hash: 'widget'
      })
    }

    this.widgetWindow.on('moved', () => {
      this.saveBounds()
    })

    this.widgetWindow.on('closed', () => {
      this.widgetWindow = null
    })
  }

  public destroy(): void {
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      this.saveBounds()
      this.widgetWindow.close()
      this.widgetWindow = null
    }
  }
}


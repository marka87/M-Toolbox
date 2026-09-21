import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/channels'
import type { SystemInfo, LiveMetrics } from '../shared/types'

export interface MToolboxAPI {
  dashboard: {
    getSystemInfo: (forceRefresh?: boolean) => Promise<SystemInfo>
    startMetricsStream: () => Promise<boolean>
    stopMetricsStream: () => Promise<boolean>
    onLiveMetrics: (callback: (metrics: LiveMetrics) => void) => () => void
  }
  system: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
}

const api: MToolboxAPI = {
  dashboard: {
    getSystemInfo: (forceRefresh) => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.GET_SYSTEM_INFO, forceRefresh)
    },
    startMetricsStream: () => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.START_METRICS_STREAM)
    },
    stopMetricsStream: () => {
      return ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD.STOP_METRICS_STREAM)
    },
    onLiveMetrics: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, metrics: LiveMetrics) => {
        callback(metrics)
      }
      ipcRenderer.on(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DASHBOARD.LIVE_METRICS_EVENT, listener)
      }
    }
  },
  system: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MINIMIZE_WINDOW),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.MAXIMIZE_WINDOW),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.CLOSE_WINDOW),
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, url),
  }
}

contextBridge.exposeInMainWorld('mToolbox', api)

declare global {
  interface Window {
    mToolbox: MToolboxAPI
  }
}


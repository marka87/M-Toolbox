export const IPC_CHANNELS = {
  DASHBOARD: {
    GET_SYSTEM_INFO: 'dashboard:get-system-info',
    START_METRICS_STREAM: 'dashboard:start-metrics-stream',
    STOP_METRICS_STREAM: 'dashboard:stop-metrics-stream',
    LIVE_METRICS_EVENT: 'dashboard:live-metrics-event',
  },
  SYSTEM: {
    OPEN_EXTERNAL: 'system:open-external',
    MINIMIZE_WINDOW: 'system:minimize-window',
    MAXIMIZE_WINDOW: 'system:maximize-window',
    CLOSE_WINDOW: 'system:close-window',
  }
} as const


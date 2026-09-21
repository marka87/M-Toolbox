export const IPC_CHANNELS = {
  DASHBOARD: {
    GET_SYSTEM_INFO: 'dashboard:get-system-info',
    START_METRICS_STREAM: 'dashboard:start-metrics-stream',
    STOP_METRICS_STREAM: 'dashboard:stop-metrics-stream',
    LIVE_METRICS_EVENT: 'dashboard:live-metrics-event',
  },
  SOFTWARE: {
    GET_CATALOG: 'software:get-catalog',
    GET_INSTALLED: 'software:get-installed',
    GET_UPDATES: 'software:get-updates',
    INSTALL: 'software:install',
    UNINSTALL: 'software:uninstall',
    UPGRADE: 'software:upgrade',
    UPGRADE_ALL: 'software:upgrade-all',
    SEARCH: 'software:search',
    OPERATION_PROGRESS: 'software:operation-progress',
  },
  SYSTEM: {
    OPEN_EXTERNAL: 'system:open-external',
    MINIMIZE_WINDOW: 'system:minimize-window',
    MAXIMIZE_WINDOW: 'system:maximize-window',
    CLOSE_WINDOW: 'system:close-window',
  }
} as const


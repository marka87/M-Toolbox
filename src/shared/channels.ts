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
  BACKUP: {
    CREATE_BACKUP: 'backup:create',
    RESTORE_BACKUP: 'backup:restore',
    PREVIEW_BACKUP: 'backup:preview',
    SELECT_BACKUP_FILE: 'backup:select-file',
    SAVE_BACKUP_DIALOG: 'backup:save-dialog',
    LIST_LOCAL_BACKUPS: 'backup:list-local',
    PROGRESS_EVENT: 'backup:progress-event',
  },
  DRIVER: {
    GET_DATA: 'driver:get-data',
    EXPORT_DRIVERS: 'driver:export',
    SELECT_EXPORT_DIR: 'driver:select-export-dir',
    SCAN_HARDWARE: 'driver:scan-hardware',
    OPEN_DEVICE_MANAGER: 'driver:open-device-manager',
    RESTART_DEVICE: 'driver:restart-device',
    GET_GPU_INFO: 'driver:get-gpu-info',
    CHECK_WINDOWS_UPDATE: 'driver:check-windows-update',
    SEARCH_ONLINE: 'driver:search-online',
    PROGRESS_EVENT: 'driver:progress-event',
  },
  SYSTEM: {
    OPEN_EXTERNAL: 'system:open-external',
    MINIMIZE_WINDOW: 'system:minimize-window',
    MAXIMIZE_WINDOW: 'system:maximize-window',
    CLOSE_WINDOW: 'system:close-window',
  }
} as const


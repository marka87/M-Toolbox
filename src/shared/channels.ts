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
    DELETE_BACKUP: 'backup:delete',
    OPEN_BACKUPS_FOLDER: 'backup:open-folder',
    PROGRESS_EVENT: 'backup:progress-event',
  },
  REINSTALL: {
    DISCOVER: 'reinstall:discover',
    CREATE: 'reinstall:create',
    PREVIEW: 'reinstall:preview',
    RESTORE: 'reinstall:restore',
    SELECT_FILE: 'reinstall:select-file',
    SAVE_DIALOG: 'reinstall:save-dialog',
    HISTORY: 'reinstall:history',
    PROGRESS_EVENT: 'reinstall:progress-event',
  },
  CLEANUP: {
    SCAN: 'cleanup:scan',
    CLEAN: 'cleanup:clean',
    OPEN_STORAGE_SENSE: 'cleanup:open-storage-sense',
    PROGRESS_EVENT: 'cleanup:progress-event',
  },
  REPAIR: {
    GET_HEALTH: 'repair:get-health',
    RUN_ACTION: 'repair:run-action',
    RESTART_AS_ADMIN: 'repair:restart-as-admin',
    PROGRESS_EVENT: 'repair:progress-event',
  },
  TWEAKS: {
    GET_ALL: 'tweaks:get-all',
    SET_TWEAK: 'tweaks:set-tweak',
    APPLY_RECOMMENDED: 'tweaks:apply-recommended',
    RESTART_EXPLORER: 'tweaks:restart-explorer',
  },
  ADVANCED: {
    GET_STARTUP_ITEMS: 'advanced:get-startup-items',
    TOGGLE_STARTUP_ITEM: 'advanced:toggle-startup-item',
    DELETE_STARTUP_ITEM: 'advanced:delete-startup-item',
    GET_HOSTS_FILE: 'advanced:get-hosts-file',
    SAVE_HOSTS_FILE: 'advanced:save-hosts-file',
  },
  SETTINGS: {
    GET_SETTINGS: 'settings:get-settings',
    SAVE_SETTINGS: 'settings:save-settings',
    CHECK_UPDATES: 'settings:check-updates',
    GET_APP_INFO: 'settings:get-app-info',
    OPEN_USER_DATA_FOLDER: 'settings:open-user-data-folder',
    CLEAR_CACHE: 'settings:clear-cache',
    RESET_SETTINGS: 'settings:reset-settings',
  },
  BATTERY: {
    GET_INFO: 'battery:get-info',
    SET_POWER_PLAN: 'battery:set-power-plan',
    GENERATE_REPORT: 'battery:generate-report'
  },
  BLOATWARE: {
    SCAN: 'bloatware:scan',
    UNINSTALL: 'bloatware:uninstall',
    BATCH_UNINSTALL: 'bloatware:batch-uninstall',
    PROGRESS_EVENT: 'bloatware:progress-event'
  },
  SYSTEM: {
    OPEN_EXTERNAL: 'system:open-external',
    MINIMIZE_WINDOW: 'system:minimize-window',
    MAXIMIZE_WINDOW: 'system:maximize-window',
    CLOSE_WINDOW: 'system:close-window',
    RELAUNCH_APP: 'system:relaunch-app',
    RESTART_AS_ADMIN: 'system:restart-as-admin',
    WINDOW_VISIBILITY_EVENT: 'system:window-visibility-event'
  },
  WIDGET: {
    TOGGLE: 'widget:toggle',
    GET_STATE: 'widget:get-state',
    SET_ALWAYS_ON_TOP: 'widget:set-always-on-top',
    SET_CLICK_THROUGH: 'widget:set-click-through',
    SET_OPACITY: 'widget:set-opacity',
    RESTORE_MAIN: 'widget:restore-main',
    CLOSE: 'widget:close',
    SET_HEIGHT: 'widget:set-height'
  }
} as const

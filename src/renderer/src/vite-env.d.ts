/// <reference types="vite/client" />

import type { MToolboxAPI } from '../../preload/index'

declare global {
  interface Window {
    mToolbox: MToolboxAPI
  }
  const __APP_VERSION__: string
}


/// <reference types="vite/client" />

import type { MToolboxAPI } from '../../preload/index'

declare global {
  interface Window {
    mToolbox: MToolboxAPI
  }
}


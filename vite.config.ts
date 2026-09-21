import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// Resolve canonical physical path to avoid Windows subst virtual drive mismatches (A: vs C:)
const projectRoot = fs.existsSync(__dirname) ? fs.realpathSync.native(__dirname) : __dirname

const copyScriptsPlugin = {
  name: 'copy-scripts',
  buildStart() {
    const srcDir = path.resolve(projectRoot, 'src/main/scripts')
    const destDir = path.resolve(projectRoot, 'dist-electron/scripts')
    if (fs.existsSync(srcDir)) {
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
      }
    }
  }
}

export default defineConfig({
  root: path.resolve(projectRoot, 'src/renderer'),
  publicDir: path.resolve(projectRoot, 'public'),
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(projectRoot, 'src/renderer/src'),
      '@shared': path.resolve(projectRoot, 'src/shared'),
    },
  },
  plugins: [
    copyScriptsPlugin,
    react(),
    electron({
      main: {
        entry: path.resolve(projectRoot, 'src/main/index.ts'),
        vite: {
          resolve: {
            alias: {
              '@shared': path.resolve(projectRoot, 'src/shared'),
            },
          },
          build: {
            outDir: path.resolve(projectRoot, 'dist-electron/main'),
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
            },
          },
        },
      },
      preload: {
        input: path.resolve(projectRoot, 'src/preload/index.ts'),
        vite: {
          resolve: {
            alias: {
              '@shared': path.resolve(projectRoot, 'src/shared'),
            },
          },
          build: {
            outDir: path.resolve(projectRoot, 'dist-electron/preload'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
})

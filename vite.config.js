import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Capacitor loads the bundle from a local server root, so relative asset paths work.
// GitHub Pages serves from /<repo>/, so CI sets PAGES_BASE to override.
const base = process.env.PAGES_BASE || './'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LifeRPG',
        short_name: 'LifeRPG',
        description: 'Gamified offline habit tracker with streaks, XP, medicines and daily routine.',
        theme_color: '#0e0e0e',
        background_color: '#0e0e0e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // exceljs is a ~930 kB lazy chunk that most people never open. Being
        // under the size cap below is not enough to keep it out — workbox
        // precaches anything matching globPatterns, which would download the
        // whole library on first visit and undo the lazy import in excel.js.
        globIgnores: ['**/exceljs*.js'],
        // Fetched on demand instead, then kept, so the second export works
        // offline even though the first needs a connection.
        runtimeCaching: [
          {
            urlPattern: /exceljs.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'liferpg-exceljs',
              expiration: { maxEntries: 2 }
            }
          }
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ],
  build: {
    outDir: 'dist',
    // Android WebView on supported devices handles modern syntax fine
    target: 'es2020'
  },
  // Vitest transforms test files with esbuild directly, bypassing plugin-react,
  // so the automatic JSX runtime has to be set here too.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js']
  }
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// O conteúdo (JSON + imagens) vive em ../content e é servido como pasta pública.
export default defineConfig({
  base: './',
  publicDir: '../content',
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/**/*.png', 'icon.svg'],
      manifest: {
        name: 'BTCA — Fios e Instrumentais',
        short_name: 'BTCA',
        description: 'Jogo para aprender fios de sutura e instrumentação cirúrgica',
        theme_color: '#1f5e4a',
        background_color: '#f3f5f2',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,json}'], maximumFileSizeToCacheInBytes: 6_000_000 },
    }),
  ],
})

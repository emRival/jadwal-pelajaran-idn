import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'vite.svg'],
      manifest: {
        name: 'Jadwal Pelajaran IDN',
        short_name: 'Jadwal IDN',
        description: 'Sistem Informasi Jadwal Pelajaran & Manajemen Tugas Guru IDN Boarding School Bogor',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'android-icon-36x36.png',
            sizes: '36x36',
            type: 'image/png'
          },
          {
            src: 'android-icon-48x48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'android-icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'android-icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'android-icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'android-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'apple-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Levantamento-/',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: 'app.html'
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['a4-logo.png'],
      manifest: {
        name: 'Relatório de Implantação A4',
        short_name: 'Relatório A4',
        description: 'Criação e consulta de relatórios de implantação A4 Solutions',
        theme_color: '#4d318b',
        background_color: '#f4f2f8',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'a4-logo.png', sizes: '256x256', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})

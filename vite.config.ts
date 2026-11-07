import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Adresse de base : « / » en local, « /fuze-arena-test/maison/ » (par exemple) une fois en ligne
const base = process.env.BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mervans',
        short_name: 'Mervans',
        description: 'Courses, tâches, budget et entretien de la maison de Simon et Romane',
        lang: 'fr',
        id: 'maison',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#EDF1EE',
        theme_color: '#EDF1EE',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Affichage des notifications et ouverture de l'app quand on les touche
        importScripts: ['sw-push.js'],
      },
    }),
  ],
  server: { host: true },
})

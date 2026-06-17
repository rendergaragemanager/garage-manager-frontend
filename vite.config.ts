import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'logos/**/*'],
      manifest: {
        id: '/',
        name: 'Garage Manager',
        short_name: 'Garage',
        description: 'Gestión integral de talleres mecánicos',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#070a0d',
        background_color: '#070a0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon_x48.png',
            sizes: '48x48',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: 'icons/icon_x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/dashboard-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: 'screenshots/dashboard-mobile.png',
            sizes: '720x1280',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});

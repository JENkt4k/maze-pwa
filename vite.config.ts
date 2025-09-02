import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ── Base URL handling ────────────────────────────────────────────────
// For GitHub Pages project sites, set VITE_BASE to `/<repo>/`.
// For user/org root sites, set it to `/`.
// In GitHub Actions below we pass this env var automatically.
const BASE = process.env.VITE_BASE || '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Everything listed here must exist under `public/`
      includeAssets: [
        'favicon.ico',
        'icons/icon-48.png',
        'icons/icon-192.png',
        'icons/icon-256.png',
        'icons/icon-384.png',
        'icons/icon-512.png'
      ],
      manifest: {
        name: 'Kid-Friendly Maze',
        short_name: 'Maze',
        // Important for subpath hosting (e.g., GitHub Pages project site):
        start_url: BASE,
        scope:   BASE,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2b2f77',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Precache built assets; serve SPA shell for navigations
        navigateFallback: `${BASE}index.html`,
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: true }
});

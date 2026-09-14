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
      registerType: 'prompt',
      injectRegister: false,
      // Everything listed here must exist under `public/`
      includeAssets: [
        'icons/favicon.ico',
        'icons/icon-48.png',
        'icons/icon-180.png',
        'icons/icon-192.png',
        'icons/icon-256.png',
        'icons/icon-384.png',
        'icons/icon-512.png',
        'icons/icon-maskable-192.png',
        'icons/icon-maskable-512.png'
      ],
      manifest: {
        name: 'InfiMaze',
        short_name: 'InfiMaze',
        id: BASE,
        description: 'Generate, solve, save, share, and print endless mazes offline.',
        lang: 'en',
        categories: ['games', 'education', 'entertainment'],
        // Important for subpath hosting (e.g., GitHub Pages project site):
        start_url: BASE,
        scope:   BASE,
        display: 'standalone',
        background_color: '#f7f9fd',
        theme_color: '#07172f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precache built assets; serve SPA shell for navigations
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true }
});

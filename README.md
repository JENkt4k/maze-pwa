```
src/
  app/
    App.tsx                 // shell + layout + wires
    components/
      Sidebar.tsx           // controls + Save/Load list
      StatsCard.tsx         // small presentational card
      PWABanner.tsx         // update/offline prompt
      Fab.tsx               // floating actions for mobile
    hooks/
      usePWAInstall.ts      // beforeinstallprompt helper
      useResizeObserver.ts  // small RO wrapper
      useMaze.ts            // state + SVG + stats (optional)

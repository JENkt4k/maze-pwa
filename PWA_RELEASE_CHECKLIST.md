# PWA release checklist

Automated production checks cover the generated manifest and icons, base-path
hosting, controlled offline navigation with query parameters, cached lazy UI,
cached workers, and visible connection status. Run them through the normal PR
gate or with `npm run test:e2e` after a production build.

The following OS integrations require a physical-device check before a tagged
release because browser automation cannot reproduce the system install surfaces:

- Android/Chrome: install from the browser, launch from the home screen, verify
  the 192 px maskable icon and standalone window, then relaunch while offline.
- iOS/Safari: Add to Home Screen, verify the 180 px icon, standalone launch and
  safe-area layout, then relaunch while offline.
- Desktop Chrome or Edge: install, verify the app window and taskbar icon, then
  accept an InfiMaze update from the in-app prompt.
- For every platform: create and save a maze before updating; verify saved mazes,
  play history, theme, and settings remain afterward. The drawing overlay may be
  cleared when the update reloads the page, as stated by the prompt.

Service-worker registration failure is non-fatal: the app displays a dismissible
message and continues online. Loss of connectivity displays a persistent status
until the browser reports that the connection has returned.

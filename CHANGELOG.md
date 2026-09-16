# Changelog

InfiMaze follows [Semantic Versioning](https://semver.org/). The web deployment supplies the running PWA; GitHub Releases provide permanent source snapshots and release notes.

## [0.9.0] — 2026-09-15

First public-beta baseline.

### Maze creation and presentation

- Deterministic DFS, Prim, Kruskal, and Wilson generation for grid and freeform graphs.
- Rectangular, ellipse, diamond, heart, and uploaded silhouette masks with reachable endpoint placement.
- Classic, rounded, and organic walls; drawing tools; printable output; Giant-maze pan and zoom.
- Light, dark, and system themes, high contrast, color-blind-safe data palettes, paged controls, and mobile refinements.

### Play and analysis

- Keyboard, touch, and pointer gameplay with breadcrumbs, hints, pause/resume, quit, persisted attempts, history, and local rankings.
- Build and solve animations with independent algorithms, color, opacity, stepping, and side-by-side/multi-seed analysis.
- Difficulty 2.0 metrics, bounded searches, difficulty-aware braiding, and performance instrumentation.

### Micromouse

- Full-size and half-size competition presets with four-cell center goals.
- Multiple exploration strategies, sensing noise/range, collision and correction penalties, diagonal speed runs, traction constraints, comparisons, batches, and CSV/JSON exports.
- Staged robot inputs and worker-backed calculations to protect mobile scrolling and responsiveness.

### Ownership, sharing, and competition

- Saved-maze folders and tags, printable packs, versioned full-app backup/restore, and deterministic challenge links.
- Account-free WebRTC rooms using manual QR/text offer and answer exchange, free STUN discovery, named rooms and participants, replicated standings, host removal, and refresh recovery.
- Privacy-safe connection diagnostics and downloadable physical-device validation reports.

### PWA and documentation

- Installable offline PWA with update recovery, deployment-base support, production icons, and cached feature workers.
- Complete user manual, screenshots, feature catalog, roadmap, evolution record, release checklist, and physical-device evidence matrix.

### Public-beta limits

- Installed Android, iOS, and desktop behavior plus physical cross-network WebRTC still require completion of `DEVICE_VALIDATION.md` before `1.0.0`.
- Direct WebRTC can fail on restrictive networks because the zero-cost design has no TURN relay.
- Shared hosted leaderboards remain disabled unless a deployment supplies a separately operated backend.

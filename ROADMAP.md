# InfiMaze feature roadmap

## Current delivery focus

- **Active:** offline/PWA release readiness covering installation metadata, updates, cached navigation, and recovery behavior.
- **Next decision point:** select the next product milestone after the PWA release gate; shared online infrastructure remains deferred.
- **Deferred:** shared online leaderboard infrastructure, which requires a separately deployed service.

Scope rule: work that blocks or directly completes the active phase stays in its PR. Other refinements are recorded for a later phase so feature work does not drift indefinitely.

## Completed

- Solver and generation animation algorithms.
- Shaped and uploaded silhouette masks.
- Start and goal placement.
- Rounded and organic wall rendering.
- Interactive gameplay with persisted in-progress sessions.
- Explicit gameplay Quit and later Resume without discarding attempt progress.
- Freeform graph mazes.
- Micromouse simulation with search, return, and speed-run phases.
- Play history with exact local attempt restoration.
- Per-maze local leaderboards with time and move rankings.
- Difficulty 2.0 analysis, search, Wilson generation, adversarial braiding, and Giant mode.
- Gameplay hints, assisted-run tracking, and completion results with personal-best comparison.
- Server-free challenge links that open fixed mazes directly in gameplay.
- Micromouse full-size and half-size competition presets with physical dimensions and scaled timing.
- Offline Micromouse robot profiles with adjustable speed, acceleration, and turn timing.
- Classic Micromouse open four-cell center goal zones with persistent visual marking and nearest-goal flood-fill behavior.
- Selectable Micromouse Flood Fill, Trémaux, and Right-Wall exploration strategies.
- On-demand Micromouse strategy comparison across search and speed-run metrics.
- Multi-seed Micromouse batch benchmarks with downloadable CSV and JSON results.
- Deterministic Micromouse sensor range/noise with collision recovery and position-correction timing.
- Optional diagonal corner smoothing for learned Micromouse speed runs.
- Configurable Micromouse traction limits applied to live and batch timing.
- Cancellable worker-based Micromouse batch benchmarks across multiple seeds.
- Local maze collections with named folders, tags, filters, and versioned JSON backup/restore.
- Printable multi-page maze packs generated from selected saved mazes.
- Paged control navigation with an icon-inspired accessible theme and persistent high-contrast mode.
- Staged Micromouse physics and sensor edits with Apply/Reset controls and mobile-safe slider scrolling.
- Accessibility pass for control tabs, form names, slider touch targets, and forced-color rendering.
- Staged maze width and height editing plus explicitly triggered, measured Micromouse calculations.
- Server-free share links for reproducible Micromouse benchmark configurations.
- Synchronized side-by-side playback and live metric charts for two solver algorithms.
- Worker-based aggregate solver charts across multiple maze seeds.
- Persistent color-blind-safe visualization palette with distinct line patterns.
- Cohesive icon-inspired control styling with accessible navy, blue, and gold states.
- Persistent light, dark, and system interface themes while keeping maze and print surfaces white.
- Per-device maze pipeline timings plus compact SVG animation rendering for large and Giant mazes.
- Production PWA readiness with branded install metadata, connectivity and registration recovery status, cached subpath navigation, and a physical-device release checklist.

## Backlog

1. **Shared online leaderboard — deferred**
   - Client contract and explicit opt-in integration: in progress.
   - Add the verifying, rate-limited backend as a separate deployment stage.
   - Follow [SHARED_LEADERBOARD_API.md](SHARED_LEADERBOARD_API.md).

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

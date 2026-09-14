# InfiMaze feature roadmap

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
- Cancellable worker-based Micromouse batch benchmarks across multiple seeds.

## Backlog

1. **Micromouse sensor and motion realism**
   - Configurable sensor range and noise.
   - Collision and correction penalties.
   - Diagonal speed runs and optional traction or battery constraints.
2. **Maze collections and export**
   - Named folders and tags, backups, and printable maze packs.
   - Shareable benchmark configurations.
3. **Algorithm analysis**
   - Side-by-side playback and charts across multiple seeds.
4. **Accessibility and release polish**
   - Keyboard and screen-reader audit, color-blind-safe palettes, mobile refinement, and large-maze profiling.
5. **Shared online leaderboard — deferred**
   - Client contract and explicit opt-in integration: in progress.
   - Add the verifying, rate-limited backend as a separate deployment stage.
   - Follow [SHARED_LEADERBOARD_API.md](SHARED_LEADERBOARD_API.md).

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

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

## Backlog

1. **Shared online leaderboard**
   - Client contract and explicit opt-in integration: in progress.
   - Add the verifying, rate-limited backend as a separate deployment stage.
   - Follow [SHARED_LEADERBOARD_API.md](SHARED_LEADERBOARD_API.md).

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

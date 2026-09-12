# InfiMaze feature roadmap

## Completed

- Solver and generation animation algorithms.
- Shaped and uploaded silhouette masks.
- Start and goal placement.
- Rounded and organic wall rendering.
- Interactive gameplay with persisted in-progress sessions.
- Freeform graph mazes.
- Micromouse simulation with search, return, and speed-run phases.
- Play history with exact local attempt restoration.
- Per-maze local leaderboards with time and move rankings.

## Backlog

1. **Difficulty 2.0**
   - Replace the coarse structural score with a deterministic, human-oriented
     analysis of wrong branches, trap depth, decision entropy, and goal deception.
   - Preserve the legacy score, generation output, saved mazes, and share links.
   - Follow the incremental phases in [DIFFICULTY_2_PLAN.md](DIFFICULTY_2_PLAN.md),
     beginning with pure graph analysis and synthetic ordering tests.

2. **Shared online leaderboard**
   - Add identity, moderation, and a backend only as a separate opt-in stage.

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

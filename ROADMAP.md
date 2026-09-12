# InfiMaze feature roadmap

## Completed

- Solver and generation animation algorithms.
- Shaped and uploaded silhouette masks.
- Start and goal placement.
- Rounded and organic wall rendering.
- Interactive gameplay with persisted in-progress sessions.
- Freeform graph mazes.
- Micromouse simulation with search, return, and speed-run phases.

## Next stages

1. **Play history**
   - Add a history entry whenever a maze is started, including abandoned and
     completed attempts.
   - Store a stable maze identity plus enough maze data to reopen the exact maze.
   - Record elapsed time, moves, revisits, completion state, timestamps, and the
     player's route.
   - Provide history UI, reopen, delete, and clear controls.

2. **Local leaderboard**
   - Rank completed attempts per maze, with best-time and fewest-moves views.
   - Include Micromouse results as a separate comparison category.
   - Keep the first version local and offline-capable. A shared online leaderboard
     requires identity, moderation, and a backend and should be a separate stage.

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

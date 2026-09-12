# InfiMaze feature roadmap

## Completed

- Solver and generation animation algorithms.
- Shaped and uploaded silhouette masks.
- Start and goal placement.
- Rounded and organic wall rendering.
- Interactive gameplay with persisted in-progress sessions.

## Next stages

1. **Freeform graph mazes**
   - Add a topology-neutral maze document shared by rendering, solving,
     animation, endpoints, gameplay, saving, and sharing.
   - Add a seeded Voronoi-style generator with irregular cells and walls.
   - Preserve every existing grid maze and saved/share-link contract.

2. **Play history and local leaderboard**
   - Add a history entry whenever a maze is started, including abandoned and
     completed attempts.
   - Store a stable maze identity plus enough maze data to reopen the exact maze.
   - Record elapsed time, moves, revisits, completion state, timestamps, and the
     player's route.
   - Rank completed attempts per maze, with best-time and fewest-moves views.
   - Provide history/leaderboard UI, replay, delete, and clear controls.
   - Keep the first version local and offline-capable. A shared online leaderboard
     requires identity, moderation, and a backend and should be a separate stage.

3. **Micromouse simulation**
   - Give the simulated mouse incomplete knowledge rather than the full graph.
   - Add flood-fill exploration, discovered-wall memory, return/search runs, and
     a speed run.
   - Add simplified motion costs for distance, turns, acceleration, and collisions.
   - Compare algorithms using time, distance, turns, explored cells, and final
     route quality; save results beside human leaderboard attempts.

## Ordering decision

History follows freeform generation so its maze snapshots and fingerprints support
both rectangular grids and irregular graphs from their first stored version. The
Micromouse stage then consumes the same graph and run-record contracts without a
second migration.

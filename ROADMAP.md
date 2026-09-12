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

2. **Micromouse simulation**
   - Give the simulated mouse incomplete knowledge rather than the full graph.
   - Add flood-fill exploration, discovered-wall memory, return/search runs, and
     a speed run.
   - Add simplified motion costs for distance, turns, acceleration, and collisions.
   - Compare algorithms using time, distance, turns, explored cells, and final
     route quality.

3. **Play history and local leaderboard**
   - Add a history entry whenever a maze is started, including abandoned and
     completed attempts.
   - Store a stable maze identity plus enough maze data to reopen the exact maze.
   - Record elapsed time, moves, revisits, completion state, timestamps, and the
     player's route.
   - Rank completed attempts per maze, with best-time and fewest-moves views.
   - Provide history/leaderboard UI, replay, delete, and clear controls.
   - Keep the first version local and offline-capable. A shared online leaderboard
     requires identity, moderation, and a backend and should be a separate stage.

## Ordering decision

Micromouse follows freeform generation because both stages use the same generalized
graph, geometry, and movement contracts. History and leaderboards come last so the
storage and ranking model can account for grid mazes, freeform mazes, human runs,
and Micromouse results without an immediate migration. The Micromouse stage remains
independent of history storage.

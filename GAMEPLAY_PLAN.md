# Maze gameplay and validation

- [x] Branch from merged `main` as `feature/maze-gameplay`.
- [x] Add Play mode alongside the drawing tools.
- [x] Move only through graph-adjacent passages using arrows, WASD, taps, clicks, and swipes.
- [x] Add an accessible, focused gameplay overlay with visible adjacent moves.
- [x] Track elapsed time, moves, revisits, route breadcrumbs, pause, restart, and completion.
- [x] Keep solver/build overlays hidden during play so they do not reveal the route.
- [x] Persist unfinished game progress locally and restore active games as paused.
- [x] Reset gameplay when maze topology or endpoints change.
- [x] Complete the consolidated unit, production build, desktop, and mobile validation pass.

Future hint and scoring work can build on the recorded player route without changing
the movement engine.

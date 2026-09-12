# Micromouse simulation plan

## Goal

Simulate a Micromouse-style robot that initially knows only the maze dimensions,
its starting cell, and the goal. The robot learns walls from the cell it occupies,
uses flood-fill decisions to explore, returns to the start, and then performs a
speed run over its discovered map. The first version applies to grid mazes, where
cell walls, headings, turns, and motion costs have clear physical meaning.

## Simulation engine

- [x] Define immutable simulation events and a final result independent of React.
- [x] Maintain a discovered wall map with unknown, open, and blocked edges.
- [x] Reveal the four walls of each cell only when the mouse enters that cell.
- [x] Recalculate flood-fill distances through known-open and unknown cells after
  each observation.
- [x] Select moves by distance, preferring unvisited cells and then continuing in
  the current heading; keep all tie-breaking deterministic.
- [x] Detect stalled or contradictory maps with a bounded-step failure result.
- [x] Run three phases: search to goal, return to start, and speed run to goal.
- [x] Calculate the speed route using only knowledge discovered during search and
  return phases.

## Simplified physics and metrics

- [x] Track cells traveled, unique cells explored, revisits, and turns by phase.
- [x] Assign configurable costs for cell distance, cardinal turns, acceleration,
  and braking. Diagonal 45/135-degree turns and collision handling belong to a
  later diagonal-motion stage.
- [x] Use a deterministic trapezoidal speed profile for straight runs rather than
  a frame-by-frame rigid-body simulation.
- [x] Report search time, return time, speed-run time, total simulated time,
  explored percentage, route length, and route quality versus the true shortest
  path.
- [x] Keep simulated time separate from animation playback speed.

## UI and animation

- [x] Add a **Micromouse** control section with Start, Pause, Resume, Step,
  Restart, and phase controls.
- [x] Explain that Micromouse is available for grid topology and show a disabled
  reason for freeform topology.
- [x] Draw the mouse with its current heading, discovered cells/walls, flood-fill
  values, and traveled route as independently toggleable layers.
- [x] Reuse the existing animation timing controls without coupling simulation
  state to SVG drawing.
- [x] Allow the current maze endpoints to define the course; add a competition
  preset that places the start near a corner and the goal near the center.
- [x] Keep human gameplay, solver animation, and Micromouse overlays mutually
  exclusive so routes are not revealed accidentally.

## Persistence boundary

- [x] Persist only Micromouse display preferences in this stage.
- [x] Expose a versioned result object for the later history and leaderboard work.
- [x] Do not create leaderboard records or an online service in this PR.

## Completion

- [x] Unit-test wall discovery, flood-fill decisions, deterministic event streams,
  phase transitions, failure bounds, and physics calculations.
- [x] Verify perfect and braided mazes across multiple seeds and dimensions.
- [x] Verify endpoint changes and the competition preset.
- [x] Run one consolidated unit/build pass and targeted desktop/mobile browser
  scenarios at feature completion.

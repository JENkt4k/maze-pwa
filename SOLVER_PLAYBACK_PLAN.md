# Solver architecture and playback plan

## Branch and pull request

- Branch: `feature/solver-playback`
- Base: `astra-upgrade`
- Pull request target: `astra-upgrade` while stabilization PR #11 is open
- After PR #11 merges: retarget this pull request to `main`

This is a stacked pull request because it depends on the topology, state, test, and
PWA fixes in PR #11. It combines solver extraction and playback controls because
the existing generation animation crosses both concerns and must be replaced as
one coherent change.

## Scope

- Introduce a rendering-independent maze graph adapter.
- Keep maze generation and its carve trace separate from solving.
- Add DFS, breadth-first search, Dijkstra, and A* behind one solver interface.
- Emit algorithm-neutral search events with final paths and comparable metrics.
- Replace the generator-carve animation with solver playback.
- Add algorithm selection, play/pause, restart, step, speed, and progress controls.
- Render explored cells, the current cell, and the solution without solver-specific
  SVG or timing code.
- Persist playback preferences without adding them to shared maze URLs.
- Preserve generated maze layouts, saved mazes, drawing, printing, and offline use.

## Deliberate exclusions from the first increment

- Micromouse partial-knowledge exploration and physics.
- Alternative maze generators and shaped/curved topology.
- Weighted terrain, diagonal motion, and turn-cost robot planning.

The graph and event interfaces should support those later features without adding
their assumptions to this pull request.

## Second increment: generation and solution animation

The current overlay animates a solver searching an already completed maze. The
former blue fill animated the maze generator's carve order. Preserve both ideas
as two phases of one optional timeline:

1. **Build phase** — replay generation events in a construction color until the
   completed maze is visible.
2. **Solve phase** — continue automatically with the selected solver's neutral
   search events in distinct explore/path colors.

Provide separate **Generation algorithm** and **Solving algorithm** selectors because
they solve different problems. The current generator is an iterative randomized
DFS backtracker. DFS, BFS, Dijkstra, and A* in this PR are maze solvers; selecting
A* should not imply that A* constructs the maze. Future generators can include
randomized Prim, randomized Kruskal, Wilson, and recursive division. A randomized
BFS spanning tree is possible, but it tends to create a visibly different branching
texture and should be presented as a generator rather than reusing the BFS solver.

Playback should offer `Build + solve`, `Build only`, and `Solve only`, with
`Build + solve` as the recommended default. Both phases should share play/pause,
step, speed, seek, and restart controls while retaining phase-specific colors and
metrics. The event envelope can add a `phase: 'generation' | 'solution'` field;
generation events remain separate from the immutable final graph consumed by
solvers. This also leaves room for a later side-by-side comparison mode without
making two independent animations the primary interface.

### Execution checklist

- [x] Rename the panel to **Animation Algorithms** so it describes both phases.
- [x] Add `Build + Solve`, `Build only`, and `Solve only` modes.
- [x] Add independent generation and solving algorithm selectors.
- [x] Preserve randomized DFS and its existing seed/layout contract as the default.
- [x] Add deterministic randomized Prim and randomized Kruskal generators.
- [x] Include non-default generators in saved mazes and shared links.
- [x] Replay the generation trace before solver events on one playback timeline.
- [x] Use separate construction, exploration, current-position, and solution colors.
- [x] Provide a persisted construction color picker and opacity control, defaulting
  to translucent teal for contrast with the blue solver exploration layer.
- [x] Provide a persisted solver-search color picker and opacity control while
  retaining a distinct red final route.
- [x] Keep print output free of every animation overlay.
- [x] Verify unit, component, production, root-path, and subpath browser checks.

## Completion checks

- [x] Every solver returns a valid start-to-goal path.
- [x] BFS, Dijkstra, and A* return a shortest path on the unweighted graph.
- [x] DFS exposes backtracking and may return a non-shortest path.
- [x] Solver modules do not import React, SVG, CSS, or timers.
- [x] Playback works with every solver through the same event interface.
- [x] Pause, resume, restart, step, speed, algorithm changes, and maze changes work.
- [x] Printing excludes solver overlays and manual drawing still resets correctly.
- [x] Existing seeded layout fixture and stabilization regressions pass.
- [x] Production desktop/mobile and offline browser tests pass at root and subpath.
- [x] README documents semantics and future Micromouse extension points.

## Verification evidence

- 52 Jest unit/component tests passed.
- 22 Playwright scenarios passed at the root path on desktop and mobile.
- 22 Playwright scenarios passed at `/maze-pwa/` on desktop and mobile.
- Production builds passed at both deployment bases.

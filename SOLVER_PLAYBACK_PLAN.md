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

## Deliberate exclusions

- Micromouse partial-knowledge exploration and physics.
- Alternative maze generators and shaped/curved topology.
- Weighted terrain, diagonal motion, and turn-cost robot planning.

The graph and event interfaces should support those later features without adding
their assumptions to this pull request.

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

- 47 Jest unit/component tests passed.
- 22 Playwright scenarios passed at the root path on desktop and mobile.
- 22 Playwright scenarios passed at `/maze-pwa/` on desktop and mobile.
- Production builds passed at both deployment bases.

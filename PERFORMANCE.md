# Large-maze performance

## User-visible measurements

The Analyze page reports the cost of the current maze pipeline after an applied
maze, solver, or rendering change. It separates generation, graph conversion,
difficulty analysis, stable identity, solving, and base SVG rendering. Robot
simulation and batch costs remain separately measured and only run after an
explicit user action.

The displayed rating uses an interaction-oriented budget:

- Responsive: 50 ms or less total synchronous work.
- Moderate: more than 50 ms through 150 ms.
- Heavy: more than 150 ms.

These measurements describe the current device and browser. They are diagnostic
timings rather than cross-device benchmark scores.

## Scalability changes

- Generation playback uses one compound SVG path instead of one DOM node per edge.
- Solver discovery and expansion use two compound SVG paths instead of up to two
  DOM nodes per visited cell.
- Side-by-side comparison builds prefix counters once, so each animation frame
  reads its metrics in constant time.
- Maze fingerprints hash the canonical stream incrementally instead of allocating
  one large joined string.

The browser regression covers 32×32, 41×41, and 101×101 mazes and verifies that
the pipeline completes, reports every phase, and keeps the generation overlay at
one SVG path.

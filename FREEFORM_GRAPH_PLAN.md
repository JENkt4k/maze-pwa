# Freeform graph maze plan

## Goal

Add a genuinely non-grid maze made from seeded irregular cells. The first style
will use Voronoi-like regions: each region is a maze node, adjacent regions form
candidate passages, and the selected generation algorithm opens shared walls.
Existing rectangular and silhouette mazes remain reproducible.

## Architecture

- [ ] Define a topology-neutral maze document containing graph nodes, geometric
  wall paths, bounds, start/goal IDs, build events, stats, and a stable fingerprint.
- [ ] Adapt the current grid `MazeResult` into that document without changing its
  seeded output, save data, URLs, rendering, or print appearance.
- [ ] Change solver, animation, endpoint, and gameplay overlays to map graph-space
  positions through document bounds rather than assuming cell centers.
- [ ] Keep the current grid generator behind the same document interface.

## First freeform generator

- [ ] Add a deterministic seeded point distribution inside the selected mask.
- [ ] Build clipped irregular regions and their planar adjacency graph.
- [ ] Run randomized DFS, Prim, or Kruskal over that graph to select passages.
- [ ] Retain shared region borders as walls and create visible openings for selected
  passages; retain the silhouette outline as a closed border.
- [ ] Support braiding while preserving connectivity and reciprocal adjacency.
- [ ] Choose or validate endpoints on graph nodes and calculate existing metrics.

## Product integration

- [ ] Add **Maze topology** UI with `Grid` as the compatibility default and
  `Freeform regions` as the new option.
- [ ] Add region density and irregularity controls with bounded mobile-friendly
  ranges.
- [ ] Support built-in masks and uploaded silhouettes.
- [ ] Support Classic, Rounded, and Organic appearance, printing, build/solve
  animation, endpoint editing, and gameplay.
- [ ] Persist and share topology settings with an explicit format version.

## Completion

- [ ] Verify deterministic output, connected graphs, planar reciprocal passages,
  closed outlines, valid endpoints, and solver agreement.
- [ ] Verify existing grid fixtures and saved/share links remain unchanged.
- [ ] Run one consolidated unit/build and targeted desktop/mobile browser pass at
  feature completion.

# InfiMaze feature and completion record

This is the authoritative product-level completion catalog. Engineering plans preserve implementation decisions; the [user manual](USER_MANUAL.md) explains operation.

## Complete and supported

| Area | Feature set | Purpose | Completion evidence |
| --- | --- | --- | --- |
| Generation | Seeded DFS, Prim, Kruskal, and Wilson; bias, straight preference, random and difficulty-aware braiding | Produce reproducible mazes with distinct structural character | Determinism, connectivity, wall reciprocity, masks, and browser selection tests |
| Geometry | Grid and seeded freeform Voronoi topologies | Support classic puzzles and organic region mazes | Core graph and endpoint tests; desktop/mobile browser coverage |
| Shapes | Built-in rectangle, ellipse, diamond, heart, star, cup, brain, and moose masks; raster silhouette import | Put playable mazes inside recognizable outlines | Mask connectivity, boundary, upload, and preview coverage |
| Endpoints | Direct cell placement and automatic strategies | Let authors choose entrances and goals while preserving reachability | Placement and restoration browser coverage |
| Appearance | Classic, rounded, and organic walls; thickness and radius | Create readable print and screen styles | SVG and print regression coverage |
| Annotation | Draw, erase, clear, scroll-safe touch mode | Let users solve or mark paths without altering maze data | Resize, erase, reset, and print-exclusion coverage |
| Animation | Actual build replay plus DFS/BFS/Dijkstra/A* solver replay | Explain how generation and solving differ | Algorithm, playback, metrics, and mobile controls coverage |
| Analysis | Side-by-side synchronized solvers and worker-based multi-seed charts | Compare algorithms on one maze or a repeatable sample | Aggregate and UI tests |
| Difficulty | Difficulty 2.0 structural metrics, bounded worker search, Wilson and adversarial-braiding support | Estimate and search for challenging layouts without freezing controls | Deterministic metric and worker-flow tests |
| Giant mode | 43–101 cell mazes with pan, zoom, and compact overlays | Explore larger mazes while controlling DOM and calculation cost | Performance budget and browser tests |
| Gameplay | Keyboard, tap, and swipe movement; timer, breadcrumbs, pause/resume/restart/quit, hints, results | Turn generated mazes into playable challenges | Timer, persistence, movement, assisted result, and mobile tests |
| History | Automatic local attempt records and exact paused restoration | Preserve every played maze and progress | Corrupt-data and lifecycle tests |
| Rankings | Per-maze local time/move ranking and Micromouse benchmark card | Compare human and robot outcomes offline | Ranking, filtering, and theme coverage |
| Micromouse | Competition formats; center goals; three strategies; physics, sensing, collisions, corrections, traction, diagonals | Model partial-knowledge robot exploration and speed runs | Deterministic simulation, physical scaling, and UI tests |
| Benchmarking | Same-maze comparison; 10/25/50-seed worker batches; CSV/JSON and share links | Produce repeatable algorithm evidence without blocking the UI | Worker cancellation, export, and share parsing tests |
| Collections | Names, folders, tags, filters, JSON collection transfer | Organize reusable maze designs locally | Merge, normalize, import/export, and browser tests |
| Printing | Single mazes and one/two-per-page packs | Produce clean paper puzzles without overlays | Print lifecycle and output-markup tests |
| Full backup | Versioned all-app JSON download and transactional restore | Survive browser clearing, uninstall, or device migration | Ownership, rollback boundary, desktop/mobile restore tests |
| Themes and access | Light/dark/system themes, high contrast, color-blind palette, keyboard tabs, named forms | Keep controls usable across visual and input needs | Component, forced-color, focus, and mobile checks |
| PWA | Install metadata, offline cache, update recovery, subpath hosting | Make InfiMaze installable and usable offline | Manifest, service worker, offline reload, and GitHub Pages tests |
| Sharing | Maze, challenge, and benchmark links | Reproduce configurations without accounts | Versioned parsing and compatibility tests |
| Serverless rooms | Named rooms, participant identities, host removal, refresh recovery, QR/manual WebRTC handshake, replicated standings, diagnostics and exports | Run and recover small competitions without hosted infrastructure | Signal validation, persistence, and complete desktop/mobile peer exchange |

## Deliberately constrained

- Uploaded marker images and drawing strokes stay local and are excluded from shared links.
- Drawings are annotations, not validated solutions, and do not print.
- Micromouse requires grid topology.
- Difficulty scores are structural estimates and are not calibrated from a human population.
- Serverless rooms require a two-way offer/answer exchange. STUN is free discovery, not hosting. Without TURN, some network pairs cannot connect.
- Local copies disappear if storage is cleared without first downloading an all-app backup.

## Deferred

- A hosted global leaderboard backend. Its client contract exists, but deployment, abuse controls, ongoing availability, and cost ownership have not been accepted.
- Optional TURN service. It remains deferred until a sustainable no-charge provider and privacy boundary are identified.

## Documentation definition of done

- [x] Feature purpose and operating steps documented.
- [x] Current desktop and mobile screenshots stored in the repository.
- [x] Privacy, persistence, performance, and connectivity limits stated.
- [x] Engineering plans labeled as historical/completed or deferred.
- [x] Dated evolution record tied to Git history.
- [x] README and roadmap point to authoritative documents.


# InfiMaze feature roadmap

## Current delivery focus

- **Completed baseline:** the current feature set, operating manual, screenshot set, full local backup, and dated evolution record are documented.
- **Next milestone:** competition reconnection and host controls, building on named rooms and participant identities.
- **Deferred:** shared online leaderboard infrastructure and optional TURN, both of which require separately funded services.

Scope rule: work that blocks or directly completes the active phase stays in its PR. Other refinements are recorded for a later phase so feature work does not drift indefinitely.

## Completed

- Deterministic DFS, Prim, Kruskal, and Wilson grid/freeform generation.
- Solver and generation animation algorithms, synchronized comparisons, and multi-seed analysis.
- Built-in shaped masks and uploaded custom silhouettes.
- Editable reachable start and goal placement.
- Classic, rounded, and organic wall rendering.
- Interactive gameplay, hints, completion results, Quit/Resume, and persisted attempts.
- Play history and per-maze local leaderboards.
- Difficulty 2.0 analysis, bounded search, difficulty-aware braiding, and Giant mode.
- Micromouse competition presets, center goals, exploration strategies, realistic motion/sensing, comparisons, worker batches, exports, and benchmark links.
- Local collections with folders, tags, JSON transfer, printable packs, and versioned full-app backup/restore.
- Paged accessible controls, staged expensive inputs, light/dark/system themes, high contrast, color-blind-safe visualization, and mobile refinements.
- Production PWA installation, offline operation, update recovery, subpath deployment, and performance profiling.
- Deterministic maze/challenge sharing.
- Serverless WebRTC rooms with compressed offer/answer QR signaling, automatic host-maze loading, replicated local standings, replay validation, exports, and privacy-preserving connection diagnostics.
- Feature manual, completion catalog, current screenshot set, documentation map, and dated evolution record.

See [FEATURE_STATUS.md](FEATURE_STATUS.md) for the supported boundary and evidence, and [USER_MANUAL.md](USER_MANUAL.md) for operation.

## Backlog

1. **Competition session management**
   - [x] Name rooms and show participant identities rather than only a count.
   - Add host removal controls and a clear reconnection workflow after refresh or connection loss.
   - Preserve room identity and replicated standings during reconnection.
2. **Physical release validation**
   - Record QR camera support and direct connectivity across representative mobile/desktop and same/cross-network pairs.
   - Use route diagnostics to distinguish application defects from NAT limitations.
3. **Shared online leaderboard — deferred**
   - Retain the existing explicit opt-in client contract.
   - Add a verifying, rate-limited backend only as a separately approved deployment stage.
   - Follow [SHARED_LEADERBOARD_API.md](SHARED_LEADERBOARD_API.md).
4. **Optional TURN — deferred**
   - Evaluate only if a sustainable no-charge provider can preserve the privacy and cost boundary.

## Ordering decision

Competition session management follows the successful two-way room handshake because participant identity and recovery now have a stable transport and replicated result model. Physical-device validation follows the UI work so failures can be classified with the route diagnostics. Hosted services remain last because they add cost, operations, abuse prevention, and privacy obligations to an otherwise local-first application.

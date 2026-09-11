# Maze PWA stabilization execution plan

## Scope and completion

Implement the September 10, 2026 code-review fixes on the user's current
`astra-upgrade` branch. Preserve existing seeded maze layouts and the user's
`.gitignore` changes. Do not publish, deploy, or add unrelated gameplay features.

Completion requires a passing production build, TypeScript check, unit/component
regressions, desktop/mobile browser regressions, and production offline checks.
Report physical-device or printer checks that cannot be exercised here.

## Execution and ownership

The coordinator launched three agents with exclusive file ownership in the shared
workspace. Separate worktrees were not created; no agent was authorized to commit.
All three agents stopped after hitting usage limits. The coordinator completed and
reviewed their partial changes; agent termination was not treated as completion.

| Owner | Files / responsibility | Status |
| --- | --- | --- |
| Core agent | `src/app/maze.ts`, unused `src/maze/*`, core tests | Completed and reviewed by coordinator |
| App-state agent | `App.tsx`, state/URL/print helpers, state tests | Completed and reviewed by coordinator |
| UI agent | Components, hooks, CSS, UI tests | Completed and reviewed by coordinator |
| Coordinator | Dependencies, shared contracts, all integration, tests, CI, docs | Completed integration, review, and verification |

## Decisions

- Preserve the existing generator's random sequence so old saved/shared mazes
  still reproduce their layouts. Correct statistics independently of generation.
- `Stats.L` is shortest solution length in edges, `T` is solution turn rate,
  `J`/`E` count junctions/dead ends in the final braided graph. Difficulty is an
  explicitly documented heuristic, not a calibrated human difficulty rating.
- The bounded difficulty search includes the current settings and preserves seed.
- SVG markers are escaped plain text or bounded raster data URLs. Reject SVG and
  arbitrary image URLs. New shared links distinguish encoding from legacy links.
- Save parameters and markers. Drawing is session-only, resets with maze identity,
  and uses normalized coordinates to survive resizing.
- Remove unfinished extraction stubs, unused polyline animation, and the ineffective
  hide-walls option. Defer solver UI, hints, and completion detection.
- Use the generated PWA manifest as the single source of truth. Prompt for updates
  rather than automatically reloading a user's drawing session.

## Work checklist

- [x] Inspect repository and establish file ownership.
- [x] Install locked dependencies; add browser/component test tools.
- [x] Secure SVG rendering and validate generator inputs.
- [x] Verify compatibility of seeded layouts against the original implementation.
- [x] Correct solution statistics and max-difficulty selection.
- [x] Repair URL parsing, legacy links, empty/compound markers, and persistence.
- [x] Repair rectangular load, square lock, storage errors, and printing lifecycle.
- [x] Repair animation identity/timers, sidebar, picker, uploads, and drawing.
- [x] Remove dead code and align types/configuration.
- [x] Add meaningful regression tests and deployment quality gates.
- [x] Verify production build at root and a project subpath; verify offline reload.
- [x] Exercise desktop/mobile browser interactions and inspect screenshots.
- [x] Review final diff and update README with actual behavior and limitations.

## Verification matrix

| Area | Required evidence |
| --- | --- |
| Core | Determinism, v1 layout compatibility, connected cells, reciprocal walls, closed boundaries, tree edge count, braid-aware solution statistics, invalid inputs |
| Security | Marker injection rendered as text; unsafe image sources rejected; malformed links do not throw |
| State | Empty/compound marker round trips, legacy links/records, corrupt storage, save failures, rectangular loads |
| Animation | Restart during and after a run; same-size new maze; enable/disable and timer cleanup |
| Drawing | Draw/erase/clear, resize retention, new-maze reset, touch scroll mode |
| UI | Desktop hide/minimize/layout, mobile overflow, picker bounds/focus, upload validation |
| Printing | Single invocation, cleanup, blank-maze output excludes overlays; physical printing separately noted |
| PWA / CI | Build + typecheck + tests gated; generated manifest/subpath URLs; production service worker controls page and offline reload succeeds |

## Commands and results

Use `npm.cmd` / `npx.cmd` in this Windows environment (PowerShell script policy
blocks the `.ps1` shims). Dependencies installed with the workspace `.npm-cache`.
Initial checks during partial agent edits exposed the obsolete numeric stats test;
the final integrated results are recorded below.

## Final results ? September 10, 2026

- Completed implementation and review on `astra-upgrade`; no commit, push, or
  deployment was performed. The user's npm-cache ignore entry is preserved.
- `npm.cmd test -- --runInBand`: 3 suites, 28 tests passed.
- `npm.cmd run typecheck`: passed with strict checking, no unused locals/parameters,
  including the browser tests and Vite/Playwright configurations.
- `npm.cmd run build`: passed for both root and `/maze-pwa/` hosting. The final
  local dist was restored to the default root build for ordinary preview use.
- `npm.cmd run test:e2e`: 20 production browser tests passed (desktop and mobile
  emulation, installed Edge engine), exit code 0.
- `VITE_BASE=/maze-pwa/ TEST_BASE=/maze-pwa/ npm run test:e2e`: all 20 tests passed,
  exit code 0. Includes offline reload, lazily loaded picker, difficulty worker,
  manifest scope/start URL, and icon availability.
- Compared 36 seeded layouts to the original implementation: identical. A fixed
  SHA-256 layout fixture now protects the existing seed contract in unit tests.
- Core unit tests check connected cells, matching walls, closed boundaries and
  spanning-tree counts for 90 maze configurations.
- Inspected desktop/mobile screenshots of drawing and emoji selection. Images are
  retained in the ignored `test-results/` folder from the most recent browser run.
- Printing tests mock the native dialog while checking one invocation per action,
  iframe cleanup, the standalone path, and hidden drawings/controls in print media.
- Difficulty search took about 487 ms for a 41?41 grid in a local Node measurement;
  the integrated UI runs it in a cancellable worker to avoid blocking interaction.
- Updated README, removed unused extraction/animation code and duplicate manifest,
  and added CI gates for pull requests and deployment builds.

The first sandboxed browser run reported all 16 then-existing cases passing but
hung during process cleanup. It was stopped and rerun with normal process
permissions; subsequent 20-case root and subpath runs exited successfully.
The build reports an existing non-blocking Browserslist dataset-age warning.

## Release checks outside this environment

Physical iOS/Android installation, native share sheets, and actual printer dialogs
were not exercised. These remain manual release checks, not claims inferred from
browser emulation. Solver UI, hints, win detection, and drawing persistence were
explicitly outside the stabilization scope.

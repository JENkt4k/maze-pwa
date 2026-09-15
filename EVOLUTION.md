# InfiMaze evolution record

This record summarizes product evolution from Git history. Dates are commit dates. Model/tool labels are included only where repository names or the project session establish them; they are not inferred from code quality.

## Model and tooling interpretation

| Period | Recorded model/tool context | Relative maturity |
| --- | --- | --- |
| September 2–16, 2025 | Exact OpenAI model and development environment not recorded | Conventional iterative development is visible in small commits, manual regressions, and later repair commits. Do not assign a model retroactively. |
| September 10, 2026 stabilization | “astra-upgrade” is recorded in branch/commit history; Codex agent coordination and automated repository/browser tools are documented | Repository-wide analysis, parallel file ownership, TypeScript/build checks, and desktop/mobile browser automation became part of completion. “Astra” is a project-recorded model label, not a public product-version claim. |
| September 10–15, 2026 feature program | User/session record identifies **Sol 5.6 with Codex** for much of this work; exact handoff date from Astra is not encoded in Git | Feature branches, pull requests, worker isolation, deterministic tests, browser traces, mobile screenshots, and iterative CI repair supported rapid independent milestones. |
| September 15, 2026 documentation baseline | **GPT-6 Codex**, current session metadata | The agent can inspect the full repository history, operate Git/GitHub and browsers, generate maintained artifacts, and connect decisions, tests, screenshots, and roadmap state in one workflow. |

Historical accuracy note: [OpenAI introduced GPT-4 on March 14, 2023](https://openai.com/index/gpt-4-research/), so “August 18, 2022 — GPT-4” cannot be used as a factual model entry. In August 2022, contemporary OpenAI tooling included earlier GPT-3/Codex-era APIs, without the present repository-aware Codex agent workflow.

## Dated product history

### September 2, 2025 — Foundation, print, PWA, and responsive controls

The first working generator established the React/Vite application, printing, icons, early offline installation, GitHub Actions deployment, mobile layout, and hide/minimize controls. The purpose was a usable printable maze that worked on desktop and phone before expanding the algorithm model.

**Model/tools:** not recorded. The commit pattern reflects hands-on incremental development and manual visual checks.

### September 3–6, 2025 — Drawing, markers, and first animation

Freehand drawing and its toolbar were added, emoji selection matured, and a path animation went through several rendering and alignment revisions. The work separated overlays sufficiently to preserve drawing and printing and fixed reference/timer behavior.

**Reasoning:** solving annotations and visual motion must share the maze coordinate system without contaminating printable output.

**Model/tools:** not recorded; regression-fix commits indicate limited automated guardrails compared with the later agentic phase.

### September 8–16, 2025 — Mobile repair, persistence, branding, and control refinement

The maze cutoff found by tester Isla was corrected, settings became persistent, animation controls expanded, mobile layout was cleaned up, and the product name settled on InfiMaze. Screenshots and README material were added.

**Reasoning:** preserve a stable usable core and a recognizable product identity before deeper algorithms.

**Model/tools:** not recorded.

### September 10, 2026 — Repository stabilization and algorithm architecture

The `astra-upgrade` program repaired marker injection, malformed links, storage, animation, drawing, printing, statistics inflation, difficulty calculation, and worker isolation while preserving seeded layouts. CI expanded to unit, component, production, root/subpath, offline, desktop, and mobile checks. A graph abstraction and pluggable DFS/BFS/Dijkstra/A* solver playback followed, then a unified generation-before-solution timeline.

Selectable DFS, Prim, and Kruskal generation, shaped masks, named controls, and closed boundaries were delivered the same day.

**Reasoning:** security, deterministic compatibility, and a tested graph contract were prerequisites for safe feature expansion. Generation and solving were separated because they answer different questions.

**Model/tools:** Astra label recorded for stabilization; Sol 5.6 + Codex recorded during the subsequent feature program. Codex repository tools, agents, browser automation, and CI were materially more capable than the 2025 workflow.

### September 11, 2026 — Custom silhouettes, endpoints, curved rendering, and gameplay

Raster silhouette import allowed user-defined maze shapes. Editable endpoints added direct and automatic placement. Classic, rounded, and organic wall styles addressed the requested curved aesthetic. Interactive gameplay added legal movement, timer repair, breadcrumbs, persistence, and mobile input.

**Reasoning:** these features turned a generator into both a design tool and a playable application while keeping reachability and print behavior deterministic.

**Model/tools:** Sol 5.6 + Codex (session-reported period); feature branches and targeted browser regressions.

### September 11–12, 2026 — Freeform topology and Micromouse foundation

Freeform Voronoi-region mazes generalized the graph beyond square cells. Micromouse then used the grid implementation for sensed walls, flood-fill exploration, return, speed-run phases, and deterministic simplified physics. Local play history and branded PWA icons followed.

**Reasoning:** the generalized graph supported organic human mazes, while physical Micromouse assumptions remained explicitly grid-only.

**Model/tools:** Sol 5.6 + Codex; deterministic engine tests plus scoped desktop/mobile controls.

### September 12, 2026 — Rankings and Difficulty 2.0

Local per-maze leaderboards arrived. Difficulty 2.0 progressed from analysis foundation to composite score, advanced deception/trap metrics, a worker-based maximum search, and Wilson generation.

**Reasoning:** rankings needed stable maze identity and complete attempt records; difficulty needed explainable structural inputs and bounded background work.

**Model/tools:** Sol 5.6 + Codex; worker execution, regression fixtures, and PR gates.

### September 13, 2026 — Adversarial difficulty, Giant mode, gameplay assistance, and competition formats

Difficulty-aware braiding selected openings that improve the score, Giant mode added pan/zoom and larger dimensions, and the optional hosted leaderboard client contract was stubbed without committing to infrastructure. Gameplay hints and completion results, deterministic challenge links, full/half-size Micromouse formats, robot profiles, and true center-goal zones expanded play and simulation.

**Reasoning:** expensive calculations moved away from routine input; hosted cost remained opt-in and deferred; physical dimensions were made explicit instead of treating cells as arbitrary pixels.

**Model/tools:** Sol 5.6 + Codex; worker profiling, URL contracts, and mobile browser validation.

### September 14, 2026 — Benchmarking, realism, collections, access, and performance

Micromouse gained Trémaux and Right-Wall strategies, same-maze comparison, batch seeds, CSV/JSON export, sensor noise/range, collisions, corrections, diagonal speed runs, and traction constraints. Gameplay gained Quit. Collections added folders, tags, backup, and printable packs.

Controls were reorganized into Build/Play/Robot/Analyze/Library pages. Robot settings and maze sizing became staged to stop accidental mobile slider touches from triggering costly work. Accessibility, benchmark share links, side-by-side solvers, multi-seed solver analysis, color-blind palettes, cohesive themes, and large-maze profiling completed the day. PWA release behavior was hardened.

**Reasoning:** this phase separated lightweight visual updates from explicitly initiated heavy calculations, reduced scrolling load, and made results portable and comparable.

**Model/tools:** Sol 5.6 + Codex; mature feature-branch/PR workflow, workers, performance metrics, automated accessibility assertions, Playwright traces, and CI repair.

### September 15, 2026 — Serverless competition and durable local ownership

WebRTC rooms introduced manual offer/answer signaling, multi-peer host-centered standings, replay validation, and local replication without accounts or hosted room storage. QR codes, compressed signaling, automatic host-maze loading, mobile offer/answer scanning, explicit two-step instructions, network diagnostics, and recovery actions refined physical-device use. Public STUN performs discovery; no TURN relay is funded or required by the app.

Full-app backup and restore then protected all local InfiMaze records from browser clearing or device migration. The feature manual, completion catalog, screenshot baseline, documentation index, and this evolution record consolidated the product.

Competition session management then added named rooms and stable participant identities to the manual signaling envelope. Connected devices show who is present instead of only a channel count, while older connection codes remain readable with fallback labels.

Room identity, role, and player name became recoverable after refresh. Hosts can resume the same local room, remove a connected participant, and issue fresh offers; guests receive explicit reconnection instructions while all devices retain replicated standings.

**Reasoning:** serverless competition trades a two-way manual handshake and imperfect NAT reachability for zero hosted cost and local data ownership. Full backup closes the main risk of that local-first architecture.

**Model/tools:** GPT-6 Codex for the current documentation session; Git/GitHub automation, deterministic browser capture, local PWA execution, and repository-wide cross-referencing.

## Evolution themes

1. **Printable generator → playable system.** Drawing, endpoints, gameplay, history, and challenges added a human loop.
2. **Grid algorithm → generalized graph.** Freeform geometry, solvers, difficulty, and analysis share graph contracts while physical Micromouse stays grid-specific.
3. **Immediate recalculation → staged work.** Workers and Apply buttons protect mobile responsiveness.
4. **Single-device storage → portable local ownership.** Collections, exports, challenge URLs, room replication, and full backup move data without requiring accounts.
5. **Visual experimentation → accessible system.** Themes, palettes, focus behavior, touch targets, print boundaries, and current screenshots provide a maintained presentation baseline.

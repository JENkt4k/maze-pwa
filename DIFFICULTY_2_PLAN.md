# InfiMaze Difficulty 2.0 — Agent Implementation Plan

## Implementation status

- **Phase 1 — Analysis foundation:** implemented and validated on
  `feature/difficulty-v2-analysis`; merged.
- **Phase 2 — Composite score:** implemented and validated on
  `feature/difficulty-v2-score`; pending merge.
- **Phases 3–7:** backlog.

> **Purpose:** Implementation specification for Codex / coding agents working on `JENkt4k/maze-pwa` (InfiMaze).
>
> **Primary goal:** Replace the current coarse difficulty heuristic with a human-oriented difficulty model while preserving determinism, solvability, existing saved/shared mazes, and current generation behavior unless a task explicitly changes it.
>
> **Do not treat this as a greenfield rewrite.** Make incremental, testable changes.

---

## 0. Non-Negotiable Constraints

Agents MUST preserve the following unless a task explicitly says otherwise:

1. **Seed determinism**
   - Same generation inputs must continue to produce the same maze topology.
   - Difficulty analysis must not consume or perturb generator RNG state.
   - New analysis functions should be pure and deterministic.

2. **Backward compatibility**
   - Existing saved/shared mazes must remain loadable.
   - Existing URL/share parameters must remain valid.
   - Do not silently reinterpret old settings.
   - Keep the current difficulty score available during migration as `legacyDifficulty` or equivalent.

3. **Solvability**
   - Every generated maze must contain at least one valid path from start to goal.
   - Perfect-maze generators must remain connected spanning trees before braiding.
   - Braiding may add edges but must never remove the known solution.
   - BFS verification must be available as an independent post-generation check.

4. **Mask correctness**
   - Only active mask cells participate in graph metrics.
   - Start and goal must be active/reachable cells after snapping.
   - Disconnected mask regions must not corrupt counts or normalization.

5. **Performance**
   - Difficulty analysis runs in a Web Worker when invoked repeatedly by optimization/search.
   - Normal one-maze analysis must remain effectively instant for UI sizes.
   - Search must be cancellable.

6. **No regression of current features**
   - DFS, Prim, and Kruskal generation.
   - `g` goal bias.
   - `b` braiding.
   - `tau` straightness preference.
   - custom masks.
   - deterministic seeds.
   - save/load/share.
   - solver animations.
   - printing.

---

## 1. Current Baseline

Current generation is centered in:

- `src/app/maze.ts`
- supporting graph/solver code under `src/maze/`

Current generator IDs:

```ts
export type GeneratorId = 'dfs' | 'prim' | 'kruskal';
```

Current difficulty statistics:

```ts
Stats = {
  L, // shortest start->goal path length
  T, // turn ratio on shortest path
  J, // active cells degree >= 3
  E, // active cells degree == 1
  D, // legacy heuristic
}
```

Current heuristic:

```text
D = 0.7*log2(L+1)
  + 0.8*T
  + 0.5*(J/count)
  + 0.3*(E/count)
```

This score is useful as a structural baseline but is **not a calibrated estimate of human solving difficulty**.

The key weakness is that it counts junctions/dead ends globally without measuring how costly or deceptive they are to a human solver.

---

# 2. Difficulty 2.0 Goals

Difficulty 2.0 should answer:

> “How much misleading exploration, memory, orientation, and decision burden is a human likely to experience while solving this maze visually?”

A maze should be considered harder when it has more of the following:

- long correct path,
- many decisions on the correct path,
- large wrong branches,
- deep dead ends,
- wrong branches that initially appear promising,
- correct moves that initially move away from the goal,
- repeated visually similar neighborhoods,
- loops that cause re-entry / orientation ambiguity,
- many plausible alternatives at decision points,
- misleading paths close to the goal.

Raw size alone must **not** dominate the score.

A well-designed 31×31 maze should be capable of scoring harder than a weak 41×41 maze.

---

# 3. New Analysis Data Model

Create a new analysis model rather than overloading the old `Stats` object immediately.

Suggested shape:

```ts
export interface LegacyDifficultyStats {
  L: number;
  T: number;
  J: number;
  E: number;
  D: number;
}

export interface Difficulty2RawMetrics {
  activeCells: number;
  shortestPathLength: number;
  shortestPathTurns: number;
  shortestPathTurnRate: number;

  solutionJunctionCount: number;
  solutionDecisionCount: number;

  wrongBranchCellBurden: number;
  wrongBranchWeightedBurden: number;
  maxWrongBranchDepth: number;
  meanWrongBranchDepth: number;
  deepTrapScore: number;

  decisionEntropy: number;
  weightedDecisionEntropy: number;

  goalDeceptionRate: number;
  goalDeceptionMagnitude: number;
  nearGoalFalseHopeScore: number;

  cycleCount: number;
  cycleRank: number;
  loopAmbiguityScore: number;

  repeatedPatternScore: number;
  localSimilarityScore: number;

  graphDiameter: number;
  startGoalDiameterRatio: number;
}

export interface Difficulty2NormalizedMetrics {
  path: number;
  turns: number;
  solutionJunctions: number;
  branchBurden: number;
  traps: number;
  entropy: number;
  goalDeception: number;
  falseHope: number;
  loops: number;
  repetition: number;
}

export interface Difficulty2Result {
  version: 2;
  raw: Difficulty2RawMetrics;
  normalized: Difficulty2NormalizedMetrics;
  score: number;       // recommended 0..100
  percentile?: number; // optional, only after calibration dataset exists
  label: DifficultyLabel;
}

export type DifficultyLabel =
  | 'Easy'
  | 'Moderate'
  | 'Challenging'
  | 'Hard'
  | 'Expert'
  | 'Brutal'
  | 'Diabolical';
```

Do NOT store derived floating-point values in maze generation parameters unless needed for UI display.

---

# 4. Graph Foundations

Difficulty analysis should operate on an explicit graph representation.

For every active/reachable maze cell:

- one graph vertex,
- one graph edge per open passage.

Useful precomputed structures:

```ts
interface MazeGraphAnalysisContext {
  active: CellId[];
  adjacency: CellId[][];
  degree: Uint8Array;
  start: CellId;
  goal: CellId;

  shortestPath: CellId[];
  shortestPathSet: Set<CellId>; // or bitset / typed array
  shortestDistanceFromStart: Int32Array;
  shortestDistanceToGoal: Int32Array;
}
```

Prefer typed arrays / integer IDs over object-heavy graph structures inside repeated optimization loops.

---

# 5. Solvability Proof / Verification

## 5.1 Perfect mazes

For a perfect maze over `N` reachable active cells:

```text
V = N
E = N - 1
connected = true
```

A connected graph with `V-1` edges is a tree.

Therefore:

```text
connected + acyclic => exactly one path between every pair of cells
```

So start and goal have exactly one solution path.

## 5.2 Braided mazes

Braiding only opens additional walls.

Therefore it adds graph edges but does not delete the existing tree path.

```text
E >= V - 1
```

The maze remains solvable, though multiple solutions may exist.

## 5.3 Runtime verification

After generation and endpoint snapping:

```ts
const shortest = bfsShortestPath(graph, start, goal);
if (!shortest) {
  throw new Error('Generated maze is not solvable');
}
```

UI may optionally display:

```text
✓ Solution verified — shortest path: 437 steps
```

Do not rely only on generator correctness when running candidate mutation/adversarial search.

---

# 6. Metric 1 — Solution Path Length

Current `L` is retained.

```text
L = number of edges in BFS shortest path(start, goal)
```

Do not use raw `L` directly in the final 0..100 score because larger mazes naturally produce larger paths.

Recommended normalized form:

```text
L_n = L / reachableCellCount
```

Optionally use a saturating transform:

```text
L_s = 1 - exp(-kL * L_n)
```

or a same-size percentile once calibration data exists.

---

# 7. Metric 2 — Turns

Retain current path turn measurement.

For triples of path cells:

```text
p[i-1] -> p[i] -> p[i+1]
```

A turn occurs when direction changes.

```text
turnRate = turns / max(1, L - 1)
```

Turns contribute to local orientation burden but should receive lower weight than wrong-subtree burden and decision entropy.

---

# 8. Metric 3 — Solution-Path Junctions

Global junction count is weak.

Count junctions encountered by the solver on the shortest solution path.

```text
J_s = count(path cell v where degree(v) >= 3)
```

Also record effective decisions:

```text
k(v) = number of plausible outgoing edges excluding the cell just entered from
```

A path cell with degree 2 usually introduces no choice.

A path cell with degree 4 can introduce up to 3 choices.

---

# 9. Metric 4 — Wrong-Branch Burden

This should become one of the most important metrics.

At each decision cell on the shortest solution path:

1. identify the path edge that continues toward the goal,
2. identify all alternative outgoing edges,
3. measure the off-solution region reachable through each wrong edge before reconnecting with the solution path.

For a wrong branch/subgraph `b`:

```text
B_b = number of off-solution cells attributable to that branch
```

Total branch burden:

```text
B = Σ B_b
```

This approximates how much maze a human could explore while making locally reasonable but incorrect choices.

## 9.1 Weighted branch burden

A branch encountered late in the solution or near the goal may be more frustrating.

Optional weighting:

```text
positionWeight(j) = 1 + alpha * (pathIndex(j) / L)
```

Then:

```text
B_w = Σ positionWeight(j) * B_j
```

Start with `alpha = 0.5` behind a constant.

Do not hard-code calibration assumptions into graph traversal code.

---

# 10. Metric 5 — Deep Trap Score

A one-cell dead end is much less costly than a 50-cell wrong corridor.

For each wrong branch:

```text
d_b = maximum graph distance from branch entry to an off-solution terminal / deepest point
```

Record:

```text
maxWrongBranchDepth
meanWrongBranchDepth
```

Recommended nonlinear trap score:

```text
DeepTrap = Σ d_b^p
```

Initial exponent:

```text
p = 1.3
```

This intentionally penalizes a few deep traps more than many trivial one-cell traps.

Keep `p` configurable.

---

# 11. Metric 6 — Decision Entropy

At every actual solution decision point:

```text
k_j = number of plausible exits
```

Basic entropy proxy:

```text
H = Σ log2(k_j)
```

Examples:

```text
2 choices -> 1 bit
3 choices -> 1.585 bits
4 choices -> 2 bits
```

## 11.1 Burden-weighted entropy

Prefer this for human difficulty scoring:

```text
H* = Σ log2(k_j) * (1 + log(1 + B_j))
```

where `B_j` is the total wrong-branch burden available at that junction.

This distinguishes:

- a 3-way junction with two one-cell dead ends,
- a 3-way junction with two 80-cell deceptive branches.

They should not score equally.

---

# 12. Metric 7 — Goal-Direction Deception

Humans often use geometric proximity to the visible goal.

For each shortest-path move:

```text
Δ_i = distGeom(next, goal) - distGeom(current, goal)
```

Use Manhattan distance for rectangular grids unless a future topology requires another metric.

Interpretation:

```text
Δ < 0 : move geometrically toward goal
Δ = 0 : neutral
Δ > 0 : correct move temporarily moves away from goal
```

Measure:

```text
goalDeceptionRate = count(Δ_i > 0) / L
```

and magnitude:

```text
goalDeceptionMagnitude = Σ max(0, Δ_i)
```

Normalize magnitude by path length or maze dimensions.

This directly rewards mazes where the correct route initially appears wrong.

---

# 13. Metric 8 — Near-Goal False Hope

Wrong paths that get visually close to the goal and then fail are especially deceptive.

For every off-solution cell / wrong branch, track minimum geometric distance to goal:

```text
m_b = min geomDistance(cell, goal) over branch b
```

Branches with small `m_b` but no valid continuation to goal receive false-hope credit.

One possible score:

```text
F_b = branchSizeWeight(B_b) / (1 + m_b)
```

Then:

```text
FalseHope = Σ F_b
```

A more aggressive future version may include:

```text
F_b *= deepestProgressTowardGoalBeforeRetreat
```

Keep initial implementation simple and testable.

---

# 14. Metric 9 — Cycles and Loop Ambiguity

For a connected graph:

```text
cycleRank = E - V + 1
```

For a perfect maze:

```text
cycleRank = 0
```

Braiding increases cycle rank.

Raw cycle count is not automatically equal to difficulty.

A loop is useful for difficulty when it:

- reconnects distant graph regions,
- returns the solver near an earlier location,
- creates multiple locally plausible routes,
- causes orientation ambiguity,
- creates alternate near-shortest routes.

Initial metric:

```text
loopDensity = cycleRank / reachableCellCount
```

Difficulty 2.0 should record loop density immediately, but `loopAmbiguityScore` may begin conservative until adversarial braiding is implemented.

---

# 15. Metric 10 — Repeated Local Patterns / Perceptual Aliasing

Humans solve visually, not from internal cell IDs.

Repeated neighborhoods can cause orientation errors.

Create a local structural signature for each active cell.

Start with radius 1 / 3×3 neighborhood.

Possible signature inputs:

- local active/inactive mask,
- open walls,
- local degree pattern,
- orientation-normalized or orientation-sensitive variant.

Example conceptual signature:

```text
center openings + neighbor openings + mask occupancy
```

Compute frequency distribution of signatures.

Possible repetition score:

```text
R = Σ max(0, frequency(signature) - 1)
```

Better normalized variant:

```text
R_n = repeatedCells / activeCells
```

Later add radius-2 / 5×5 signatures if performance permits.

Do NOT make this a large weight until validated against human results.

---

# 16. Graph Diameter

Compute approximate or exact graph diameter.

For current max UI sizes, exact diameter is feasible for trees and still tractable for braided graphs, but avoid `O(V^2)` all-pairs BFS in candidate search.

Preferred:

### Perfect maze/tree

Use two BFS passes:

```text
A = farthest(start arbitrary)
B = farthest(A)
diameter = dist(A, B)
```

This is exact for trees.

### Braided graph

Use the same two-sweep value initially as an approximation unless exact diameter becomes necessary.

Record:

```text
startGoalDiameterRatio = L / max(1, diameter)
```

This measures how much of the graph's navigational extent the chosen start/goal pair actually uses.

---

# 17. Difficulty 2.0 Composite Score

Do not present raw additive units directly to users.

Build normalized metrics first.

Conceptual model:

```text
D_h = wL * L_n
    + wT * T_n
    + wJ * J_n
    + wB * B_n
    + wTrap * Trap_n
    + wH * H_n
    + wG * Goal_n
    + wF * FalseHope_n
    + wC * Cycle_n
    + wR * Repetition_n
```

Recommended initial relative importance:

```text
wrong branch burden      HIGH
weighted decision entropy HIGH
path length               HIGH
trap depth                MEDIUM-HIGH
goal deception            MEDIUM-HIGH
solution junctions        MEDIUM
false hope                MEDIUM
turns                     LOW-MEDIUM
loops                     LOW-MEDIUM initially
repetition                LOW initially
```

Example initial weights after normalization to `0..1`:

```ts
const DEFAULT_DIFFICULTY_WEIGHTS = {
  path: 0.16,
  turns: 0.06,
  solutionJunctions: 0.10,
  branchBurden: 0.20,
  traps: 0.12,
  entropy: 0.16,
  goalDeception: 0.10,
  falseHope: 0.05,
  loops: 0.03,
  repetition: 0.02,
} as const;
```

Weights sum to `1.0`.

These are **engineering defaults, not scientific calibration**.

Keep them centralized and easy to tune.

Final display score:

```text
score = round(100 * weightedNormalizedScore)
```

Clamp to `0..100`.

---

# 18. Normalization

Avoid cross-size bias.

Initial implementation should use deterministic analytic normalization where practical.

Examples:

```text
path = clamp(L / activeCells * scaleL, 0, 1)
branchBurden = clamp(B / activeCells * scaleB, 0, 1)
trap = clamp(maxDepth / sqrt(activeCells) * scaleTrap, 0, 1)
solutionJunctions = clamp(J_s / max(1, L) * scaleJ, 0, 1)
```

For unbounded metrics such as entropy, use a saturating transform:

```text
norm(x, k) = 1 - exp(-x / k)
```

Do not scatter normalization constants throughout the code.

Create one versioned config:

```ts
export const DIFFICULTY_V2_CONFIG = {
  weights: {...},
  normalization: {...},
  trapExponent: 1.3,
  version: 2,
};
```

---

# 19. Difficulty Labels

Until percentile calibration exists, labels should map to score bands, not claim population percentiles.

Initial display mapping:

```text
0–19   Easy
20–34  Moderate
35–49  Challenging
50–64  Hard
65–79  Expert
80–94  Brutal
95–100 Diabolical
```

If/when a large benchmark corpus exists, add percentile separately.

Do not call a deterministic score band a percentile.

---

# 20. `Max Difficulty` Search — Version 2

Current search explores a bounded parameter grid.

Difficulty 2.0 should evolve this into candidate search.

## Phase A — parameter/seed search

Generate many independent candidates and retain the best score.

Pseudo-code:

```ts
best = currentMaze;

for candidateIndex in 0..<budget {
  params = deriveCandidateParams(baseParams, candidateIndex);
  maze = createMaze(params);
  analysis = analyzeDifficultyV2(maze);

  if (analysis.score > best.score) {
    best = { maze, params, analysis };
  }

  if (cancelled()) break;
}
```

Requirements:

- deterministic candidate derivation from base seed when deterministic mode is requested,
- cancellable worker,
- progress callbacks,
- preserve dimensions/mask unless explicitly allowed,
- never return a lower score than the starting maze.

Suggested budgets:

```text
Quick:    250 candidates
Standard: 1,000 candidates
Deep:     10,000 candidates
```

Do not expose 10,000 as default on weak/mobile hardware without benchmarking.

---

# 21. Evolutionary Search — Later Phase

Once Difficulty 2.0 metrics are stable:

```text
generate population
score population
retain top 5–10%
mutate candidates
re-score
repeat
```

Candidate mutations may include:

- seed perturbation,
- `g` adjustment,
- `tau` adjustment,
- braid probability adjustment,
- generator change,
- endpoint strategy variation,
- targeted braid edge mutation.

Do NOT mutate walls arbitrarily without connectivity/solvability checks.

---

# 22. Adversarial Braiding

Current braiding is stochastic at dead ends.

Difficulty-oriented braiding should evaluate candidate added edges.

Prefer braid edges that increase one or more of:

- alternate near-shortest routes,
- loop ambiguity,
- goal-direction deception,
- false hope,
- branch reconnection distance,
- revisit potential.

Reject or de-prioritize braid edges that merely eliminate a useful deep trap without replacing it with meaningful ambiguity.

Possible scoring:

```text
braidGain(edge) = D_v2(after adding edge) - D_v2(before)
```

For small mazes, brute-force evaluating candidate braid edges may be acceptable.

For larger search budgets, use local heuristics first and full re-score only top candidates.

---

# 23. Add Wilson Generator

Add:

```ts
export type GeneratorId = 'dfs' | 'prim' | 'kruskal' | 'wilson';
```

Wilson's algorithm provides an approximately unbiased / uniform spanning-tree baseline and is valuable because the current algorithms have strong structural biases.

Implementation requirements:

- seeded RNG only,
- mask-aware,
- deterministic,
- connected spanning tree over reachable active cells,
- same endpoint handling pipeline,
- same braiding pipeline after tree generation,
- generator-specific tests.

Later possible additions:

- Aldous–Broder,
- Hunt-and-Kill,
- Recursive Division.

Do not add multiple algorithms in the first Difficulty 2.0 PR unless scope remains small.

---

# 24. Display / Maze Size Limits

Current UI limit of roughly `41×41` is reasonable for single-screen phone viewing.

Approximate cell width:

```text
cellPx ~= viewportWidth / mazeWidth
```

At ~390 px mobile width:

```text
21 -> 18.6 px
31 -> 12.6 px
41 ->  9.5 px
51 ->  7.6 px
61 ->  6.4 px
81 ->  4.8 px
101 -> 3.9 px
```

Guidance:

```text
~24 px  comfortable interaction
~16 px  usable
10–12 px visually solvable
6–8 px   difficult / dense
<5 px    mostly texture without zoom
```

Do not increase normal single-screen max merely to claim higher difficulty.

Difficulty should come from structure, not tiny rendering.

---

# 25. Giant Maze Mode

Backend currently supports larger dimensions than standard UI.

Introduce separately:

```text
Standard mode: 7–41
Giant mode:    43–101
```

Giant mode requirements:

- pan,
- pinch/wheel zoom,
- fit-to-view,
- reset zoom,
- maintain crisp grid rendering,
- avoid accidentally drawing while panning,
- preserve touch usability.

Giant mode should not block Difficulty 2.0 core work.

---

# 26. Suggested File Organization

Do not keep expanding `src/app/maze.ts` indefinitely.

Recommended extraction:

```text
src/maze/difficulty/
  types.ts
  legacy.ts
  graphAnalysis.ts
  shortestPath.ts
  branches.ts
  entropy.ts
  deception.ts
  loops.ts
  repetition.ts
  normalize.ts
  scoreV2.ts
  config.ts
  index.ts

src/maze/generators/
  dfs.ts
  prim.ts
  kruskal.ts
  wilson.ts      // later phase

src/workers/
  difficultySearch.worker.ts
```

Exact naming may follow existing project conventions.

Avoid circular dependencies between generator code and difficulty analysis.

Difficulty code must consume a maze/graph; generation must not depend on Difficulty 2.0 except in optimizer/search modules.

---

# 27. Testing Strategy

## 27.1 Determinism tests

For fixed params + seed:

```ts
expect(createMaze(params)).toEqual(createMaze(params));
```

Difficulty analysis:

```ts
expect(analyzeDifficultyV2(maze)).toEqual(analyzeDifficultyV2(maze));
```

Difficulty analysis must not mutate maze state.

---

## 27.2 Solvability tests

For every generator and representative mask:

```ts
expect(bfsShortestPath(maze, start, goal)).not.toBeNull();
```

Run across many deterministic seeds.

For unbraided perfect mazes:

```text
edges == vertices - 1
connected == true
```

For braided mazes:

```text
edges >= vertices - 1
connected == true
```

---

## 27.3 Metric ordering tests

Construct synthetic graphs where difficulty relationships are obvious.

### Deep trap

Maze B is identical to Maze A except one wrong branch is much deeper.

Expected:

```ts
expect(B.deepTrapScore).toBeGreaterThan(A.deepTrapScore);
expect(B.score).toBeGreaterThan(A.score);
```

### Branch burden

Same solution path, but B has larger wrong subtrees.

```ts
expect(B.wrongBranchCellBurden)
  .toBeGreaterThan(A.wrongBranchCellBurden);
```

### Decision entropy

Same path length, B has more plausible alternatives at solution junctions.

```ts
expect(B.weightedDecisionEntropy)
  .toBeGreaterThan(A.weightedDecisionEntropy);
```

### Goal deception

B requires more correct moves away from the visible goal.

```ts
expect(B.goalDeceptionRate)
  .toBeGreaterThan(A.goalDeceptionRate);
```

### Size independence

A smaller structurally adversarial maze must be allowed to outrank a larger trivial one.

Do NOT write a test requiring all larger mazes to score higher.

---

## 27.4 Regression tests

Snapshot/hash representative generated mazes before refactors.

At minimum:

- DFS fixed seed,
- Prim fixed seed,
- Kruskal fixed seed,
- one masked maze,
- one braided maze,
- one custom endpoint maze.

Refactoring analysis code must not alter these topologies.

---

# 28. Performance Tests

Target scale:

```text
41×41 = <= 1681 cells before masking
101×101 = <= 10201 cells before masking
```

Difficulty analysis should generally be near-linear or `O(V + E)` per metric.

Avoid all-pairs shortest paths.

Performance goals on desktop-class hardware:

```text
41×41 single analysis: imperceptible UI delay
101×101 single analysis: comfortably interactive
1,000-candidate search: worker only, progressive feedback
```

Record benchmark numbers before setting strict CI thresholds.

CI performance assertions should use generous ceilings to avoid flaky tests.

---

# 29. Worker Search Contract

Suggested worker messages:

```ts
type DifficultySearchRequest = {
  type: 'search';
  requestId: string;
  baseParams: MazeParams;
  budget: number;
  scoreVersion: 2;
};

type DifficultySearchProgress = {
  type: 'progress';
  requestId: string;
  completed: number;
  total: number;
  bestScore: number;
  bestParams: MazeParams;
};

type DifficultySearchResult = {
  type: 'result';
  requestId: string;
  bestParams: MazeParams;
  analysis: Difficulty2Result;
};

type DifficultySearchCancel = {
  type: 'cancel';
  requestId: string;
};
```

Ignore stale worker results by `requestId`.

---

# 30. UI Changes

Initial UI should show both scores during development/debugging if useful:

```text
Difficulty: 72 / 100 — Expert
Legacy score: 4.831
```

Production can later hide legacy score.

Optional expandable metrics:

```text
Solution path      611 steps
Decision points     47
Wrong-path burden  803 cells
Deepest trap        54 cells
Goal deception      22%
Loop rank            8
```

Avoid presenting uncalibrated mathematical components as scientifically validated psychology.

Use wording such as:

```text
Estimated maze difficulty
```

not:

```text
Human difficulty probability
```

---

# 31. Save / Share Compatibility

Do not require storing the Difficulty 2.0 score in share URLs.

The score should normally be recomputed from maze topology/settings.

If a saved maze stores analysis, version it:

```ts
analysis?: {
  version: 2;
  result: Difficulty2Result;
}
```

Treat cached analysis as disposable.

On version mismatch:

```text
recompute, do not fail load
```

---

# 32. Implementation Phases

## Phase 1 — Analysis foundation

Implement:

- graph context,
- shortest-path extraction,
- solution-path junction count,
- wrong-branch burden,
- deep-trap depth,
- decision entropy,
- goal-direction deception,
- tests.

Do NOT change generation output.

**Definition of done:** Existing maze generation tests pass unchanged; new Difficulty 2 metrics are deterministic and tested.

---

## Phase 2 — Composite score

Implement:

- normalization config,
- score weights,
- 0..100 Difficulty 2 score,
- labels,
- UI display,
- legacy score retained.

**Definition of done:** Current mazes show V2 score without changing topology or share compatibility.

---

## Phase 3 — Additional visual/graph metrics

Implement:

- false-hope score,
- cycle rank / loop metrics,
- repeated local pattern metric,
- graph diameter ratio.

Keep weights conservative.

**Definition of done:** Metrics have synthetic ordering tests and no major performance regression.

---

## Phase 4 — Max Difficulty V2

Replace/augment bounded grid search with candidate search optimized on V2.

Implement:

- worker budget,
- progress,
- cancellation,
- best-so-far behavior,
- deterministic candidate derivation.

**Definition of done:** Search never returns a lower V2 score than starting maze and does not block UI.

---

## Phase 5 — Wilson generator

Implement deterministic masked Wilson generation.

**Definition of done:** Wilson passes connectivity/tree/determinism tests and is selectable in UI.

---

## Phase 6 — Adversarial braiding

Add topology-aware braid selection.

**Definition of done:** Difficulty-oriented braid mode can measurably improve V2 score over random braiding on a benchmark corpus without breaking solvability.

---

## Phase 7 — Giant mode

Add 43–101 display mode with pan/zoom.

Treat separately from scoring.

---

# 33. Recommended First PR

Keep the first PR intentionally narrow.

### Add

```text
src/maze/difficulty/types.ts
src/maze/difficulty/graphAnalysis.ts
src/maze/difficulty/branches.ts
src/maze/difficulty/entropy.ts
src/maze/difficulty/deception.ts
src/maze/difficulty/scoreV2.ts
src/maze/difficulty/config.ts
src/maze/difficulty/index.ts
```

### Implement only

- shortest path length,
- turn rate,
- solution-path junction count,
- wrong-branch burden,
- deep-trap score,
- decision entropy,
- goal-deception rate/magnitude,
- provisional composite score.

### Do not yet

- add Wilson,
- alter generator RNG,
- alter braiding,
- add giant mode,
- remove legacy score,
- redesign save format,
- claim calibrated percentiles.

This makes code review much easier and minimizes regression risk.

---

# 34. Agent Execution Checklist

Before modifying code:

- [ ] Read current `src/app/maze.ts` completely.
- [ ] Read graph and solver helpers under `src/maze/`.
- [ ] Locate existing tests for generation, difficulty, workers, save/share.
- [ ] Identify current `Stats` consumers before changing types.
- [ ] Record current test baseline.

During implementation:

- [ ] Keep difficulty analysis pure.
- [ ] Do not consume generator RNG.
- [ ] Use active/reachable mask cells only.
- [ ] Reuse BFS data instead of recomputing when possible.
- [ ] Keep analysis asymptotically near `O(V + E)`.
- [ ] Keep constants in versioned config.
- [ ] Add synthetic metric tests.

Before finalizing:

- [ ] Run full test suite.
- [ ] Confirm representative seeds produce unchanged mazes.
- [ ] Confirm save/load/share regression tests.
- [ ] Confirm custom masks.
- [ ] Confirm braiding.
- [ ] Confirm worker cancellation if touched.
- [ ] Document any deliberately changed behavior.

---

# 35. Critical Anti-Regression Rules for Coding Agents

1. **Do not “simplify” formulas by removing metrics.**
2. **Do not replace deterministic seeded RNG with `Math.random()`.**
3. **Do not alter generator call order merely to support analysis.**
4. **Do not mutate maze topology during analysis.**
5. **Do not make maze size the dominant difficulty variable.**
6. **Do not count masked/inactive cells.**
7. **Do not assume braided mazes have one unique solution.**
8. **Do not claim Difficulty 2.0 is human-calibrated until actual human solve data exists.**
9. **Do not remove the legacy score until saved/share/UI compatibility has been verified across versions.**
10. **Do not add algorithmic complexity that makes 1,000+ candidate search impractical without profiling.**

---

# 36. Future Human Calibration

Once enough people solve mazes, collect anonymized aggregate data such as:

```text
maze topology/settings hash
maze dimensions
Difficulty 2 raw metrics
completion time
completion success/failure
wrong-path distance traveled
backtracks
hint usage
input mode
viewport class
```

Do not collect unnecessary identifying data.

Then fit weights against observed outcomes.

Possible targets:

```text
log(completionTime)
probabilityOfCompletion
wrongDistance / solutionDistance
numberOfBacktracks
```

At that point, score labels can be empirically calibrated and percentile ranks can be added.

Until then, Difficulty 2.0 is a deterministic structural human-difficulty heuristic.

---

# 37. Final Design Principle

The core change is conceptual:

```text
OLD:
Difficulty ≈ path length + turns + total junctions + total dead ends
```

```text
NEW:
Difficulty ≈
  how long the correct path is
+ how often the solver must decide
+ how expensive wrong decisions are
+ how convincing wrong decisions look
+ how often correct movement feels geometrically wrong
+ how difficult it is to maintain orientation
```

The objective is **not to generate the largest maze**.

The objective is to generate the **most cognitively adversarial maze that remains visually usable and provably solvable**.


# 📐 Maze Generation Algorithm

Infimaze uses a graph-based recursive backtracker algorithm with tunable parameters to control the character of the maze.

### 🔧 Core idea

1. Grid setup
The maze is an H × W grid of cells. Each cell starts with walls on all four sides.

2. Depth-first search (DFS)
Starting from the start cell, we:

    - Mark it visited.

    - Randomly choose a neighboring unvisited cell.

    - Knock down the wall between current and neighbor.

    - Recursively continue from that neighbor.

    - If stuck, backtrack.

  ➡ This guarantees a perfect maze (exactly one path between any two points).

Parameters for flavor
To avoid every maze feeling the same, Infimaze introduces knobs:

Parameter	Meaning	Effect
g (goal bias)	Probability of preferring steps toward the goal	Higher g → straighter path, easier maze
b (braid)	Chance to remove dead-ends after generation	Higher b → fewer cul-de-sacs, more loops
τ (turn penalty)	Extra cost for sharp turns	Higher τ → longer corridors, fewer zig-zags

These are applied during neighbor selection and optional post-processing.

Markers
The top-left cell is the start; the bottom-right is the goal. Emoji or custom images can be placed here.

### ⚖️ Balancing act

#### Simplicity

Core DFS is under 50 lines of code.

Easy to teach: good for tutorials and classrooms.

#### Capabilities

Adding g, b, and τ exposes knobs for difficulty tuning.

Small parameter sweeps let us find “max difficulty” settings for any grid size.

#### Tutorial friendliness

The plain DFS version (no biases) is a classic “intro to algorithms” exercise.

Then we show how to extend it with heuristics.

#### Performance

O(N) in number of cells — even a 100×100 maze generates instantly in browser.

Bias and braid tweaks add negligible overhead.

Small enough to run interactively on mobile devices.

### 🧭 Why this approach?

✅ Deterministic if you keep the random seed → makes mazes reproducible & savable.

✅ Scales well for kids (small grids, low bias) or adults (big grids, braided).

✅ Extensible: easy to add weights, alternative start/goal positions, or even non-rectangular grids.

✅ Teachable: core algorithm is simple to visualize (stack of visited cells).
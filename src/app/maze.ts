/* Maze generator for kid-friendly mazes (TypeScript)
 * Algorithm: DFS backtracker + goal bias (g) + turn penalty (tau) + braiding (b)
 * Output: grid + SVG + difficulty stats. Deterministic with seed.
 */

export type Dir = 'N' | 'E' | 'S' | 'W';

export interface MazeParams {
  width: number;      // cells (odd preferred for symmetry)
  height: number;     // cells
  seed?: number;      // reproducible RNG seed
  g?: number;         // goal-bias [0..1], default 0.3
  b?: number;         // braid factor [0..1], default 0.15
  tau?: number;       // turn penalty [0..1], default 0.4
  start?: { x: number; y: number }; // defaults to middle-left edge
  goal?: { x: number; y: number };  // defaults to middle-right edge
}

export interface Difficulty {
  L: number;    // solution length in steps
  T: number;    // turn rate on solution path [0..1]
  J: number;    // junction count on path (deg>=3 nodes)
  E: number;    // dead ends off the path
  D: number;    // difficulty score
}

export interface Maze {
  w: number;
  h: number;
  start: { x: number; y: number };
  goal: { x: number; y: number };
  // walls: for each cell, bitmask NESW (1,2,4,8) indicating WALL presence
  walls: Uint8Array;
  // utility
  idx(x: number, y: number): number;
}

const NESW: Dir[] = ['N', 'E', 'S', 'W'];
const DX: Record<Dir, number> = { N: 0, E: 1, S: 0, W: -1 };
const DY: Record<Dir, number> = { N: -1, E: 0, S: 1, W: 0 };
const OPP: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' };
const BIT: Record<Dir, number> = { N: 1, E: 2, S: 4, W: 8 };

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

// Mulberry32 PRNG
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand(): number {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function inBounds(w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function createMaze(params: MazeParams) {
  const w = params.width | 0;
  const h = params.height | 0;
  if (w < 3 || h < 3) throw new Error('Maze must be at least 3x3');

  const g = clamp01(params.g ?? 0.30);
  const b = clamp01(params.b ?? 0.15);
  const tau = clamp01(params.tau ?? 0.40);

  const seed = (params.seed ?? 123456789) >>> 0;
  const rnd = mulberry32(seed);

  const start = params.start ?? { x: 0, y: (h / 2) | 0 };
  const goal  = params.goal  ?? { x: w - 1, y: (h / 2) | 0 };

  const walls = new Uint8Array(w * h).fill(1 | 2 | 4 | 8); // all walls
  const visited = new Uint8Array(w * h);
  const prevDir: (Dir | null)[] = Array(w * h).fill(null);

  const idx = (x: number, y: number) => y * w + x;
  const dist = (x: number, y: number) => {
    const dx = goal.x - x, dy = goal.y - y;
    return Math.hypot(dx, dy);
  };

  // carve passage between (x,y) and neighbor in direction d
  function carve(x: number, y: number, d: Dir) {
    const nx = x + DX[d], ny = y + DY[d];
    walls[idx(x, y)] &= ~BIT[d];
    if (inBounds(w, h, nx, ny)) {
      walls[idx(nx, ny)] &= ~BIT[OPP[d]];
    }
  }

  // choose next direction with weights (goal bias + straight bonus)
  function chooseDir(x: number, y: number, pd: Dir | null, dirs: Dir[]): Dir {
    const baseD = dist(x, y);
    let total = 0;
    const ws = dirs.map(d => {
      const nx = x + DX[d], ny = y + DY[d];
      let wgt = 1.0;
      const nd = dist(nx, ny);
      if (nd < baseD) wgt += g;               // goal bias
      if (pd && d === pd) wgt += tau;         // turn penalty (favor straight)
      total += wgt;
      return wgt;
    });
    let r = rnd() * total;
    for (let i = 0; i < dirs.length; i++) {
      if ((r -= ws[i]) <= 0) return dirs[i];
    }
    return dirs[dirs.length - 1];
  }

  // DFS backtracker
  const stack: Array<{ x: number; y: number }> = [];
  stack.push({ x: start.x, y: start.y });
  visited[idx(start.x, start.y)] = 1;

  while (stack.length) {
    const { x, y } = stack[stack.length - 1];

    const neighbors: Dir[] = [];
    for (const d of NESW) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!inBounds(w, h, nx, ny)) continue;
      if (!visited[idx(nx, ny)]) neighbors.push(d);
    }

    if (!neighbors.length) { stack.pop(); continue; }

    const d = chooseDir(x, y, prevDir[idx(x, y)], neighbors);
    const nx = x + DX[d], ny = y + DY[d];

    carve(x, y, d);
    visited[idx(nx, ny)] = 1;
    prevDir[idx(nx, ny)] = d;
    stack.push({ x: nx, y: ny });
  }

  // Braid pass: open some dead-ends to reduce frustration
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = idx(x, y);
    const deg = ((walls[id] & 1) === 0 ? 1 : 0)
              + ((walls[id] & 2) === 0 ? 1 : 0)
              + ((walls[id] & 4) === 0 ? 1 : 0)
              + ((walls[id] & 8) === 0 ? 1 : 0);
    if (deg === 1 && rnd() < b) {
      // pick a walled side that would connect to a corridor (not its only open neighbor)
      const closed: Dir[] = NESW.filter(d => (walls[id] & BIT[d]) !== 0)
        .filter(d => {
          const nx = x + DX[d], ny = y + DY[d];
          if (!inBounds(w, h, nx, ny)) return false;
          const nid = idx(nx, ny);
          const ndegrees =
            ((walls[nid] & 1) === 0 ? 1 : 0) +
            ((walls[nid] & 2) === 0 ? 1 : 0) +
            ((walls[nid] & 4) === 0 ? 1 : 0) +
            ((walls[nid] & 8) === 0 ? 1 : 0);
          return ndegrees >= 1; // heuristic for corridor
        });
      if (closed.length) {
        const d2 = closed[(rnd() * closed.length) | 0];
        carve(x, y, d2);
      }
    }
  }

  const maze: Maze = { w, h, walls, start, goal, idx };

  // Stats
  const stats = measureDifficulty(maze);

  return { maze, stats, rngSeed: seed };
}

// --- Difficulty measurement ---

function neighborsOpen(m: Maze, x: number, y: number): Array<{x:number;y:number;d:Dir}> {
  const id = m.idx(x,y);
  const out: Array<{x:number;y:number;d:Dir}> = [];
  for (const d of NESW) {
    if ((m.walls[id] & BIT[d]) === 0) {
      const nx = x + DX[d], ny = y + DY[d];
      if (inBounds(m.w, m.h, nx, ny)) out.push({x:nx,y:ny,d});
    }
  }
  return out;
}

export function shortestPath(m: Maze): { path: {x:number;y:number}[], dirs: Dir[] } {
  const q: Array<{x:number;y:number}> = [];
  const prev = new Int32Array(m.w * m.h).fill(-1);
  const prevDir: Uint8Array = new Uint8Array(m.w * m.h).fill(255);

  const s = m.idx(m.start.x, m.start.y);
  const g = m.idx(m.goal.x, m.goal.y);
  q.push({x:m.start.x,y:m.start.y});
  prev[s] = -2;

  for (let qi=0; qi<q.length; qi++) {
    const {x,y} = q[qi];
    if (x===m.goal.x && y===m.goal.y) break;
    for (const {x:nx,y:ny,d} of neighborsOpen(m,x,y)) {
      const nid = m.idx(nx,ny);
      if (prev[nid] !== -1) continue;
      prev[nid] = m.idx(x,y);
      prevDir[nid] = NESW.indexOf(d);
      q.push({x:nx,y:ny});
    }
  }

  if (prev[g] === -1) return { path: [], dirs: [] };

  const path: Array<{x:number;y:number}> = [];
  const dirs: Dir[] = [];
  let cur = g;
  while (cur !== -2) {
    const x = cur % m.w, y = (cur / m.w) | 0;
    path.push({x,y});
    const pd = prevDir[cur];
    if (pd !== 255) dirs.push(NESW[pd]);
    cur = prev[cur];
  }
  path.reverse();
  dirs.reverse();
  return { path, dirs };
}

export function measureDifficulty(m: Maze): Difficulty {
  const { path, dirs } = shortestPath(m);
  const L = Math.max(0, path.length - 1);
  let turns = 0;
  for (let i = 1; i < dirs.length; i++) if (dirs[i] !== dirs[i-1]) turns++;
  const T = L ? turns / L : 0;

  // Degree on path (junctions)
  let J = 0;
  for (const p of path) {
    const deg = neighborsOpen(m,p.x,p.y).length;
    if (deg >= 3) J++;
  }

  // Dead ends off the path
  const onPath = new Uint8Array(m.w * m.h);
  for (const p of path) onPath[m.idx(p.x,p.y)] = 1;
  let E = 0;
  for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
    if (onPath[m.idx(x,y)]) continue;
    const deg = neighborsOpen(m,x,y).length;
    if (deg === 1) E++;
  }

  const D = 0.7 * Math.log2(Math.max(2, L)) + 0.8 * T + 0.5 * (J / Math.max(1,L)) + 0.3 * (E / Math.max(1,L));
  return { L, T, J, E, D: +D.toFixed(3) };
}

// --- SVG renderer ---

export interface SvgOptions {
  cell: number;        // px per cell, e.g., 24
  stroke?: number;     // wall thickness (px)
  margin?: number;     // outer margin (px)
  showStartGoal?: boolean;
}

export function toSVG(m: Maze, opts: SvgOptions): string {
  const cell = opts.cell;
  const stroke = opts.stroke ?? Math.max(2, Math.round(cell/8));
  const margin = opts.margin ?? Math.round(cell/2);

  const W = m.w * cell + margin * 2;
  const H = m.h * cell + margin * 2;
  const half = stroke / 2;

  const lines: string[] = [];
  const line = (x1:number,y1:number,x2:number,y2:number) =>
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${stroke}" stroke-linecap="square"/>`);

  // Draw boundary & interior walls
  for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
    const id = m.idx(x,y);
    const px = margin + x * cell;
    const py = margin + y * cell;
    if (m.walls[id] & BIT.N) line(px+half, py+half, px+cell-half, py+half);
    if (m.walls[id] & BIT.W) line(px+half, py+half, px+half, py+cell-half);
    // draw south & east only at borders to avoid double-draw
    if (y === m.h-1 && (m.walls[id] & BIT.S)) line(px+half, py+cell-half, px+cell-half, py+cell-half);
    if (x === m.w-1 && (m.walls[id] & BIT.E)) line(px+cell-half, py+half, px+cell-half, py+cell-half);
  }

  // Start/Goal markers
  const marks: string[] = [];
  if (opts.showStartGoal !== false) {
    const sX = margin + m.start.x * cell + cell/2;
    const sY = margin + m.start.y * cell + cell/2;
    const gX = margin + m.goal.x  * cell + cell/2;
    const gY = margin + m.goal.y  * cell + cell/2;
    const r = Math.max(3, Math.round(cell*0.25));
    marks.push(`<circle cx="${sX}" cy="${sY}" r="${r}" fill="limegreen"/>`);
    marks.push(`<circle cx="${gX}" cy="${gY}" r="${r}" fill="crimson"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
  ${lines.join('\n  ')}
  ${marks.join('\n  ')}
</svg>`;
}

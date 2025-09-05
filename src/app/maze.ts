// src/maze.ts
// Pure generator + SVG renderer (no React), now with DFS steps + optional embedded animation

export type Cell = { x:number; y:number; n:number; s:number; e:number; w:number; };
export type CarveStep = { x:number; y:number; nx:number; ny:number };
export type Stats = { L:number; T:number; J:number; E:number; D:number };

export type Maze = {
  grid: Cell[][];
  start: { x:number;y:number };
  goal:  { x:number;y:number };
  stats: Stats;
  steps: CarveStep[];
};

const DIRS = [
  { dx: 1, dy: 0, a: "e" as const, b: "w" as const },
  { dx:-1, dy: 0, a: "w" as const, b: "e" as const },
  { dx: 0, dy: 1, a: "s" as const, b: "n" as const },
  { dx: 0, dy:-1, a: "n" as const, b: "s" as const },
];

function rng(seed: number) {
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMaze(params: { width:number;height:number;seed:number;g:number;b:number;tau:number }): { maze: Cell[][]; stats: Stats; steps: CarveStep[]; start:{x:number;y:number}; goal:{x:number;y:number} } {
  const { width: W, height: H, seed, g, b, tau } = params;
  const rnd = rng(seed);

  // init grid
  const grid: Cell[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => ({ x, y, n:1, s:1, e:1, w:1 }))
  );

  const inb = (x:number,y:number) => x>=0 && x<W && y>=0 && y<H;
  const stack: {x:number;y:number}[] = [];
  const steps: CarveStep[] = [];

  // DFS with simple goal bias towards bottom-right (g), braid (b), and turn penalty (tau)
  const start = { x: 0, y: Math.floor(H/2) };
  const goal  = { x: W-1, y: Math.floor(H/2) };

  const visited = new Set<string>();
  const key = (x:number,y:number)=>`${x},${y}`;
  stack.push(start);
  visited.add(key(start.x,start.y));

  while (stack.length) {
    const cur = stack[stack.length-1];
    const dirs = [...DIRS];

    // directional heuristic: push towards goal when g>0
    dirs.sort((A,B) => {
      const da = Math.abs((cur.x + A.dx) - goal.x) + Math.abs((cur.y + A.dy) - goal.y);
      const db = Math.abs((cur.x + B.dx) - goal.x) + Math.abs((cur.y + B.dy) - goal.y);
      return (da - db) * (g || 0);
    });

    // turn penalty: prefer continuing direction
    const prev = stack[stack.length-2];
    if (prev && tau > 0) {
      const vx = cur.x - prev.x, vy = cur.y - prev.y;
      dirs.sort((A,B) => {
        const ca = (A.dx === vx && A.dy === vy) ? -1 : 0;
        const cb = (B.dx === vx && B.dy === vy) ? -1 : 0;
        return (ca - cb) * (tau || 0);
      });
    }

    // random jitter
    for (let i=dirs.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1)); const t = dirs[i]; dirs[i]=dirs[j]; dirs[j]=t;
    }

    let moved = false;
    for (const d of dirs) {
      const nx = cur.x + d.dx, ny = cur.y + d.dy;
      if (!inb(nx,ny) || visited.has(key(nx,ny))) continue;

      // carve walls
      const a = grid[cur.y][cur.x], bcell = grid[ny][nx];
      (a as any)[d.a] = 0; (bcell as any)[d.b] = 0;
      steps.push({ x: cur.x, y: cur.y, nx, ny });

      stack.push({ x:nx, y:ny });
      visited.add(key(nx,ny));
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }

  // braid: remove some dead ends by knocking random walls
  if (b > 0) {
    for (let y=0;y<H;y++) for(let x=0;x<W;x++){
      const c = grid[y][x];
      const deg = (c.n?0:1)+(c.s?0:1)+(c.e?0:1)+(c.w?0:1);
      if (deg === 1 && rng(seed + x*73856093 + y*19349663)() < b) {
        const walls = [];
        if (c.n) walls.push("n"); if (c.s) walls.push("s"); if (c.e) walls.push("e"); if (c.w) walls.push("w");
        const w = walls[Math.floor(rnd()*walls.length)];
        const dx = w==="e"?1:w==="w"?-1:0;
        const dy = w==="s"?1:w==="n"?-1:0;
        const nx = x+dx, ny = y+dy;
        if (inb(nx,ny)) {
          (c as any)[w] = 0;
          (grid[ny][nx] as any)[w==="e"?"w":w==="w"?"e":w==="s"?"n":"s"] = 0;
          steps.push({ x, y, nx, ny }); // record braid carve too
        }
      }
    }
  }

  // after DFS (+ braiding) computed
  let J = 0, E = 0;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){
    const c = grid[y][x];
    const deg = (c.n?0:1) + (c.s?0:1) + (c.e?0:1) + (c.w?0:1);
    if (deg === 1) E++;
    else if (deg >= 3) J++;
  }
  const L = steps.length + 1;
  let turns = 0;
  for (let i=1;i<steps.length;i++){
    const a = steps[i-1], b2 = steps[i];
    const ax = a.nx - a.x, ay = a.ny - a.y;
    const bx = b2.nx - b2.x, by = b2.ny - b2.y;
    if (ax !== bx || ay !== by) turns++;
  }
  const T = L ? turns / L : 0;
  const D = Number(((L * (1 + T) + J*0.5 + E*0.3) / 20).toFixed(3));

  return { maze:grid, stats:{L, T, J, E, D}, steps, start, goal };
  // end of code

  // stats
  // let L = 0, turns = 0, J = 0, E = 0;
  // for (let y=0;y<H;y++) for(let x=0;x<W;x++){
  //   const c = grid[y][x];
  //   const deg = (c.n?0:1)+(c.s?0:1)+(c.e?0:1)+(c.w?0:1);
  //   if (deg===1) E++; else if (deg>=3) J++;
  // }
  // // crude approximations
  // L = steps.length + 1;
  // // estimate turns by vector changes along the DFS path
  // for (let i=1;i<steps.length;i++){
  //   const a = steps[i-1], b2 = steps[i];
  //   const ax = a.nx - a.x, ay = a.ny - a.y;
  //   const bx = b2.nx - b2.x, by = b2.ny - b2.y;
  //   if (ax !== bx || ay !== by) turns++;
  // }
  // const T = L ? turns / L : 0;
  // const D = (L * (1 + T) + J*0.5 + E*0.3) / 20; // normalized-ish

  // const stats: Stats = { L, T, J, E, D };
  // return { maze: grid, stats, steps, start, goal };
}

function isDataURL(s?: string | null) {
  return !!s && /^data:image\//.test(s);
}

export function toSVG(
  m: Cell[][],
  opts: {
    cell:number; margin:number; stroke?:number;
    showStartGoal?:boolean; startIcon?:string; goalIcon?:string; iconScale?:number;
    // DFS animation (optional)
    dfsSteps?: CarveStep[]; dfsTotalSec?: number; dfsPassageWidth?: number;
    hideWallsDuringAnim?: boolean;
  }
): string {
  const { cell, margin, stroke = 2 } = opts;
  const H = m.length, W = m[0]?.length ?? 0;
  const widthPx  = W * cell + margin * 2;
  const heightPx = H * cell + margin * 2;

  const seg = (x:number,y:number)=>`${margin + x*cell},${margin + y*cell}`;
  const cx  = (x:number)=> margin + x*cell + cell/2;
  const cy  = (y:number)=> margin + y*cell + cell/2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPx} ${heightPx}" width="${widthPx}" height="${heightPx}">`;

  // Walls (as segments)
  let walls = "";
  for (let y=0;y<H;y++) for(let x=0;x<W;x++){
    const c = m[y][x];
    if (c.n) walls += `<line x1="${margin+x*cell}" y1="${margin+y*cell}" x2="${margin+(x+1)*cell}" y2="${margin+y*cell}" stroke="#111" stroke-width="${stroke}" stroke-linecap="square"/>`;
    if (c.w) walls += `<line x1="${margin+x*cell}" y1="${margin+y*cell}" x2="${margin+x*cell}" y2="${margin+(y+1)*cell}" stroke="#111" stroke-width="${stroke}" stroke-linecap="square"/>`;
    if (y===H-1 && c.s) walls += `<line x1="${margin+x*cell}" y1="${margin+(y+1)*cell}" x2="${margin+(x+1)*cell}" y2="${margin+(y+1)*cell}" stroke="#111" stroke-width="${stroke}" stroke-linecap="square"/>`;
    if (x===W-1 && c.e) walls += `<line x1="${margin+(x+1)*cell}" y1="${margin+y*cell}" x2="${margin+(x+1)*cell}" y2="${margin+(y+1)*cell}" stroke="#111" stroke-width="${stroke}" stroke-linecap="square"/>`;
  }
  const wallsClass = opts.hideWallsDuringAnim ? `class="walls hide"` : `class="walls"`;
  svg += `<g ${wallsClass}>${walls}</g>`;

  // Start/Goal markers
  if (opts.showStartGoal !== false) {
    const sX = cx(0),      sY = cy(Math.floor(H/2));
    const gX = cx(W-1),    gY = cy(Math.floor(H/2));
    const r = Math.max(3, Math.round(cell*0.25));
    const fs = cell * (opts.iconScale ?? 0.8);

    if (isDataURL(opts.startIcon)) {
      svg += `<image href="${opts.startIcon}" x="${sX - fs/2}" y="${sY - fs/2}" width="${fs}" height="${fs}" />`;
    } else if (opts.startIcon) {
      svg += `<text x="${sX}" y="${sY}" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${opts.startIcon}</text>`;
    } else {
      svg += `<circle cx="${sX}" cy="${sY}" r="${r}" fill="limegreen"/>`;
    }

    if (isDataURL(opts.goalIcon)) {
      svg += `<image href="${opts.goalIcon}" x="${gX - fs/2}" y="${gY - fs/2}" width="${fs}" height="${fs}" />`;
    } else if (opts.goalIcon) {
      svg += `<text x="${gX}" y="${gY}" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${opts.goalIcon}</text>`;
    } else {
      svg += `<circle cx="${gX}" cy="${gY}" r="${r}" fill="crimson"/>`;
    }
  }

  // Embedded DFS animation (single continuous path) — optional
  if (opts.dfsSteps && opts.dfsSteps.length) {
    let d = `M ${cx(opts.dfsSteps[0].x)} ${cy(opts.dfsSteps[0].y)}`;
    for (const s of opts.dfsSteps) d += ` L ${cx(s.nx)} ${cy(s.ny)}`;
    const dur = Math.max(0.2, opts.dfsTotalSec ?? 4);
    const pass = Math.max(1, opts.dfsPassageWidth ?? (cell - stroke - 1));
    svg += `
<g class="dfs-anim" style="--dur:${dur}s">
  <path d="${d}" fill="none" stroke="#3b82f6" stroke-width="${pass}"
        stroke-linecap="round" stroke-linejoin="round"
        vector-effect="non-scaling-stroke" pathLength="1"
        style="stroke-dasharray:1;stroke-dashoffset:1" />
</g>`;
  }

  svg += `</svg>`;
  return svg;
}

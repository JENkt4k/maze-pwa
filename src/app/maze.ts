export type Cell = { x:number; y:number; n:1|0; s:1|0; e:1|0; w:1|0 };
export type CarveStep = { x:number; y:number; nx:number; ny:number };
export type GeneratorId = 'dfs' | 'prim' | 'kruskal';
export type MazeTopology = 'grid' | 'freeform';
export type MazePoint={x:number;y:number};
export type MazeParams = { width:number;height:number;seed:number;g:number;b:number;tau:number;generator?:GeneratorId;topology?:MazeTopology;regionDensity?:number;irregularity?:number;mask?:MaskId;customMask?:CustomMask;startCell?:MazePoint;goalCell?:MazePoint;wallStyle?:WallStyle;wallThickness?:number;cornerRadius?:number };
export type Stats = { L:number; T:number; J:number; E:number; D:number };
export type GeometrySegment={x1:number;y1:number;x2:number;y2:number};
export type MazeGeometry={width:number;height:number;walls:GeometrySegment[];outline:GeometrySegment[]};

export const GENERATORS: Readonly<Record<GeneratorId, { id:GeneratorId; name:string; description:string }>> = {
  dfs: { id:'dfs', name:'Randomized DFS', description:'Carves long passages with an iterative depth-first backtracker.' },
  prim: { id:'prim', name:'Randomized Prim', description:'Grows outward from the start with a randomized frontier.' },
  kruskal: { id:'kruskal', name:'Randomized Kruskal', description:'Joins random cell regions until the entire maze is connected.' },
};

export type MazeResult = {
  // final rendered grid (tree + braids)
  maze: Cell[][];
  // DFS spanning-tree carve steps for animation
  treeSteps: CarveStep[];
  // optional: the extra edges knocked out by braiding
  braidEdits: CarveStep[];
  // Statistics of the final maze and its shortest start-to-goal solution
  stats: Stats;
  // start/goal for markers
  start: {x:number;y:number};
  goal:  {x:number;y:number};
  mask: boolean[][];
  topology?:MazeTopology;
  graph?:MazeGraph;
  geometry?:MazeGeometry;
};

function isMazeResult(x: Cell[][] | MazeResult): x is MazeResult {
  return !Array.isArray(x);
}

export function createMaze(params: MazeParams): MazeResult {
  for (const dimension of [params.width, params.height]) {
    if (!Number.isInteger(dimension) || dimension < 1 || dimension > 101) throw new RangeError("Maze dimensions must be integers from 1 to 101");
  }
  if (!Number.isSafeInteger(params.seed)) throw new RangeError("Seed must be a safe integer");
  for (const value of [params.g, params.b, params.tau]) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Maze biases must be between 0 and 1");
  }
  const generator = params.generator ?? 'dfs';
  if (!(generator in GENERATORS)) throw new RangeError('Unknown maze generator');
  if(params.topology==='freeform')return createFreeformMaze(params);
  const { width: W, height: H, seed, g, b, tau } = params;
  const mask=createMask(W,H,params.mask??'rectangle',params.customMask);
  const rnd = mulberry32(seed);

  // 1) build tree grid + treeSteps
  const tree: Cell[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => ({ x, y, n:1 as 1|0, s:1 as 1|0, e:1 as 1|0, w:1 as 1|0 }))
  );
  const active=mask.flatMap((row,y)=>row.flatMap((on,x)=>on?[{x,y}]:[]));
  const middle=(H-1)/2;
  const buildStart=active.reduce((a,p)=>p.x<a.x||p.x===a.x&&Math.abs(p.y-middle)<Math.abs(a.y-middle)?p:a,active[0]);
  let buildGoal=active.reduce((a,p)=>p.x>a.x||p.x===a.x&&Math.abs(p.y-middle)<Math.abs(a.y-middle)?p:a,active[0]);

  const inb = (x:number,y:number)=> x>=0 && x<W && y>=0 && y<H && mask[y][x];
  const key = (x:number,y:number)=> `${x},${y}`;
  const seen = new Set<string>();

  const stack: {x:number;y:number}[] = [];
  const treeSteps: CarveStep[] = [];

  const carve = (x:number, y:number, d: typeof DIRS[number]) => {
    const nx=x+d.dx, ny=y+d.dy;
    tree[y][x][d.a]=0; tree[ny][nx][d.b]=0;
    treeSteps.push({x,y,nx,ny});
  };

  if (generator === 'prim') {
    type Frontier = {x:number;y:number;d:typeof DIRS[number]};
    const frontier: Frontier[]=[];
    const addFrontier=(x:number,y:number) => {
      for (const d of DIRS) if (inb(x+d.dx,y+d.dy) && !seen.has(key(x+d.dx,y+d.dy))) frontier.push({x,y,d});
    };
    seen.add(key(buildStart.x,buildStart.y)); addFrontier(buildStart.x,buildStart.y);
    while(frontier.length){
      const index=Math.floor(rnd()*frontier.length), edge=frontier[index];
      frontier[index]=frontier[frontier.length-1]; frontier.pop();
      const nx=edge.x+edge.d.dx, ny=edge.y+edge.d.dy;
      if(seen.has(key(nx,ny))) continue;
      carve(edge.x,edge.y,edge.d); seen.add(key(nx,ny)); addFrontier(nx,ny);
    }
  } else if (generator === 'kruskal') {
    const edges:{x:number;y:number;d:typeof DIRS[number]}[]=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(mask[y][x]){
      if(inb(x+1,y)) edges.push({x,y,d:DIRS[0]});
      if(inb(x,y+1)) edges.push({x,y,d:DIRS[2]});
    }
    for(let i=edges.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
    const parent=Array.from({length:W*H},(_,i)=>i);
    const root=(id:number):number => parent[id]===id?id:(parent[id]=root(parent[id]));
    for(const edge of edges){
      const nx=edge.x+edge.d.dx, ny=edge.y+edge.d.dy;
      const a=root(edge.y*W+edge.x), z=root(ny*W+nx);
      if(a===z) continue;
      parent[a]=z; carve(edge.x,edge.y,edge.d);
    }
  }

  if (generator === 'dfs') {
  stack.push(buildStart);
  seen.add(key(buildStart.x,buildStart.y));

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const prev = stack.length > 1
      ? { dx: cur.x - stack[stack.length - 2].x, dy: cur.y - stack[stack.length - 2].y }
      : null;

    // build the list of unvisited neighbors
    const candidates = [];
    for (const d of DIRS) {
      const nx = cur.x + d.dx, ny = cur.y + d.dy;
      if (inb(nx, ny) && !seen.has(key(nx, ny))) candidates.push(d);
    }

    if (candidates.length === 0) { stack.pop(); continue; }

    // ⬅️ choose using goal bias g and straight bonus τ
    // Preserve the v1 random sequence so existing saved/shared mazes retain
    // their layouts. Invalid weighted directions fall back to a valid choice.
    let d = chooseDirWeighted(DIRS, cur.x, cur.y, prev, buildGoal, g, tau, rnd);
    if (!inb(cur.x + d.dx, cur.y + d.dy) || seen.has(key(cur.x + d.dx, cur.y + d.dy))) {
      d = candidates[Math.floor(rnd() * candidates.length)];
    }

    const nx = cur.x + d.dx, ny = cur.y + d.dy;
    const a = tree[cur.y][cur.x], bcell = tree[ny][nx];
    a[d.a] = 0; bcell[d.b] = 0;
    treeSteps.push({ x:cur.x, y:cur.y, nx, ny });
    stack.push({ x:nx, y:ny }); seen.add(key(nx,ny));
  }
  }

  // 2) clone tree into final grid and apply braids (recorded separately)
  const maze: Cell[][] = tree.map(row => row.map(c => ({...c})));
  const braidEdits: CarveStep[] = [];
  if (b > 0) {
    for (let y=0;y<H;y++) for (let x=0;x<W;x++) if(mask[y][x]) {
      const c = maze[y][x];
      const deg = openDeg(c); // degree in current final graph
      if (deg === 1 && rnd() < b) {
        // Wall order and boundary skips are part of the v1 seed contract.
        const walls = [DIRS[3], DIRS[2], DIRS[0], DIRS[1]].filter(d => c[d.a]);
        if (!walls.length) continue;
        const d = walls[Math.floor(rnd() * walls.length)];
        const nx = x + d.dx, ny = y + d.dy;
        if (!inb(nx, ny)) continue;
        c[d.a] = 0;
        maze[ny][nx][d.b] = 0;
        braidEdits.push({ x, y, nx, ny });
      }
    }
  }

  // Select the rightmost reachable exit; irregular masks may contain narrow
  // rasterized features that are not connected by four-way movement.
  const reachable=[buildStart], reachableKeys=new Set([key(buildStart.x,buildStart.y)]);
  for(let i=0;i<reachable.length;i++){
    const point=reachable[i],cell=maze[point.y][point.x];
    for(const d of DIRS) if(!cell[d.a]&&inb(point.x+d.dx,point.y+d.dy)){
      const next={x:point.x+d.dx,y:point.y+d.dy},k=key(next.x,next.y);
      if(!reachableKeys.has(k)){reachableKeys.add(k);reachable.push(next);}
    }
  }
  buildGoal=reachable.reduce((a,p)=>p.x>a.x||p.x===a.x&&Math.abs(p.y-middle)<Math.abs(a.y-middle)?p:a,buildStart);

  const nearest=(requested:MazePoint|undefined,fallback:MazePoint,exclude?:MazePoint)=>{
    const candidates=exclude&&reachable.length>1?reachable.filter(point=>point.x!==exclude.x||point.y!==exclude.y):reachable;
    if(!requested)return candidates.find(point=>point.x===fallback.x&&point.y===fallback.y)??candidates[0];
    return candidates.reduce((best,point)=>Math.abs(point.x-requested.x)+Math.abs(point.y-requested.y)<Math.abs(best.x-requested.x)+Math.abs(best.y-requested.y)?point:best,candidates[0]);
  };
  const start=nearest(params.startCell,buildStart);
  const goal=nearest(params.goalCell,buildGoal,start);

  const stats = computeStats(maze, start, goal, mask);
  return { maze, treeSteps, braidEdits, stats, start, goal, mask };
}

/* ---------------- helpers ---------------- */

function mulberry32(seed:number){ let t = seed>>>0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t>>>15), 1 | t); r ^= r + Math.imul(r ^ (r>>>7), 61 | r); return ((r ^ (r>>>14))>>>0) / 4294967296; }; }

const DIRS = [
  { dx: 1, dy: 0, a: "e" as const, b: "w" as const },
  { dx:-1, dy: 0, a: "w" as const, b: "e" as const },
  { dx: 0, dy: 1, a: "s" as const, b: "n" as const },
  { dx: 0, dy:-1, a: "n" as const, b: "s" as const },
];

function chooseDirWeighted(
  dirs: typeof DIRS,
  x:number, y:number,
  prev:{dx:number;dy:number}|null,
  goal:{x:number;y:number},
  g:number, tau:number,
  rnd:()=>number
){

  // compute weights
  const baseDist = Math.abs(goal.x - x) + Math.abs(goal.y - y); // manhattan
  const weights = dirs.map(d => {
    const nx = x + d.dx, ny = y + d.dy;
    const toward = (Math.abs(goal.x - nx) + Math.abs(goal.y - ny)) < baseDist ? g : 0;
    const straight = prev && d.dx === prev.dx && d.dy === prev.dy ? tau : 0;
    // small jitter avoids ties (doesn't change determinism with our rng)
    return 1 + toward + straight + rnd()*1e-6;
  });

  // roulette-wheel selection
  let total = 0; for (const w of weights) total += w;
  let r = rnd() * total;
  for (let i = 0; i < dirs.length; i++) {
    r -= weights[i];
    if (r <= 0) return dirs[i];
  }
  return dirs[dirs.length - 1];
}

function openDeg(c:Cell){ return (c.n?0:1)+(c.s?0:1)+(c.e?0:1)+(c.w?0:1); }

/** Shortest-path length/turn rate and graph counts. D is an uncalibrated
 * heuristic: logarithmic route length, route turns, junction/dead-end density. */
function computeStats(maze: Cell[][], start: {x:number;y:number}, goal: {x:number;y:number}, mask=maze.map(row=>row.map(()=>true))): Stats {
  const W = maze[0].length, count = mask.flat().filter(Boolean).length;
  const parents = new Int32Array(W * maze.length).fill(-1);
  const first = start.y * W + start.x, last = goal.y * W + goal.x;
  const queue = [first];
  parents[first] = first;
  for (let head = 0; head < queue.length && parents[last] === -1; head++) {
    const id = queue[head], x = id % W, y = Math.floor(id / W);
    for (const d of DIRS) {
      if (maze[y][x][d.a]) continue;
      const next = (y + d.dy) * W + x + d.dx;
      if (parents[next] !== -1) continue;
      parents[next] = id;
      queue.push(next);
    }
  }
  const path = [last];
  while (path[path.length - 1] !== first) path.push(parents[path[path.length - 1]]);
  path.reverse();
  const L = path.length - 1;
  let turns = 0, J = 0, E = 0;
  for (let i = 2; i < path.length; i++) {
    if (path[i] - path[i-1] !== path[i-1] - path[i-2]) turns++;
  }
  for (const row of maze) for (const cell of row) if(mask[cell.y][cell.x]) {
    const degree = openDeg(cell);
    if (degree === 1) E++;
    if (degree >= 3) J++;
  }
  const T = L > 1 ? turns / (L - 1) : 0;
  const D = L === 0 ? 0 : 0.7 * Math.log2(L + 1) + 0.8 * T + 0.5 * J / count + 0.3 * E / count;
  return { L, T, J, E, D: +D.toFixed(3) };
}

/** Search a bounded parameter grid; include the current maze and preserve its seed. */
export function findMaxDifficulty(params: MazeParams): MazeParams {
  let best = { ...params }, score = createMaze(best).stats.D;
  for (const g of [0, .2, .4, .6, .8, 1])
    for (const b of [0, .1, .2, .3, .4, .5])
      for (const tau of [0, .2, .4, .6, .8, 1]) {
        const candidate = { ...params, g, b, tau };
        const next = createMaze(candidate).stats.D;
        if (next > score) { best = candidate; score = next; }
      }
  return best;
}

const RASTER_DATA = /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/i;
/** Only bounded plain text or base64 raster images may be persisted/rendered. */
export function normalizeMarker(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 2_000_000) return null;
  if (/^data:/i.test(value)) return RASTER_DATA.test(value) ? value : null;
  return value.length <= 64 ? value : null;
}
function escapeXML(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

export function toSVG(
  input: Cell[][] | MazeResult,
  opts: {
    cell:number; margin:number; stroke?:number; wallStyle?:WallStyle; cornerRadius?:number;
    showStartGoal?:boolean; startIcon?:string|null; goalIcon?:string|null; iconScale?:number;
  }
): string {
  const m  = isMazeResult(input) ? input.maze : input;
  const activeMask=isMazeResult(input)?input.mask:m.map(row=>row.map(()=>true));
  const SG = isMazeResult(input) ? {start: input.start, goal: input.goal} : null;
  const geometry=isMazeResult(input)?input.geometry:undefined;

  const { cell, margin, stroke = 2, wallStyle='classic', cornerRadius=.3 } = opts;
  if (![cell, margin, stroke, cornerRadius, opts.iconScale ?? .8].every(Number.isFinite) || cell <= 0 || margin < 0 || stroke <= 0 || cornerRadius<0||cornerRadius>.5 || (opts.iconScale ?? .8) <= 0 || !['classic','rounded','organic'].includes(wallStyle)) throw new RangeError("Invalid SVG dimensions");
  const startIcon = normalizeMarker(opts.startIcon), goalIcon = normalizeMarker(opts.goalIcon);
  const H = geometry?.height??m.length, W = geometry?.width??m[0]?.length??0;
  const widthPx  = W * cell + margin * 2;
  const heightPx = H * cell + margin * 2;

  const cx  = (x:number)=> margin + x*cell + (geometry?0:cell/2);
  const cy  = (y:number)=> margin + y*cell + (geometry?0:cell/2);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Maze with start and goal markers" viewBox="0 0 ${widthPx} ${heightPx}">`;
  if(wallStyle==='organic'||geometry){
    svg+=`<defs>${wallStyle==='organic'?`<filter id="organic-wall-filter" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${Math.abs(H*31+W)}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${Math.min(2.5,cell*.08)}" xChannelSelector="R" yChannelSelector="G"/></filter>`:''}`;
    if(geometry)svg+=`<clipPath id="freeform-mask-clip">${activeMask.flatMap((row,y)=>row.flatMap((active,x)=>active?[`<rect x="${margin+x*cell}" y="${margin+y*cell}" width="${cell}" height="${cell}"/>`]:[])).join('')}</clipPath>`;
    svg+='</defs>';
  }

  // Walls
  let walls = "";
  if(geometry)walls=geometry.walls.map(line=>`<line x1="${margin+line.x1*cell}" y1="${margin+line.y1*cell}" x2="${margin+line.x2*cell}" y2="${margin+line.y2*cell}"/>`).join('');
  else if(wallStyle==='classic')for (let y=0;y<H;y++) for(let x=0;x<W;x++){
      if(!activeMask[y][x]) continue;const c = m[y][x];
      if (c.n) walls += `<line x1="${margin+x*cell}" y1="${margin+y*cell}" x2="${margin+(x+1)*cell}" y2="${margin+y*cell}"/>`;
      if (c.w) walls += `<line x1="${margin+x*cell}" y1="${margin+y*cell}" x2="${margin+x*cell}" y2="${margin+(y+1)*cell}"/>`;
      if (c.s && (y===H-1 || !activeMask[y+1][x])) walls += `<line x1="${margin+x*cell}" y1="${margin+(y+1)*cell}" x2="${margin+(x+1)*cell}" y2="${margin+(y+1)*cell}"/>`;
      if (c.e && (x===W-1 || !activeMask[y][x+1])) walls += `<line x1="${margin+(x+1)*cell}" y1="${margin+y*cell}" x2="${margin+(x+1)*cell}" y2="${margin+(y+1)*cell}"/>`;
    }
  else walls=wallPaths(m,activeMask).map(points=>`<path d="${pathData(points,cell,margin,cornerRadius*cell)}"/>`).join('');
  svg += `<g class="walls walls-${wallStyle}" fill="none" stroke="#111" stroke-width="${stroke}" stroke-linecap="${wallStyle==='classic'?'square':'round'}" stroke-linejoin="round"${wallStyle==='organic'?' filter="url(#organic-wall-filter)"':''}${geometry?' clip-path="url(#freeform-mask-clip)"':''}>${walls}</g>`;
  if(geometry)svg+=`<g class="freeform-outline" fill="none" stroke="#111" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${geometry.outline.map(line=>`<line x1="${margin+line.x1*cell}" y1="${margin+line.y1*cell}" x2="${margin+line.x2*cell}" y2="${margin+line.y2*cell}"/>`).join('')}</g>`;

  // Start/Goal (prefer MazeResult’s start/goal if available; fallback to mid-row ends)
  if (opts.showStartGoal !== false) {
    const s = SG?.start ?? { x: 0,     y: Math.floor(H/2) };
    const g = SG?.goal  ?? { x: W - 1, y: Math.floor(H/2) };
    const sX = cx(s.x), sY = cy(s.y);
    const gX = cx(g.x), gY = cy(g.y);
    const r = Math.max(3, Math.round(cell*0.25));
    const fs = cell * (opts.iconScale ?? 0.8);

    if (startIcon && RASTER_DATA.test(startIcon)) {
      svg += `<image href="${escapeXML(startIcon)}" x="${sX - fs/2}" y="${sY - fs/2}" width="${fs}" height="${fs}" />`;
    } else if (startIcon) {
      svg += `<text x="${sX}" y="${sY}" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${escapeXML(startIcon!)}</text>`;
    } else {
      svg += `<circle cx="${sX}" cy="${sY}" r="${r}" fill="limegreen"/>`;
    }

    if (goalIcon && RASTER_DATA.test(goalIcon)) {
      svg += `<image href="${escapeXML(goalIcon)}" x="${gX - fs/2}" y="${gY - fs/2}" width="${fs}" height="${fs}" />`;
    } else if (goalIcon) {
      svg += `<text x="${gX}" y="${gY}" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${escapeXML(goalIcon!)}</text>`;
    } else {
      svg += `<circle cx="${gX}" cy="${gY}" r="${r}" fill="crimson"/>`;
    }
  }

  svg += `</svg>`;
  return svg;
}
import { createMask, type CustomMask, type MaskId } from '../maze/masks';
import { pathData, wallPaths, type WallStyle } from '../maze/walls';
import { createFreeformMaze } from '../maze/freeform';
import type { MazeGraph } from '../maze/graph';

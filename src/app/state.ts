import { normalizeMarker, type GeneratorId, type MazeParams } from './maze';
import type { SolverId } from '../maze/solvers';
import type { AnimationMode } from '../maze/animation';
import { CUSTOM_MASK_SIZE, type CustomMask, type MaskId } from '../maze/masks';
import type { WallStyle } from '../maze/walls';

export const SETTINGS_KEY = 'maze:settings:v1';
export const STORAGE_KEY = 'savedMazes:v1';
export type { MazeParams } from './maze';
export type Markers = { startIcon: string | null; goalIcon: string | null };
export type Settings = MazeParams & Markers & {
  controlsOpen: boolean;
  lockSize: boolean;
  solverEnabled: boolean;
  solverAlgorithm: SolverId;
  solverStepMs: number;
  animationMode: AnimationMode;
  generationColor: string;
  generationOpacity: number;
  solverColor: string;
  solverOpacity: number;
  gameBreadcrumbs:boolean;
  // Legacy fields retained only while migrating existing settings.
  animateDFS: boolean;
  dfsSegMs: number;
  lingerMs: number;
};
export type SavedMaze = { id: string; name: string; params: MazeParams & Partial<Markers>; createdAt: number };
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ranges = { width: [7, 41], height: [7, 41], seed: [-2147483648, 2147483647], g: [0, 1], b: [0, .5], tau: [0, 1], dfsSegMs: [10, 250], lingerMs: [0, 5000], solverStepMs: [10, 250], generationOpacity: [.1, 1], solverOpacity: [.1, 1],wallThickness:[1,8],cornerRadius:[0,.5] } as const;

export function validateSettings(value: unknown): Partial<Settings> {
  if (!record(value)) return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const n = value[key];
    if (typeof n !== 'number' || !Number.isFinite(n)) continue;
    const [lo, hi] = ranges[key];
    let v = Math.max(lo, Math.min(hi, n));
    if (key === 'width' || key === 'height') { v = Math.trunc(v); v += v % 2 === 0 ? 1 : 0; }
    if (key === 'seed' || key === 'dfsSegMs' || key === 'lingerMs' || key === 'solverStepMs') v = Math.trunc(v);
    out[key] = v;
  }
  for (const key of ['controlsOpen', 'lockSize', 'animateDFS', 'solverEnabled','gameBreadcrumbs']) if (typeof value[key] === 'boolean') out[key] = value[key];
  if (['dfs', 'bfs', 'dijkstra', 'astar'].includes(String(value.solverAlgorithm))) out.solverAlgorithm = value.solverAlgorithm;
  if (['dfs', 'prim', 'kruskal'].includes(String(value.generator))) out.generator = value.generator as GeneratorId;
  if (['rectangle','ellipse','diamond','heart','star','cup','brain','moose','custom'].includes(String(value.mask))) out.mask=value.mask as MaskId;
  if(['classic','rounded','organic'].includes(String(value.wallStyle)))out.wallStyle=value.wallStyle as WallStyle;
  if(record(value.customMask)&&typeof value.customMask.pixels==='string'&&value.customMask.pixels.length<=Math.ceil(CUSTOM_MASK_SIZE**2/3)*4&&typeof value.customMask.threshold==='number'){
    const threshold=Math.max(1,Math.min(254,Math.trunc(value.customMask.threshold)));
    out.customMask={pixels:value.customMask.pixels,threshold,invert:value.customMask.invert===true,name:typeof value.customMask.name==='string'?value.customMask.name.slice(0,100):undefined} satisfies CustomMask;
  }
  for(const endpoint of ['startCell','goalCell'] as const)if(record(value[endpoint])&&Number.isInteger(value[endpoint].x)&&Number.isInteger(value[endpoint].y)){
    out[endpoint]={x:Math.max(0,Math.min(100,value[endpoint].x as number)),y:Math.max(0,Math.min(100,value[endpoint].y as number))};
  }
  if (['build-solve', 'build', 'solve'].includes(String(value.animationMode))) out.animationMode = value.animationMode as AnimationMode;
  if (typeof value.generationColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.generationColor)) out.generationColor = value.generationColor.toLowerCase();
  if (typeof value.solverColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.solverColor)) out.solverColor = value.solverColor.toLowerCase();
  for (const key of ['startIcon', 'goalIcon']) if (key in value) out[key] = normalizeMarker(value[key]);
  return out as Partial<Settings>;
}

export function parseSettings(raw: string | null): Partial<Settings> {
  try { return validateSettings(JSON.parse(raw ?? 'null')); } catch { return {}; }
}
export function parseSaved(raw: string | null): SavedMaze[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    return value.flatMap((entry): SavedMaze[] => {
      if (!record(entry) || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string' || !Number.isFinite(entry.createdAt) || !record(entry.params)) return [];
      const params = validateSettings(entry.params);
      if (['width', 'height', 'seed', 'g', 'b', 'tau'].some(key => !(key in params))) return [];
      if (ids.has(entry.id)) return [];
      ids.add(entry.id);
      return [{ id: entry.id, name: entry.name.slice(0, 200), params: params as MazeParams & Partial<Markers>, createdAt: entry.createdAt as number }];
    });
  } catch { return []; }
}
export function parseFromURL(search: string): Partial<Settings> {
  const q = new URLSearchParams(search);
  const values: Record<string, unknown> = {};
  for (const [query, key] of [['w', 'width'], ['h', 'height'], ['seed', 'seed'], ['g', 'g'], ['b', 'b'], ['tau', 'tau']]) {
    const raw = q.get(query);
    if (raw !== null && raw.trim() !== '') values[key] = Number(raw);
  }
  if (q.has('gen')) values.generator = q.get('gen');
  if (q.has('mask')) values.mask=q.get('mask');
  if(q.has('cm')) values.customMask={pixels:q.get('cm'),threshold:Number(q.get('ct')??160),invert:q.get('ci')==='1',name:q.get('cn')??undefined};
  if(q.has('sx')&&q.has('sy'))values.startCell={x:Number(q.get('sx')),y:Number(q.get('sy'))};
  if(q.has('gx')&&q.has('gy'))values.goalCell={x:Number(q.get('gx')),y:Number(q.get('gy'))};
  if(q.has('ws'))values.wallStyle=q.get('ws');
  if(q.has('wt'))values.wallThickness=Number(q.get('wt'));
  if(q.has('cr'))values.cornerRadius=Number(q.get('cr'));
  for (const [query, key] of [['start', 'startIcon'], ['goal', 'goalIcon']]) {
    if (!q.has(query)) continue;
    let marker = q.get(query) ?? '';
    // Older links double-encoded markers. Never let malformed escapes throw.
    if (q.get('v') !== '2') { try { marker = decodeURIComponent(marker); } catch {} }
    values[key] = marker;
  }
  return validateSettings(values);
}
export function buildShareURL(base: string, p: MazeParams & Markers): string {
  const u = new URL(base);
  u.searchParams.set('v', '2');
  for (const [query, key] of [['w', 'width'], ['h', 'height'], ['seed', 'seed'], ['g', 'g'], ['b', 'b'], ['tau', 'tau']] as const) u.searchParams.set(query, String(p[key]));
  if (p.generator && p.generator !== 'dfs') u.searchParams.set('gen', p.generator); else u.searchParams.delete('gen');
  if (p.mask && p.mask !== 'rectangle') u.searchParams.set('mask',p.mask); else u.searchParams.delete('mask');
  if(p.mask==='custom'&&p.customMask){u.searchParams.set('cm',p.customMask.pixels);u.searchParams.set('ct',String(p.customMask.threshold));if(p.customMask.invert)u.searchParams.set('ci','1');else u.searchParams.delete('ci');if(p.customMask.name)u.searchParams.set('cn',p.customMask.name);else u.searchParams.delete('cn');}
  else for(const key of ['cm','ct','ci','cn'])u.searchParams.delete(key);
  for(const [prefix,point] of [['s',p.startCell],['g',p.goalCell]] as const){
    if(point){u.searchParams.set(`${prefix}x`,String(point.x));u.searchParams.set(`${prefix}y`,String(point.y));}
    else{u.searchParams.delete(`${prefix}x`);u.searchParams.delete(`${prefix}y`);}
  }
  if(p.wallStyle&&p.wallStyle!=='classic')u.searchParams.set('ws',p.wallStyle);else u.searchParams.delete('ws');
  if(p.wallThickness!==undefined&&p.wallThickness!==3)u.searchParams.set('wt',String(p.wallThickness));else u.searchParams.delete('wt');
  if(p.cornerRadius!==undefined&&p.cornerRadius!==.3)u.searchParams.set('cr',String(p.cornerRadius));else u.searchParams.delete('cr');
  // Raster uploads are kept locally; explicit empty values prevent recipient defaults.
  for (const [query, marker] of [['start', p.startIcon], ['goal', p.goalIcon]] as const) u.searchParams.set(query, /^data:/i.test(marker ?? '') ? '' : marker ?? '');
  return u.toString();
}

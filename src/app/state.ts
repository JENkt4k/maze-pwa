import { normalizeMarker, type MazeParams } from './maze';
import type { SolverId } from '../maze/solvers';

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
  // Legacy fields retained only while migrating existing settings.
  animateDFS: boolean;
  dfsSegMs: number;
  lingerMs: number;
};
export type SavedMaze = { id: string; name: string; params: MazeParams & Partial<Markers>; createdAt: number };
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ranges = { width: [7, 41], height: [7, 41], seed: [-2147483648, 2147483647], g: [0, 1], b: [0, .5], tau: [0, 1], dfsSegMs: [10, 250], lingerMs: [0, 5000], solverStepMs: [10, 250] } as const;

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
  for (const key of ['controlsOpen', 'lockSize', 'animateDFS', 'solverEnabled']) if (typeof value[key] === 'boolean') out[key] = value[key];
  if (['dfs', 'bfs', 'dijkstra', 'astar'].includes(String(value.solverAlgorithm))) out.solverAlgorithm = value.solverAlgorithm;
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
  // Raster uploads are kept locally; explicit empty values prevent recipient defaults.
  for (const [query, marker] of [['start', p.startIcon], ['goal', p.goalIcon]] as const) u.searchParams.set(query, /^data:/i.test(marker ?? '') ? '' : marker ?? '');
  return u.toString();
}

import type { MazeGameState } from './hooks/useMazeGame';
import { validateSettings, type Markers, type MazeParams } from './state';

export const HISTORY_STORAGE_KEY='maze:play-history:v1';
export const HISTORY_LIMIT=200;
export type HistoryStatus='playing'|'paused'|'completed'|'abandoned';
export type HistoryMazeParams=MazeParams&Partial<Markers>;
export type PlayHistoryEntry=Readonly<{
  version:1;id:string;mazeId:string;gameKey:string;params:HistoryMazeParams;
  startedAt:number;updatedAt:number;completedAt?:number;status:HistoryStatus;
  elapsedMs:number;moves:number;revisits:number;route:readonly string[];
}>;

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const finiteNonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;

export function parsePlayHistory(raw:string|null):PlayHistoryEntry[]{
  try{
    const value:unknown=JSON.parse(raw??'[]');if(!Array.isArray(value))return[];
    const ids=new Set<string>();
    return value.flatMap((entry):PlayHistoryEntry[]=>{
      if(!record(entry)||entry.version!==1||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||typeof entry.mazeId!=='string'||!entry.mazeId||typeof entry.gameKey!=='string'||!entry.gameKey||!record(entry.params)||!finiteNonnegative(entry.startedAt)||!finiteNonnegative(entry.updatedAt)||!finiteNonnegative(entry.elapsedMs)||!finiteNonnegative(entry.moves)||!finiteNonnegative(entry.revisits)||!Array.isArray(entry.route)||!entry.route.length||!entry.route.every(node=>typeof node==='string')||!['playing','paused','completed','abandoned'].includes(String(entry.status)))return[];
      const params=validateSettings(entry.params);
      if(['width','height','seed','g','b','tau'].some(key=>!(key in params)))return[];
      ids.add(entry.id);
      return[{version:1,id:entry.id,mazeId:entry.mazeId,gameKey:entry.gameKey,params:params as HistoryMazeParams,startedAt:entry.startedAt,updatedAt:entry.updatedAt,completedAt:finiteNonnegative(entry.completedAt)?entry.completedAt:undefined,status:entry.status==='playing'?'paused':entry.status as HistoryStatus,elapsedMs:entry.elapsedMs,moves:entry.moves,revisits:entry.revisits,route:entry.route as string[]}];
    }).sort((a,b)=>b.startedAt-a.startedAt).slice(0,HISTORY_LIMIT);
  }catch{return[];}
}

export function createHistoryEntry(mazeId:string,gameKey:string,params:HistoryMazeParams,state:MazeGameState,now=Date.now(),id:string=crypto.randomUUID()):PlayHistoryEntry{
  return{version:1,id,mazeId,gameKey,params,startedAt:now,updatedAt:now,status:'playing',elapsedMs:state.elapsedMs,moves:state.moves,revisits:state.revisits,route:state.route};
}

export function updateHistoryEntry(entry:PlayHistoryEntry,state:MazeGameState,now=Date.now()):PlayHistoryEntry{
  const status:HistoryStatus=state.status==='complete'?'completed':state.status==='paused'?'paused':'playing';
  return{...entry,updatedAt:now,completedAt:status==='completed'?(entry.completedAt??now):undefined,status,elapsedMs:state.elapsedMs,moves:state.moves,revisits:state.revisits,route:state.route};
}

export function abandonHistoryEntry(entry:PlayHistoryEntry,now=Date.now()):PlayHistoryEntry{
  return entry.status==='completed'||entry.status==='abandoned'?entry:{...entry,status:'abandoned',updatedAt:now};
}

export function historyGameState(entry:PlayHistoryEntry):MazeGameState{
  return{key:entry.gameKey,current:entry.route.at(-1)!,route:[...entry.route],moves:entry.moves,revisits:entry.revisits,elapsedMs:entry.elapsedMs,status:entry.status==='completed'?'complete':'paused'};
}

import type { PlayHistoryEntry } from './history';

export type LeaderboardSort='time'|'moves';
export type MazeLeaderboard=Readonly<{mazeId:string;label:string;attempts:readonly PlayHistoryEntry[]}>;

export function rankAttempts(entries:readonly PlayHistoryEntry[],mazeId:string,sort:LeaderboardSort):PlayHistoryEntry[]{
  return entries.filter(entry=>entry.mazeId===mazeId&&entry.status==='completed').sort((a,b)=>sort==='time'
    ?a.elapsedMs-b.elapsedMs||a.moves-b.moves||a.revisits-b.revisits||(a.completedAt??a.updatedAt)-(b.completedAt??b.updatedAt)
    :a.moves-b.moves||a.elapsedMs-b.elapsedMs||a.revisits-b.revisits||(a.completedAt??a.updatedAt)-(b.completedAt??b.updatedAt));
}

export function leaderboardMazes(entries:readonly PlayHistoryEntry[]):MazeLeaderboard[]{
  const groups=new Map<string,PlayHistoryEntry[]>();
  for(const entry of entries)if(entry.status==='completed'){const group=groups.get(entry.mazeId)??[];group.push(entry);groups.set(entry.mazeId,group);}
  return[...groups].map(([mazeId,attempts])=>{const first=attempts[0];return{mazeId,label:`${first.params.width}×${first.params.height} · seed ${first.params.seed}`,attempts};}).sort((a,b)=>(Math.max(...b.attempts.map(entry=>entry.completedAt??entry.updatedAt)))-(Math.max(...a.attempts.map(entry=>entry.completedAt??entry.updatedAt))));
}

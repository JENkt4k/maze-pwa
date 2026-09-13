import type { HistoryMazeParams, PlayHistoryEntry } from './history';
import type { LeaderboardSort } from './leaderboard';

export const SHARED_LEADERBOARD_CONSENT_KEY='maze:shared-leaderboard-consent:v1';
export type SharedMazeParams=Omit<HistoryMazeParams,'startIcon'|'goalIcon'>;
export type SharedScore=Readonly<{id:string;name:string;elapsedMs:number;moves:number;revisits:number;submittedAt:number}>;
export type SharedLeaderboard=Readonly<{version:1;mazeId:string;entries:readonly SharedScore[]}>;
export type SharedSubmission=Readonly<{version:1;submissionId:string;name:string;mazeId:string;params:SharedMazeParams;elapsedMs:number;moves:number;revisits:number}>;

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const nonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export function parseSharedLeaderboard(value:unknown,mazeId:string):SharedLeaderboard{
  if(!record(value)||value.version!==1||value.mazeId!==mazeId||!Array.isArray(value.entries))throw new Error('The shared leaderboard returned an invalid response.');
  const entries=value.entries.flatMap((entry):SharedScore[]=>record(entry)&&typeof entry.id==='string'&&typeof entry.name==='string'&&entry.name.length>=1&&entry.name.length<=24&&nonnegative(entry.elapsedMs)&&nonnegative(entry.moves)&&nonnegative(entry.revisits)&&nonnegative(entry.submittedAt)
    ?[{id:entry.id,name:entry.name,elapsedMs:entry.elapsedMs,moves:entry.moves,revisits:entry.revisits,submittedAt:entry.submittedAt}]:[]);
  return{version:1,mazeId,entries};
}
const errorMessage=async(response:Response)=>{try{const value:unknown=await response.json();if(record(value)&&typeof value.error==='string')return value.error;}catch{}return`Shared leaderboard request failed (${response.status}).`;};
export class SharedLeaderboardClient{
  constructor(private readonly baseUrl:string,private readonly request:typeof fetch=fetch){}
  async list(mazeId:string,sort:LeaderboardSort,signal?:AbortSignal){
    const url=new URL(`v1/leaderboards/${encodeURIComponent(mazeId)}`,this.baseUrl.endsWith('/')?this.baseUrl:`${this.baseUrl}/`);url.searchParams.set('sort',sort);url.searchParams.set('limit','50');
    const response=await this.request(url,{headers:{Accept:'application/json'},signal});if(!response.ok)throw new Error(await errorMessage(response));return parseSharedLeaderboard(await response.json(),mazeId);
  }
  async submit(submission:SharedSubmission){
    const url=new URL('v1/submissions',this.baseUrl.endsWith('/')?this.baseUrl:`${this.baseUrl}/`);
    const response=await this.request(url,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(submission)});if(!response.ok)throw new Error(await errorMessage(response));return response.json() as Promise<SharedScore>;
  }
}
export function submissionFromAttempt(entry:PlayHistoryEntry,name:string,id:string=crypto.randomUUID()):SharedSubmission{
  if(entry.status!=='completed')throw new Error('Only completed attempts can be submitted.');
  const {startIcon:_startIcon,goalIcon:_goalIcon,...params}=entry.params;
  return{version:1,submissionId:id,name:name.trim().slice(0,24),mazeId:entry.mazeId,params,elapsedMs:entry.elapsedMs,moves:entry.moves,revisits:entry.revisits};
}

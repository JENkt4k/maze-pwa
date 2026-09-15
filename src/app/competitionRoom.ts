import type { PlayHistoryEntry } from './history';
import type { HistoryMazeParams } from './history';
import { validateSettings } from './state';
import type { MazeGraph } from '../maze/graph';
import { strFromU8,strToU8,zlibSync,unzlibSync } from 'fflate';

export const COMPETITION_ROOM_STORAGE_PREFIX='maze:competition-room:v1:';
export const COMPETITION_LAST_ROOM_PREFIX='maze:competition-last-room:v1:';
export type RoomResult=Readonly<{id:string;player:string;mazeId:string;elapsedMs:number;moves:number;revisits:number;route:readonly string[];completedAt:number}>;
export type SignalCode=Readonly<{version:1;kind:'offer'|'answer';roomId:string;mazeId:string;maze:HistoryMazeParams;description:RTCSessionDescriptionInit}>;

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const bytesToBase64=(bytes:Uint8Array)=>{let value='';for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const base64ToBytes=(value:string)=>{const normalized=value.replace(/-/g,'+').replace(/_/g,'/');const decoded=atob(normalized+'='.repeat((4-normalized.length%4)%4));return Uint8Array.from(decoded,char=>char.charCodeAt(0));};

const COMPRESSED_SIGNAL_PREFIX='z.';

export function encodeSignal(signal:SignalCode):string{
  return COMPRESSED_SIGNAL_PREFIX+bytesToBase64(zlibSync(strToU8(JSON.stringify(signal)),{level:9}));
}
export function decodeSignal(code:string,kind:'offer'|'answer'):SignalCode{
  try{
    const trimmed=code.trim();
    const json=trimmed.startsWith(COMPRESSED_SIGNAL_PREFIX)
      ?strFromU8(unzlibSync(base64ToBytes(trimmed.slice(COMPRESSED_SIGNAL_PREFIX.length))))
      :new TextDecoder().decode(base64ToBytes(trimmed));
    const value:unknown=JSON.parse(json);
    if(!record(value)||value.version!==1||value.kind!==kind||typeof value.roomId!=='string'||!value.roomId||typeof value.mazeId!=='string'||!value.mazeId||!record(value.maze)||!record(value.description)||!['offer','answer'].includes(String(value.description.type))||typeof value.description.sdp!=='string')throw new Error();
    const maze=validateSettings(value.maze);
    if(['width','height','seed','g','b','tau'].some(key=>!(key in maze)))throw new Error();
    return{version:1,kind,roomId:value.roomId,mazeId:value.mazeId,maze:maze as HistoryMazeParams,description:{type:value.description.type as RTCSdpType,sdp:value.description.sdp}};
  }catch{throw new Error(`This is not a valid InfiMaze ${kind} code.`);}
}

export function resultFromAttempt(entry:PlayHistoryEntry,player:string):RoomResult{
  if(entry.status!=='completed'||(entry.hints??0)>0)throw new Error('Complete the maze without hints before sharing a ranked result.');
  return{id:entry.id,player:player.trim().slice(0,24)||'Player',mazeId:entry.mazeId,elapsedMs:entry.elapsedMs,moves:entry.moves,revisits:entry.revisits,route:[...entry.route],completedAt:entry.completedAt??entry.updatedAt};
}

export function parseRoomResult(value:unknown,mazeId:string,graph:MazeGraph):RoomResult{
  if(!record(value)||typeof value.id!=='string'||!value.id||typeof value.player!=='string'||!value.player.trim()||value.player.length>24||value.mazeId!==mazeId||!finite(value.elapsedMs)||!finite(value.moves)||!finite(value.revisits)||!finite(value.completedAt)||!Array.isArray(value.route)||!value.route.length||!value.route.every(node=>typeof node==='string'))throw new Error('The peer sent an invalid result.');
  const route=value.route as string[];
  if(route[0]!==graph.start||!graph.goals.includes(route.at(-1)!))throw new Error('The peer replay does not reach this maze goal.');
  for(let i=1;i<route.length;i++)if(!graph.nodes.get(route[i-1])?.neighbors.includes(route[i]))throw new Error('The peer replay contains an impossible move.');
  const moves=route.length-1,revisits=route.reduce((count,node,index)=>count+(route.indexOf(node)<index?1:0),0);
  if(value.moves!==moves||value.revisits!==revisits)throw new Error('The peer result metrics do not match its replay.');
  return{id:value.id,player:value.player.trim(),mazeId,elapsedMs:value.elapsedMs,moves,revisits,route,completedAt:value.completedAt};
}

export function mergeRoomResults(current:readonly RoomResult[],incoming:readonly RoomResult[]):RoomResult[]{
  const merged=new Map(current.map(result=>[result.id,result]));for(const result of incoming)merged.set(result.id,result);
  return[...merged.values()].sort((a,b)=>a.elapsedMs-b.elapsedMs||a.moves-b.moves||a.completedAt-b.completedAt);
}

export function parseStoredRoom(raw:string|null,mazeId:string,graph:MazeGraph):RoomResult[]{
  try{const value:unknown=JSON.parse(raw??'[]');return Array.isArray(value)?mergeRoomResults([],value.flatMap(item=>{try{return[parseRoomResult(item,mazeId,graph)];}catch{return[];}})):[];}catch{return[];}
}

export function roomResultsCsv(results:readonly RoomResult[]):string{
  const quote=(value:string|number)=>`"${String(value).replace(/"/g,'""')}"`;
  return[['rank','player','time_ms','moves','revisits','completed_at'],...results.map((result,index)=>[index+1,result.player,result.elapsedMs,result.moves,result.revisits,new Date(result.completedAt).toISOString()])].map(row=>row.map(quote).join(',')).join('\r\n');
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MazeGraph, NodeId } from '../../maze/graph';

export const GAME_STORAGE_KEY='maze:game:v1';
export type GameStatus='idle'|'playing'|'paused'|'complete';
export type MazeGameState={key:string;current:NodeId;route:NodeId[];moves:number;revisits:number;elapsedMs:number;status:GameStatus};

function initial(key:string,start:NodeId,status:GameStatus='idle'):MazeGameState{return{key,current:start,route:[start],moves:0,revisits:0,elapsedMs:0,status};}
function load(key:string,start:NodeId,valid:ReadonlyMap<NodeId,unknown>):MazeGameState{
  try{const value=JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)??'null') as Partial<MazeGameState>|null;
    if(value?.key===key&&typeof value.current==='string'&&valid.has(value.current)&&Array.isArray(value.route)&&value.route.length>0&&value.route.every(item=>typeof item==='string'&&valid.has(item))&&Number.isFinite(value.moves)&&value.moves!>=0&&Number.isFinite(value.revisits)&&value.revisits!>=0&&Number.isFinite(value.elapsedMs)&&value.elapsedMs!>=0&&['idle','playing','paused','complete'].includes(String(value.status)))
      return{key,current:value.current,route:value.route,moves:value.moves!,revisits:value.revisits!,elapsedMs:value.elapsedMs!,status:value.status==='playing'?'paused':value.status as GameStatus};
  }catch{}
  return initial(key,start);
}

export function useMazeGame(graph:MazeGraph,key:string){
  const [state,setState]=useState(()=>load(key,graph.start,graph.nodes));
  const startedAt=useRef<number|null>(null);
  const goals=useMemo(()=>new Set(graph.goals),[graph.goals]);
  useEffect(()=>{startedAt.current=null;setState(load(key,graph.start,graph.nodes));},[key,graph.start,graph.nodes]);
  useEffect(()=>{try{localStorage.setItem(GAME_STORAGE_KEY,JSON.stringify(state));}catch{}},[state]);
  useEffect(()=>{
    if(state.status!=='playing'){startedAt.current=null;return;}
    startedAt.current=Date.now();
    const timer=window.setInterval(()=>{const now=Date.now();setState(current=>({...current,elapsedMs:current.elapsedMs+Math.max(0,now-(startedAt.current??now))}));startedAt.current=now;},250);
    return()=>window.clearInterval(timer);
  },[state.status]);
  const start=()=>setState(current=>current.status==='complete'?initial(key,graph.start,'playing'):{...current,status:'playing'});
  const pause=()=>setState(current=>current.status==='playing'?{...current,status:'paused'}:current);
  const restart=()=>setState(initial(key,graph.start,'playing'));
  const move=(target:NodeId)=>setState(current=>{
    if(current.status!=='playing')return current;
    const node=graph.nodes.get(current.current);if(!node?.neighbors.includes(target))return current;
    const route=[...current.route,target],complete=goals.has(target);
    return{...current,current:target,route,moves:current.moves+1,revisits:current.revisits+(current.route.includes(target)?1:0),status:complete?'complete':'playing'};
  });
  return{state,start,pause,restart,move};
}

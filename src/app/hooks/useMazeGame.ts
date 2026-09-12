import { useEffect, useMemo, useRef, useState } from 'react';
import type { MazeGraph, NodeId } from '../../maze/graph';

export const GAME_STORAGE_KEY='maze:game:v1';
export type GameStatus='idle'|'playing'|'paused'|'complete';
export type MazeGameState={key:string;current:NodeId;route:NodeId[];moves:number;revisits:number;elapsedMs:number;status:GameStatus};

function initial(key:string,start:NodeId,status:GameStatus='idle'):MazeGameState{return{key,current:start,route:[start],moves:0,revisits:0,elapsedMs:0,status};}
function isValidState(value:Partial<MazeGameState>,key:string,valid:ReadonlyMap<NodeId,unknown>):value is MazeGameState{
  return value.key===key&&typeof value.current==='string'&&valid.has(value.current)&&Array.isArray(value.route)&&value.route.length>0&&value.route.every(item=>typeof item==='string'&&valid.has(item))&&Number.isFinite(value.moves)&&value.moves!>=0&&Number.isFinite(value.revisits)&&value.revisits!>=0&&Number.isFinite(value.elapsedMs)&&value.elapsedMs!>=0&&['idle','playing','paused','complete'].includes(String(value.status));
}
function load(key:string,start:NodeId,valid:ReadonlyMap<NodeId,unknown>):MazeGameState{
  try{const value=JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)??'null') as Partial<MazeGameState>|null;
    if(value&&isValidState(value,key,valid))
      return{key,current:value.current,route:value.route,moves:value.moves!,revisits:value.revisits!,elapsedMs:value.elapsedMs!,status:value.status==='playing'?'paused':value.status as GameStatus};
  }catch{}
  return initial(key,start);
}

export function useMazeGame(graph:MazeGraph,key:string){
  const [state,setState]=useState(()=>load(key,graph.start,graph.nodes));
  const startedAt=useRef<number|null>(null);
  const elapsedAtStart=useRef(0);
  const goals=useMemo(()=>new Set(graph.goals),[graph.goals]);
  // `key` already represents the maze topology and endpoints. Depending on the
  // graph objects here resets the session whenever App recreates the graph on a
  // render, including every timer tick.
  useEffect(()=>{startedAt.current=null;elapsedAtStart.current=0;setState(load(key,graph.start,graph.nodes));},[key]);
  useEffect(()=>{try{localStorage.setItem(GAME_STORAGE_KEY,JSON.stringify(state));}catch{}},[state]);
  useEffect(()=>{
    if(state.status!=='playing'){startedAt.current=null;return;}
    startedAt.current=Date.now();
    elapsedAtStart.current=state.elapsedMs;
    const timer=window.setInterval(()=>setState(current=>({...current,elapsedMs:elapsedAtStart.current+Math.max(0,Date.now()-(startedAt.current??Date.now()))})),250);
    return()=>window.clearInterval(timer);
  },[state.status]);
  const start=()=>setState(current=>current.status==='complete'?initial(key,graph.start,'playing'):{...current,status:'playing'});
  const pause=()=>setState(current=>current.status==='playing'?{...current,elapsedMs:elapsedAtStart.current+Math.max(0,Date.now()-(startedAt.current??Date.now())),status:'paused'}:current);
  const restart=()=>{startedAt.current=Date.now();elapsedAtStart.current=0;setState(initial(key,graph.start,'playing'));};
  const restore=(saved:MazeGameState)=>{startedAt.current=null;elapsedAtStart.current=saved.elapsedMs;setState(isValidState(saved,key,graph.nodes)?{...saved,status:saved.status==='playing'?'paused':saved.status}:initial(key,graph.start));};
  const move=(target:NodeId)=>setState(current=>{
    if(current.status!=='playing')return current;
    const node=graph.nodes.get(current.current);if(!node?.neighbors.includes(target))return current;
    const route=[...current.route,target],complete=goals.has(target);
    return{...current,current:target,route,moves:current.moves+1,revisits:current.revisits+(current.route.includes(target)?1:0),elapsedMs:complete?elapsedAtStart.current+Math.max(0,Date.now()-(startedAt.current??Date.now())):current.elapsedMs,status:complete?'complete':'playing'};
  });
  return{state,start,pause,restart,restore,move};
}

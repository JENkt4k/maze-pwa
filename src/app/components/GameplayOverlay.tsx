import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { MazeGraph, NodeId } from '../../maze/graph';
import type { MazeGameState } from '../hooks/useMazeGame';

type Props={graph:MazeGraph;state:MazeGameState;cell:number;margin:number;width:number;height:number;breadcrumbs:boolean;move:(target:NodeId)=>void;freeform?:boolean};
const directions:Record<string,[number,number]>={ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowUp:[0,-1],w:[0,-1],W:[0,-1]};

export default function GameplayOverlay({graph,state,cell,margin,width,height,breadcrumbs,move,freeform}:Props){
  const ref=useRef<HTMLDivElement>(null),pointer=useRef<{x:number;y:number}|null>(null);
  const totalWidth=width*cell+2*margin,totalHeight=height*cell+2*margin;
  const current=graph.nodes.get(state.current)!;
  useEffect(()=>{if(state.status==='playing')ref.current?.focus();},[state.status]);
  const moveDirection=(dx:number,dy:number)=>{
    const candidates=current.neighbors.map(id=>{const point=graph.nodes.get(id)!.position,vx=point.x-current.position.x,vy=point.y-current.position.y,length=Math.hypot(vx,vy);return{id,score:length?(vx*dx+vy*dy)/length:-1};}).filter(candidate=>candidate.score>.25).sort((a,b)=>b.score-a.score);
    if(candidates[0])move(candidates[0].id);
  };
  const keyDown=(event:KeyboardEvent)=>{const direction=directions[event.key];if(!direction)return;event.preventDefault();moveDirection(...direction);};
  const down=(event:PointerEvent)=>{pointer.current={x:event.clientX,y:event.clientY};};
  const up=(event:PointerEvent)=>{const start=pointer.current;pointer.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;Math.abs(dx)>Math.abs(dy)?moveDirection(Math.sign(dx),0):moveDirection(0,Math.sign(dy));};
  const center=(id:NodeId)=>{const p=graph.nodes.get(id)!.position,offset=freeform?0:.5;return{x:(margin+(p.x+offset)*cell)/totalWidth*100,y:(margin+(p.y+offset)*cell)/totalHeight*100};};
  const route=state.route.map(id=>{const p=center(id);return`${p.x},${p.y}`;}).join(' ');
  const player=center(state.current);
  return <div ref={ref} className="gameplay-overlay" role="application" aria-label="Maze gameplay area" tabIndex={0} onKeyDown={keyDown} onPointerDown={down} onPointerUp={up}>
    {breadcrumbs&&state.route.length>1&&<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={route} vectorEffect="non-scaling-stroke"/></svg>}
    {current.neighbors.map(id=>{const p=center(id),point=graph.nodes.get(id)!.position;return<button key={id} type="button" aria-label={freeform?`Move to adjacent region ${id.slice(2)}`:`Move to column ${point.x+1}, row ${point.y+1}`} onClick={()=>move(id)} style={{left:`${p.x}%`,top:`${p.y}%`}}/>;})}
    <span className="game-player" style={{left:`${player.x}%`,top:`${player.y}%`}} aria-hidden="true"/>
  </div>;
}

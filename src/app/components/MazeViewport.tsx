import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react';

type Point={x:number;y:number};
type Props={giant:boolean;navigationEnabled:boolean;children:ReactNode};
const MIN_ZOOM=.5;
const MAX_ZOOM=5;

export default function MazeViewport({giant,navigationEnabled,children}:Props){
  const viewportRef=useRef<HTMLDivElement>(null);
  const [view,setView]=useState({scale:1,x:0,y:0});
  const drag=useRef<{pointerId:number;origin:Point;start:Point}|null>(null);
  const pointers=useRef(new Map<number,Point>());
  const pinch=useRef<{distance:number;center:Point;view:{scale:number;x:number;y:number}}|null>(null);
  const clamp=(value:number)=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value));
  const reset=useCallback(()=>setView({scale:1,x:0,y:0}),[]);
  useEffect(()=>{reset();},[giant,reset]);
  const zoomAt=(nextScale:number,client?:Point)=>setView(current=>{
    const scale=clamp(nextScale);const rect=viewportRef.current?.getBoundingClientRect();
    if(!rect||scale===current.scale)return {...current,scale};
    const anchor=client??{x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const localX=anchor.x-rect.left,localY=anchor.y-rect.top,ratio=scale/current.scale;
    return {scale,x:localX-(localX-current.x)*ratio,y:localY-(localY-current.y)*ratio};
  });
  const wheel=(event:WheelEvent<HTMLDivElement>)=>{event.preventDefault();zoomAt(view.scale*Math.exp(-event.deltaY*.0015),{x:event.clientX,y:event.clientY});};
  const down=(event:PointerEvent<HTMLDivElement>)=>{
    if(!navigationEnabled||event.button!==0)return;
    event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2){
      const [a,b]=[...pointers.current.values()];
      pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},view};drag.current=null;return;
    }
    drag.current={pointerId:event.pointerId,origin:{x:view.x,y:view.y},start:{x:event.clientX,y:event.clientY}};
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    if(!pointers.current.has(event.pointerId))return;event.preventDefault();pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch.current&&pointers.current.size>=2){
      const [a,b]=[...pointers.current.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const scale=clamp(pinch.current.view.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.current.distance));
      const ratio=scale/pinch.current.view.scale;
      setView({scale,x:center.x-(pinch.current.center.x-pinch.current.view.x)*ratio,y:center.y-(pinch.current.center.y-pinch.current.view.y)*ratio});return;
    }
    const active=drag.current;if(active?.pointerId===event.pointerId)setView(current=>({...current,x:active.origin.x+event.clientX-active.start.x,y:active.origin.y+event.clientY-active.start.y}));
  };
  const up=(event:PointerEvent<HTMLDivElement>)=>{pointers.current.delete(event.pointerId);if(drag.current?.pointerId===event.pointerId)drag.current=null;if(pointers.current.size<2)pinch.current=null;};

  if(!giant)return <>{children}</>;
  return <section className="giant-maze-shell" aria-label="Giant maze viewport">
    <div className="maze-viewport-toolbar" role="group" aria-label="Maze zoom controls">
      <button type="button" className="btn btn-sm" aria-label="Zoom out" onClick={()=>zoomAt(view.scale*.8)}>−</button>
      <output aria-label="Maze zoom level">{Math.round(view.scale*100)}%</output>
      <button type="button" className="btn btn-sm" aria-label="Zoom in" onClick={()=>zoomAt(view.scale/.8)}>+</button>
      <button type="button" className="btn btn-sm" onClick={reset}>Fit</button>
      <button type="button" className="btn btn-sm" onClick={reset}>Reset view</button>
      <span className="maze-viewport-hint">Choose Scroll, then drag to pan. Use the wheel to zoom.</span>
    </div>
    <div ref={viewportRef} className={`giant-maze-viewport${navigationEnabled?' is-pannable':''}`}
      onWheel={wheel} onPointerDownCapture={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="giant-maze-stage" style={{transform:`translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})`}}>{children}</div>
    </div>
  </section>;
}

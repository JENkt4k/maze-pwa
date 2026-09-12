import { useMemo } from 'react';
import { applyKnowledge, floodDistances, type Heading, type MouseEvent } from '../../maze/micromouse';
import type { MazeGraph, NodeId } from '../../maze/graph';

type Props={graph:MazeGraph;events:readonly MouseEvent[];eventIndex:number;cell:number;margin:number;width:number;height:number;showWalls:boolean;showFlood:boolean;showRoute:boolean};
const angle:Record<Heading,number>={n:-90,e:0,s:90,w:180};
const directions=[{heading:'n' as const,dx:0,dy:-1},{heading:'e' as const,dx:1,dy:0},{heading:'s' as const,dx:0,dy:1},{heading:'w' as const,dx:-1,dy:0}];

export default function MicromouseOverlay({graph,events,eventIndex,cell,margin,width,height,showWalls,showFlood,showRoute}:Props){
  const frame=useMemo(()=>{
    const visible=events.slice(0,eventIndex),knowledge=applyKnowledge(visible),discovered=new Set<NodeId>(),route:NodeId[]=[graph.start];
    let node=graph.start,heading:Heading='n',phase:'search'|'return'|'speed'='search';
    for(const event of visible){phase=event.phase;if(event.type==='sense')discovered.add(event.node);if(event.type==='move'){node=event.node;heading=event.heading;if(route[route.length-1]!==event.from)route.push(event.from);route.push(event.node);}if(event.type==='phase'){node=event.node;heading=event.heading;if(route[route.length-1]!==event.node)route.push(event.node);}}
    const target=phase==='return'?graph.start:graph.goals[0],distances=floodDistances(graph,knowledge,target,phase!=='speed');
    return{knowledge,discovered,route,node,heading,phase,distances};
  },[events,eventIndex,graph]);
  const center=(id:NodeId)=>{const point=graph.nodes.get(id)!.position;return{x:margin+(point.x+.5)*cell,y:margin+(point.y+.5)*cell};};
  const points=frame.route.map(id=>{const point=center(id);return`${point.x},${point.y}`;}).join(' '),current=center(frame.node);
  return <svg className="micromouse-overlay-svg" viewBox={`0 0 ${width*cell+margin*2} ${height*cell+margin*2}`} aria-label={`Micromouse ${frame.phase} visualization`}>
    <g className="mouse-discovered">{[...frame.discovered].map(id=>{const p=graph.nodes.get(id)!.position;return<rect key={id} x={margin+p.x*cell} y={margin+p.y*cell} width={cell} height={cell}/>;})}</g>
    {showRoute&&points&&<polyline className="mouse-route" points={points}/>}
    {showFlood&&<g className="mouse-flood-values">{[...frame.discovered].map(id=>{const p=center(id),value=frame.distances.get(id);return value===undefined?null:<text key={id} x={p.x} y={p.y}>{value}</text>;})}</g>}
    {showWalls&&<g className="mouse-known-walls">{[...frame.knowledge].flatMap(([id,walls])=>{const p=graph.nodes.get(id)?.position;if(!p)return[];return directions.flatMap(direction=>walls[direction.heading]==='blocked'?[<line key={`${id}:${direction.heading}`} x1={margin+(p.x+(direction.heading==='e'?1:0))*cell} y1={margin+(p.y+(direction.heading==='s'?1:0))*cell} x2={margin+(p.x+(direction.heading==='e'?1:direction.heading==='w'?0:1))*cell} y2={margin+(p.y+(direction.heading==='s'?1:direction.heading==='n'?0:1))*cell}/>]:[]);})}</g>}
    <g className="mouse-robot" transform={`translate(${current.x} ${current.y}) rotate(${angle[frame.heading]})`}><path d={`M ${cell*.34} 0 L ${-cell*.24} ${cell*.23} L ${-cell*.24} ${-cell*.23} Z`}/><circle cx={-cell*.1} cy={0} r={cell*.08}/></g>
  </svg>;
}

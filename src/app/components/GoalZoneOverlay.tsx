import type { MazeGraph, NodeId } from '../../maze/graph';

export default function GoalZoneOverlay({graph,goals,cell,margin,width,height}:{graph:MazeGraph;goals:readonly NodeId[];cell:number;margin:number;width:number;height:number}){
  return <svg className="goal-zone-overlay-svg" viewBox={`0 0 ${width*cell+margin*2} ${height*cell+margin*2}`} aria-label={`${goals.length}-cell goal zone`}>
    <g className="mouse-goal-zone">{goals.map(id=>{const point=graph.nodes.get(id)?.position;return point?<rect key={id} x={margin+point.x*cell+2} y={margin+point.y*cell+2} width={cell-4} height={cell-4} rx={cell*.18}/>:null;})}</g>
  </svg>;
}

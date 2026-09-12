import type { MazePoint, MazeResult } from '../maze';
import type { MazeGraph } from '../../maze/graph';

type Props={data:MazeResult;graph:MazeGraph;mode:'start'|'goal';cell:number;margin:number;onSelect:(point:MazePoint)=>void};

export default function EndpointOverlay({data,graph,mode,cell,margin,onSelect}:Props){
  const width=data.maze[0]?.length??1,height=data.maze.length;
  const totalWidth=width*cell+2*margin,totalHeight=height*cell+2*margin;
  if(data.geometry)return <div className="endpoint-overlay" role="grid" aria-label={`Choose ${mode} cell`}>
    {[...graph.nodes.values()].map((node,index)=><button key={node.id} type="button" role="gridcell"
      aria-label={`Set ${mode} at region ${index+1}`} title={`Set ${mode}`} onClick={()=>onSelect(node.position)}
      style={{left:`${(margin+node.position.x*cell)/totalWidth*100}%`,top:`${(margin+node.position.y*cell)/totalHeight*100}%`,width:`${cell*.8/totalWidth*100}%`,height:`${cell*.8/totalHeight*100}%`,transform:'translate(-50%,-50%)'}}/>) }
  </div>;
  return <div className="endpoint-overlay" role="grid" aria-label={`Choose ${mode} cell`}>
    {data.mask.flatMap((row,y)=>row.flatMap((active,x)=>active?[<button
      key={`${x},${y}`} type="button" role="gridcell"
      aria-label={`Set ${mode} at column ${x+1}, row ${y+1}`}
      title={`Set ${mode}`} onClick={()=>onSelect({x,y})}
      style={{left:`${(margin+x*cell)/totalWidth*100}%`,top:`${(margin+y*cell)/totalHeight*100}%`,width:`${cell/totalWidth*100}%`,height:`${cell/totalHeight*100}%`}}
    />]:[]))}
  </div>;
}

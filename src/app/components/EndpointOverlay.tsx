import type { MazePoint, MazeResult } from '../maze';

type Props={data:MazeResult;mode:'start'|'goal';cell:number;margin:number;onSelect:(point:MazePoint)=>void};

export default function EndpointOverlay({data,mode,cell,margin,onSelect}:Props){
  const width=data.maze[0]?.length??1,height=data.maze.length;
  const totalWidth=width*cell+2*margin,totalHeight=height*cell+2*margin;
  return <div className="endpoint-overlay" role="grid" aria-label={`Choose ${mode} cell`}>
    {data.mask.flatMap((row,y)=>row.flatMap((active,x)=>active?[<button
      key={`${x},${y}`} type="button" role="gridcell"
      aria-label={`Set ${mode} at column ${x+1}, row ${y+1}`}
      title={`Set ${mode}`} onClick={()=>onSelect({x,y})}
      style={{left:`${(margin+x*cell)/totalWidth*100}%`,top:`${(margin+y*cell)/totalHeight*100}%`,width:`${cell/totalWidth*100}%`,height:`${cell/totalHeight*100}%`}}
    />]:[]))}
  </div>;
}

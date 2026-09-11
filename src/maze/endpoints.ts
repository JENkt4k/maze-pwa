import type { MazePoint, MazeResult } from '../app/maze';

export type EndpointStrategy='opposite'|'farthest'|'random';
const directions=[{dx:1,dy:0,wall:'e'},{dx:-1,dy:0,wall:'w'},{dx:0,dy:1,wall:'s'},{dx:0,dy:-1,wall:'n'}] as const;
const key=(point:MazePoint)=>`${point.x},${point.y}`;

function farthestFrom(result:MazeResult,start:MazePoint):MazePoint{
  const points=new Map<string,MazePoint>([[key(start),start]]),queue=[start];
  for(let head=0;head<queue.length;head++){
    const current=queue[head],cell=result.maze[current.y][current.x];
    for(const direction of directions){
      if(cell[direction.wall])continue;
      const next={x:current.x+direction.dx,y:current.y+direction.dy},id=key(next);
      if(!points.has(id)){points.set(id,next);queue.push(next);}
    }
  }
  return queue[queue.length-1];
}

export function chooseEndpoints(result:MazeResult,strategy:EndpointStrategy,seed=0):{startCell?:MazePoint;goalCell?:MazePoint}{
  if(strategy==='opposite')return {};
  const active=result.mask.flatMap((row,y)=>row.flatMap((on,x)=>on?[{x,y}]:[]));
  if(strategy==='random'){
    const first=Math.abs(seed|0)%active.length;
    const offset=active.length>1?1+(Math.abs(Math.imul(seed|0,1103515245)+12345)%(active.length-1)):0;
    return {startCell:active[first],goalCell:active[(first+offset)%active.length]};
  }
  const first=farthestFrom(result,active[0]);
  return {startCell:first,goalCell:farthestFrom(result,first)};
}

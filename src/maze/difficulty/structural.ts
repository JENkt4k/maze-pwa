import type { MazeGraphAnalysisContext } from './types';

const geometricDistance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

function falseHopeScore(context:MazeGraphAnalysisContext):number{
  let score=0;const accounted=new Set<number>();
  context.shortestPath.forEach(node=>{
    const entries=context.adjacency[node].filter(next=>!context.shortestPathSet.has(next));
    for(const entry of entries){
      if(accounted.has(entry))continue;
      const seen=new Set<number>([entry]),attachments=new Set<number>([node]),queue=[entry];let minimum=geometricDistance(context.positions[entry],context.positions[context.goal]);
      for(let head=0;head<queue.length;head++)for(const next of context.adjacency[queue[head]]){
        if(context.shortestPathSet.has(next)){attachments.add(next);continue;}if(seen.has(next))continue;
        seen.add(next);queue.push(next);minimum=Math.min(minimum,geometricDistance(context.positions[next],context.positions[context.goal]));
      }
      seen.forEach(cell=>accounted.add(cell));
      if(attachments.size===1)score+=Math.log2(seen.size+1)/(1+minimum);
    }
  });
  return score;
}

function farthest(context:MazeGraphAnalysisContext,start:number):{node:number;distance:number}{
  const distances=new Int32Array(context.ids.length).fill(-1),queue=[start];distances[start]=0;let node=start;
  for(let head=0;head<queue.length;head++){
    const current=queue[head];if(distances[current]>distances[node]||(distances[current]===distances[node]&&current<node))node=current;
    for(const next of context.adjacency[current])if(distances[next]===-1){distances[next]=distances[current]+1;queue.push(next);}
  }
  return{node,distance:distances[node]};
}

function direction(dx:number,dy:number):string{
  if(Math.abs(dx)>Math.abs(dy)*2)return dx>0?'E':'W';
  if(Math.abs(dy)>Math.abs(dx)*2)return dy>0?'S':'N';
  return`${dx>=0?'E':'W'}${dy>=0?'S':'N'}`;
}

function repetition(context:MazeGraphAnalysisContext):{cells:number;rate:number}{
  const frequencies=new Map<string,number>();
  context.adjacency.forEach((neighbors,node)=>{
    const center=context.positions[node];
    const neighborhood=neighbors.map(next=>{
      const position=context.positions[next];
      return`${direction(position.x-center.x,position.y-center.y)}${context.degree[next]}`;
    }).sort().join(',');
    const signature=`${context.degree[node]}|${neighborhood}`;
    frequencies.set(signature,(frequencies.get(signature)??0)+1);
  });
  const cells=[...frequencies.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
  return{cells,rate:cells/Math.max(1,context.ids.length)};
}

export function structuralMetrics(context:MazeGraphAnalysisContext){
  const vertices=context.ids.length,edges=context.adjacency.reduce((sum,neighbors)=>sum+neighbors.length,0)/2;
  const cycleRank=Math.max(0,edges-vertices+1),first=farthest(context,context.start),diameter=farthest(context,first.node).distance,patterns=repetition(context);
  return{
    falseHopeScore:falseHopeScore(context),
    cycleRank,
    loopDensity:cycleRank/Math.max(1,vertices),
    repeatedLocalPatternCells:patterns.cells,
    localPatternRepetitionRate:patterns.rate,
    approximateGraphDiameter:diameter,
    startGoalDiameterRatio:(context.shortestPath.length-1)/Math.max(1,diameter),
  };
}

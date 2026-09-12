import type { MazeGraphAnalysisContext } from './types';

export function goalDeceptionMetrics(context:MazeGraphAnalysisContext){
  const goal=context.positions[context.goal],cardinal=context.positions.every(point=>Number.isInteger(point.x)&&Number.isInteger(point.y))&&context.adjacency.every((neighbors,index)=>neighbors.every(next=>Math.abs(context.positions[index].x-context.positions[next].x)+Math.abs(context.positions[index].y-context.positions[next].y)===1));
  const distance=(index:number)=>cardinal?Math.abs(context.positions[index].x-goal.x)+Math.abs(context.positions[index].y-goal.y):Math.hypot(context.positions[index].x-goal.x,context.positions[index].y-goal.y);
  let deceptive=0,goalDeceptionMagnitude=0;
  for(let index=1;index<context.shortestPath.length;index++){const delta=distance(context.shortestPath[index])-distance(context.shortestPath[index-1]);if(delta>1e-9){deceptive++;goalDeceptionMagnitude+=delta;}}
  const length=context.shortestPath.length-1;return{goalDeceptionRate:length?deceptive/length:0,goalDeceptionMagnitude};
}

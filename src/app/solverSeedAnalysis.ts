import { mazeToGraph } from '../maze/graph';
import { SOLVERS, solveMaze, type SolverId } from '../maze/solvers';
import { createMaze, type MazeParams } from './maze';

export type SolverSeedCount=10|25|50;
export type SolverSeedAggregate=Readonly<{algorithm:SolverId;runs:number;meanDiscovered:number;meanExpanded:number;meanPathLength:number;meanTurns:number;meanEvents:number}>;
export type SolverSeedResult=Readonly<{completed:number;total:number;baseSeed:number;results:readonly SolverSeedAggregate[]}>;

const mean=(values:readonly number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
export function analyzeSolverSeeds(params:MazeParams,count:SolverSeedCount,onProgress?:(result:SolverSeedResult)=>void):SolverSeedResult{
  const ids=Object.keys(SOLVERS) as SolverId[],runs=new Map(ids.map(id=>[id,[] as ReturnType<typeof solveMaze>[]]));
  let result:SolverSeedResult={completed:0,total:count,baseSeed:params.seed,results:[]};
  for(let index=0;index<count;index++){
    const graph=mazeToGraph(createMaze({...params,seed:(params.seed+index)|0}));
    ids.forEach(id=>runs.get(id)!.push(solveMaze(graph,id)));
    result={completed:index+1,total:count,baseSeed:params.seed,results:ids.map(algorithm=>{
      const values=runs.get(algorithm)!;
      return{algorithm,runs:values.length,meanDiscovered:mean(values.map(run=>run.metrics.discovered)),meanExpanded:mean(values.map(run=>run.metrics.expanded)),meanPathLength:mean(values.map(run=>run.metrics.pathLength)),meanTurns:mean(values.map(run=>run.metrics.turns)),meanEvents:mean(values.map(run=>run.events.length))};
    })};
    onProgress?.(result);
  }
  return result;
}

import { compareMicromouseStrategies, DEFAULT_MOUSE_PHYSICS, type MousePhysics, type MouseStrategyId } from '../maze/micromouse';
import { mazeToGraph, nodeId } from '../maze/graph';
import { matchingMicromouseFormat, micromouseEndpoints, micromouseGoalCells, micromouseGoalPassages } from '../maze/micromouseFormats';
import { createMaze, openMazePassages, type MazeParams } from './maze';

export type BatchSeedCount=10|25|50;
export type BatchStrategyResult=Readonly<{strategy:MouseStrategyId;completed:number;runs:number;completionRate:number;meanSearchTimeMs:number;medianSearchTimeMs:number;meanSearchCells:number;meanRevisits:number;meanExploredPercent:number;meanSpeedTimeMs:number}>;
export type MicromouseBatchResult=Readonly<{completed:number;total:number;results:readonly BatchStrategyResult[]}>;

const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const median=(values:number[])=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

export function runMicromouseBatch(params:MazeParams,total:BatchSeedCount,motion:Pick<MousePhysics,'maxSpeedMps'|'accelerationMps2'|'turn90Ms'>,onProgress?:(result:MicromouseBatchResult)=>void):MicromouseBatchResult{
  const rows=new Map<MouseStrategyId,{searchTime:number[];searchCells:number[];revisits:number[];explored:number[];speedTime:number[];completed:number}>();
  for(const strategy of ['flood-fill','tremaux','right-wall'] as const)rows.set(strategy,{searchTime:[],searchCells:[],revisits:[],explored:[],speedTime:[],completed:0});
  const summarize=(completed:number):MicromouseBatchResult=>({completed,total,results:[...rows].map(([strategy,row])=>({strategy,completed:row.completed,runs:completed,completionRate:completed?row.completed/completed:0,meanSearchTimeMs:mean(row.searchTime),medianSearchTimeMs:median(row.searchTime),meanSearchCells:mean(row.searchCells),meanRevisits:mean(row.revisits),meanExploredPercent:mean(row.explored),meanSpeedTimeMs:mean(row.speedTime)}))});
  for(let index=0;index<total;index++){
    const format=matchingMicromouseFormat(params.width,params.height),endpoints=format?micromouseEndpoints(format):undefined,competitionGoal=Boolean(endpoints&&params.goalCell?.x===endpoints.goal.x&&params.goalCell?.y===endpoints.goal.y);
    const generated=createMaze({...params,seed:(params.seed+index)|0}),maze=competitionGoal&&format?.id==='classic'?openMazePassages(generated,micromouseGoalPassages(format)):generated,baseGraph=mazeToGraph(maze);
    const graph=competitionGoal&&format?{...baseGraph,goals:micromouseGoalCells(format).map(nodeId).filter(id=>baseGraph.nodes.has(id))}:baseGraph;
    const physics={...DEFAULT_MOUSE_PHYSICS,...motion,cellMeters:(format?.cellPitchCm??18)/100};
    for(const result of compareMicromouseStrategies(graph,physics)){const row=rows.get(result.strategy)!;if(result.success){row.completed++;row.searchTime.push(result.metrics.search.timeMs);row.searchCells.push(result.metrics.search.cells);row.revisits.push(result.metrics.revisits);row.explored.push(result.metrics.exploredPercent);row.speedTime.push(result.metrics.speed.timeMs);}}
    onProgress?.(summarize(index+1));
  }
  return summarize(total);
}

import { compareMicromouseStrategies, DEFAULT_MOUSE_PHYSICS, type MousePhysics, type MouseStrategyId } from '../maze/micromouse';
import { mazeToGraph, nodeId } from '../maze/graph';
import { matchingMicromouseFormat, micromouseEndpoints, micromouseGoalCells, micromouseGoalPassages } from '../maze/micromouseFormats';
import { createMaze, openMazePassages, type MazeParams } from './maze';
import { matchingMouseProfile } from '../maze/micromouseProfiles';

export type BatchSeedCount=10|25|50;
export type BatchStrategyResult=Readonly<{strategy:MouseStrategyId;completed:number;runs:number;completionRate:number;meanSearchTimeMs:number;medianSearchTimeMs:number;meanSearchCells:number;meanRevisits:number;meanExploredPercent:number;meanSpeedTimeMs:number}>;
export type BatchRunResult=Readonly<{seed:number;strategy:MouseStrategyId;success:boolean;reason?:string;searchTimeMs:number;searchCells:number;returnTimeMs:number;speedTimeMs:number;totalTimeMs:number;speedCells:number;turns:number;revisits:number;exploredPercent:number;speedRouteQuality:number;collisions:number}>;
export type MicromouseBatchResult=Readonly<{completed:number;total:number;baseSeed:number;maze:Readonly<{width:number;height:number;generator:string;topology:string;mask:string;format:string}>;robotProfile:string;motion:Readonly<Pick<MousePhysics,'maxSpeedMps'|'accelerationMps2'|'turn90Ms'>>;results:readonly BatchStrategyResult[];runs:readonly BatchRunResult[]}>;

const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const median=(values:number[])=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

export function runMicromouseBatch(params:MazeParams,total:BatchSeedCount,motion:Pick<MousePhysics,'maxSpeedMps'|'accelerationMps2'|'turn90Ms'>,onProgress?:(result:MicromouseBatchResult)=>void):MicromouseBatchResult{
  const rows=new Map<MouseStrategyId,{searchTime:number[];searchCells:number[];revisits:number[];explored:number[];speedTime:number[];completed:number}>();
  const runs:BatchRunResult[]=[];
  for(const strategy of ['flood-fill','tremaux','right-wall'] as const)rows.set(strategy,{searchTime:[],searchCells:[],revisits:[],explored:[],speedTime:[],completed:0});
  const format=matchingMicromouseFormat(params.width,params.height);
  const summarize=(completed:number):MicromouseBatchResult=>({completed,total,baseSeed:params.seed,maze:{width:params.width,height:params.height,generator:params.generator??'dfs',topology:params.topology??'grid',mask:params.mask??'rectangle',format:format?.id??'custom'},robotProfile:matchingMouseProfile(motion),motion:{...motion},results:[...rows].map(([strategy,row])=>({strategy,completed:row.completed,runs:completed,completionRate:completed?row.completed/completed:0,meanSearchTimeMs:mean(row.searchTime),medianSearchTimeMs:median(row.searchTime),meanSearchCells:mean(row.searchCells),meanRevisits:mean(row.revisits),meanExploredPercent:mean(row.explored),meanSpeedTimeMs:mean(row.speedTime)})),runs:[...runs]});
  for(let index=0;index<total;index++){
    const endpoints=format?micromouseEndpoints(format):undefined,competitionGoal=Boolean(endpoints&&params.goalCell?.x===endpoints.goal.x&&params.goalCell?.y===endpoints.goal.y);
    const generated=createMaze({...params,seed:(params.seed+index)|0}),maze=competitionGoal&&format?.id==='classic'?openMazePassages(generated,micromouseGoalPassages(format)):generated,baseGraph=mazeToGraph(maze);
    const graph=competitionGoal&&format?{...baseGraph,goals:micromouseGoalCells(format).map(nodeId).filter(id=>baseGraph.nodes.has(id))}:baseGraph;
    const physics={...DEFAULT_MOUSE_PHYSICS,...motion,cellMeters:(format?.cellPitchCm??18)/100};
    for(const result of compareMicromouseStrategies(graph,physics)){const row=rows.get(result.strategy)!,metrics=result.metrics; runs.push({seed:(params.seed+index)|0,strategy:result.strategy,success:result.success,searchTimeMs:metrics.search.timeMs,searchCells:metrics.search.cells,returnTimeMs:metrics.return.timeMs,speedTimeMs:metrics.speed.timeMs,totalTimeMs:metrics.totalTimeMs,speedCells:metrics.speed.cells,turns:metrics.search.turns+metrics.return.turns+metrics.speed.turns,revisits:metrics.revisits,exploredPercent:metrics.exploredPercent,speedRouteQuality:metrics.speedRouteQuality,collisions:metrics.collisions});if(result.success){row.completed++;row.searchTime.push(metrics.search.timeMs);row.searchCells.push(metrics.search.cells);row.revisits.push(metrics.revisits);row.explored.push(metrics.exploredPercent);row.speedTime.push(metrics.speed.timeMs);}}
    onProgress?.(summarize(index+1));
  }
  return summarize(total);
}

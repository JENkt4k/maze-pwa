import type { MazeGraph } from '../graph';
import { branchMetrics, analyzeWrongBranches } from './branches';
import { goalDeceptionMetrics } from './deception';
import { decisionMetrics } from './entropy';
import { createAnalysisContext } from './graphAnalysis';
import type { Difficulty2Analysis } from './types';
import { normalizeDifficultyMetrics } from './normalize';
import { scoreDifficultyV2 } from './scoreV2';

const direction=(a:{x:number;y:number},b:{x:number;y:number})=>Math.atan2(b.y-a.y,b.x-a.x);
export function analyzeDifficultyV2(graph:MazeGraph):Difficulty2Analysis{
  const context=createAnalysisContext(graph),path=context.shortestPath;let turns=0;
  for(let index=2;index<path.length;index++)if(Math.abs(direction(context.positions[path[index-2]],context.positions[path[index-1]])-direction(context.positions[path[index-1]],context.positions[path[index]]))>1e-9)turns++;
  const branches=analyzeWrongBranches(context),branch=branchMetrics(context,branches),entropy=decisionMetrics(context,branches),deception=goalDeceptionMetrics(context),length=path.length-1;
  const raw={activeCells:context.ids.length,shortestPathLength:length,shortestPathTurns:turns,shortestPathTurnRate:length>1?turns/(length-1):0,solutionJunctionCount:path.filter(node=>context.degree[node]>=3).length,...branch,...entropy,...deception};
  const normalized=normalizeDifficultyMetrics(raw),scored=scoreDifficultyV2(normalized);
  return{version:2,raw,normalized,...scored};
}

export { createAnalysisContext } from './graphAnalysis';
export { analyzeWrongBranches } from './branches';
export { normalizeDifficultyMetrics } from './normalize';
export { difficultyLabel, scoreDifficultyV2 } from './scoreV2';
export type { Difficulty2Analysis, Difficulty2NormalizedMetrics, Difficulty2RawMetrics, DifficultyLabel, DifficultyMetric, MazeGraphAnalysisContext, WrongBranch } from './types';

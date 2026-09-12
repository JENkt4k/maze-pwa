import { DIFFICULTY_V2_ANALYSIS_CONFIG } from './config';
import type { MazeGraphAnalysisContext, WrongBranch } from './types';

export function analyzeWrongBranches(context:MazeGraphAnalysisContext):WrongBranch[]{
  const branches:WrongBranch[]=[];
  context.shortestPath.forEach((node,pathIndex)=>{
    const previous=context.shortestPath[pathIndex-1],next=context.shortestPath[pathIndex+1],signatures=new Set<string>();
    for(const entry of context.adjacency[node]){
      if(entry===previous||entry===next||context.shortestPathSet.has(entry))continue;
      const seen=new Set<number>([entry]),queue=[{node:entry,depth:1}];let depth=1;
      for(let head=0;head<queue.length;head++)for(const candidate of context.adjacency[queue[head].node]){
        if(context.shortestPathSet.has(candidate)||seen.has(candidate))continue;
        seen.add(candidate);const candidateDepth=queue[head].depth+1;depth=Math.max(depth,candidateDepth);queue.push({node:candidate,depth:candidateDepth});
      }
      const signature=[...seen].sort((a,b)=>a-b).join(',');if(signatures.has(signature))continue;signatures.add(signature);
      branches.push({pathIndex,cells:seen.size,depth});
    }
  });
  return branches;
}

export function branchMetrics(context:MazeGraphAnalysisContext,branches=analyzeWrongBranches(context)){
  const pathLength=Math.max(1,context.shortestPath.length-1),burden=branches.reduce((sum,branch)=>sum+branch.cells,0);
  return{
    wrongBranchCellBurden:burden,
    wrongBranchWeightedBurden:branches.reduce((sum,branch)=>sum+branch.cells*(1+DIFFICULTY_V2_ANALYSIS_CONFIG.branchPositionWeight*branch.pathIndex/pathLength),0),
    maxWrongBranchDepth:branches.reduce((maximum,branch)=>Math.max(maximum,branch.depth),0),
    meanWrongBranchDepth:branches.length?branches.reduce((sum,branch)=>sum+branch.depth,0)/branches.length:0,
    deepTrapScore:branches.reduce((sum,branch)=>sum+branch.depth**DIFFICULTY_V2_ANALYSIS_CONFIG.trapExponent,0),
  };
}

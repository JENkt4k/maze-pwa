import type { MazeGraphAnalysisContext, WrongBranch } from './types';

export function decisionMetrics(context:MazeGraphAnalysisContext,branches:readonly WrongBranch[]){
  const burdenByPathIndex=new Map<number,number>();for(const branch of branches)burdenByPathIndex.set(branch.pathIndex,(burdenByPathIndex.get(branch.pathIndex)??0)+branch.cells);
  let solutionDecisionCount=0,decisionEntropy=0,weightedDecisionEntropy=0;
  context.shortestPath.slice(0,-1).forEach((node,pathIndex)=>{
    const previous=context.shortestPath[pathIndex-1],choices=context.adjacency[node].filter(next=>next!==previous).length;
    if(choices<=1)return;solutionDecisionCount++;const entropy=Math.log2(choices);decisionEntropy+=entropy;weightedDecisionEntropy+=entropy*(1+Math.log1p(burdenByPathIndex.get(pathIndex)??0));
  });
  return{solutionDecisionCount,decisionEntropy,weightedDecisionEntropy};
}

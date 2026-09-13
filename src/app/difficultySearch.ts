import { analyzeDifficultyV2, type DifficultyLabel } from '../maze/difficulty';
import { mazeToGraph } from '../maze/graph';
import { createMaze, type MazeParams } from './maze';

export type DifficultySearchBudget=250|1000|10000;
export interface DifficultySearchProgress {completed:number;budget:number;bestParams:MazeParams;bestScore:number;bestLabel:DifficultyLabel;startingScore:number}

const radicalInverse=(index:number,base:number)=>{let value=0,fraction=1/base;for(let n=index;n>0;n=Math.floor(n/base)){value+=(n%base)*fraction;fraction/=base;}return value;};
export function deriveDifficultyCandidate(params:MazeParams,index:number):MazeParams{
  if(index===0)return{...params};
  return{...params,g:radicalInverse(index,2),b:radicalInverse(index,3)*.5,tau:radicalInverse(index,5)};
}

export function scoreDifficultyCandidate(params:MazeParams){
  return analyzeDifficultyV2(mazeToGraph(createMaze(params)));
}

export function searchDifficultyV2(params:MazeParams,budget:DifficultySearchBudget,onProgress?:(progress:DifficultySearchProgress)=>void):DifficultySearchProgress{
  const initial=scoreDifficultyCandidate(params);let bestParams={...params},bestScore=initial.score,bestLabel=initial.label;
  for(let index=1;index<budget;index++){
    const candidate=deriveDifficultyCandidate(params,index),analysis=scoreDifficultyCandidate(candidate);
    if(analysis.score>bestScore){bestParams=candidate;bestScore=analysis.score;bestLabel=analysis.label;}
    if((index+1)%10===0||index+1===budget)onProgress?.({completed:index+1,budget,bestParams,bestScore,bestLabel,startingScore:initial.score});
  }
  const result={completed:budget,budget,bestParams,bestScore,bestLabel,startingScore:initial.score};onProgress?.(result);return result;
}

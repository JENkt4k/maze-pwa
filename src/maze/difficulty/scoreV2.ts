import { DIFFICULTY_V2_ANALYSIS_CONFIG as config } from './config';
import type { Difficulty2NormalizedMetrics, DifficultyLabel } from './types';

export function difficultyLabel(score:number):DifficultyLabel{
  if(score<20)return'Easy';if(score<35)return'Moderate';if(score<50)return'Challenging';if(score<65)return'Hard';if(score<80)return'Expert';if(score<95)return'Brutal';return'Diabolical';
}

export function scoreDifficultyV2(normalized:Difficulty2NormalizedMetrics){
  const weight=config.activeMetrics.reduce((sum,key)=>sum+config.weights[key],0);
  const weighted=config.activeMetrics.reduce((sum,key)=>sum+normalized[key]*config.weights[key],0);
  const score=Math.max(0,Math.min(100,Math.round(weighted/weight*100)));
  return{score,label:difficultyLabel(score)};
}

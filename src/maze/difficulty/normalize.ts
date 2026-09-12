import { DIFFICULTY_V2_ANALYSIS_CONFIG as config } from './config';
import type { Difficulty2NormalizedMetrics, Difficulty2RawMetrics } from './types';

const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const saturate=(value:number,scale:number)=>clamp(1-Math.exp(-Math.max(0,value)/Math.max(Number.EPSILON,scale)));

export function normalizeDifficultyMetrics(raw:Difficulty2RawMetrics):Difficulty2NormalizedMetrics{
  const cells=Math.max(1,raw.activeCells),path=Math.max(1,raw.shortestPathLength),normalization=config.normalization;
  return{
    path:clamp(raw.shortestPathLength/cells*normalization.pathScale),
    turns:clamp(raw.shortestPathTurnRate),
    solutionJunctions:clamp(raw.solutionJunctionCount/path*normalization.solutionJunctionScale),
    branchBurden:clamp(raw.wrongBranchWeightedBurden/cells*normalization.branchBurdenScale),
    traps:clamp(raw.maxWrongBranchDepth/Math.sqrt(cells)*normalization.trapScale),
    entropy:saturate(raw.weightedDecisionEntropy,Math.sqrt(cells)*normalization.entropyCellScale),
    goalDeception:clamp(raw.goalDeceptionRate*normalization.goalDeceptionRateWeight+raw.goalDeceptionMagnitude/path*normalization.goalDeceptionMagnitudeWeight),
    falseHope:saturate(raw.falseHopeScore,Math.sqrt(cells)/normalization.falseHopeCellScale),
    loops:clamp(raw.loopDensity*normalization.loopDensityScale),
    repetition:clamp(raw.localPatternRepetitionRate),
  };
}

import type { NodeId, Point } from '../graph';

export interface MazeGraphAnalysisContext {
  ids: readonly NodeId[];
  indexById: ReadonlyMap<NodeId,number>;
  positions: readonly Point[];
  adjacency: readonly (readonly number[])[];
  degree: Uint8Array;
  start: number;
  goal: number;
  shortestPath: readonly number[];
  shortestPathSet: ReadonlySet<number>;
  shortestDistanceFromStart: Int32Array;
  shortestDistanceToGoal: Int32Array;
}

export interface Difficulty2RawMetrics {
  activeCells:number;
  shortestPathLength:number;
  shortestPathTurns:number;
  shortestPathTurnRate:number;
  solutionJunctionCount:number;
  solutionDecisionCount:number;
  wrongBranchCellBurden:number;
  wrongBranchWeightedBurden:number;
  maxWrongBranchDepth:number;
  meanWrongBranchDepth:number;
  deepTrapScore:number;
  decisionEntropy:number;
  weightedDecisionEntropy:number;
  goalDeceptionRate:number;
  goalDeceptionMagnitude:number;
}

export interface Difficulty2Analysis {
  version:2;
  raw:Difficulty2RawMetrics;
}

export interface WrongBranch {
  pathIndex:number;
  cells:number;
  depth:number;
}

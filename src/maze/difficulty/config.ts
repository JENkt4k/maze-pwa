export const DIFFICULTY_V2_ANALYSIS_CONFIG={
  version:2,
  branchPositionWeight:.5,
  trapExponent:1.3,
  weights:{path:.16,turns:.06,solutionJunctions:.10,branchBurden:.20,traps:.12,entropy:.16,goalDeception:.10,falseHope:.05,loops:.03,repetition:.02},
  normalization:{pathScale:3,solutionJunctionScale:4,branchBurdenScale:2,trapScale:1.5,entropyCellScale:1,goalDeceptionRateWeight:.7,goalDeceptionMagnitudeWeight:.3},
  activeMetrics:['path','turns','solutionJunctions','branchBurden','traps','entropy','goalDeception'],
} as const;

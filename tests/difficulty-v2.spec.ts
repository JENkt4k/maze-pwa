import { createMaze } from '@src/app/maze';
import { analyzeDifficultyV2, createAnalysisContext, difficultyLabel, scoreDifficultyV2, structuralMetrics, type Difficulty2NormalizedMetrics } from '@src/maze/difficulty';
import { mazeToGraph, type MazeGraph, type MazeNode } from '@src/maze/graph';

type Definition={id:string;x:number;y:number;neighbors:string[]};
const graph=(definitions:Definition[],start='s',goal='g'):MazeGraph=>{
  const nodes=new Map<string,MazeNode>();for(const item of definitions)nodes.set(item.id,{id:item.id,position:{x:item.x,y:item.y},neighbors:item.neighbors});return{nodes,start,goals:[goal]};
};
const base=(extra:Definition[])=>graph([
  {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','g',...(extra[0]?[extra[0].id]:[])]},{id:'g',x:2,y:0,neighbors:['a']},...extra,
]);

test('a deeper wrong branch increases branch burden and trap score',()=>{
  const shallow=analyzeDifficultyV2(base([{id:'b',x:1,y:1,neighbors:['a']}]));
  const deep=analyzeDifficultyV2(base([{id:'b',x:1,y:1,neighbors:['a','c']},{id:'c',x:1,y:2,neighbors:['b','d']},{id:'d',x:1,y:3,neighbors:['c']}]));
  expect(deep.raw.wrongBranchCellBurden).toBeGreaterThan(shallow.raw.wrongBranchCellBurden);
  expect(deep.raw.maxWrongBranchDepth).toBeGreaterThan(shallow.raw.maxWrongBranchDepth);
  expect(deep.raw.deepTrapScore).toBeGreaterThan(shallow.raw.deepTrapScore);
  expect(deep.score).toBeGreaterThan(shallow.score);
});

test('more plausible exits increase solution decision entropy',()=>{
  const twoChoices=base([{id:'b',x:1,y:1,neighbors:['a']}]);
  const threeChoices=graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','g','b','c']},{id:'g',x:2,y:0,neighbors:['a']},
    {id:'b',x:1,y:1,neighbors:['a']},{id:'c',x:1,y:-1,neighbors:['a']},
  ]);
  const low=analyzeDifficultyV2(twoChoices),high=analyzeDifficultyV2(threeChoices);
  expect(high.raw.solutionDecisionCount).toBe(low.raw.solutionDecisionCount);
  expect(high.raw.decisionEntropy).toBeGreaterThan(low.raw.decisionEntropy);
  expect(high.raw.weightedDecisionEntropy).toBeGreaterThan(low.raw.weightedDecisionEntropy);
  expect(high.score).toBeGreaterThan(low.score);
});

test('correct moves away from the visible goal register as deception',()=>{
  const direct=base([]),deceptive=graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:-1,y:0,neighbors:['s','b']},{id:'b',x:-1,y:1,neighbors:['a','c']},
    {id:'c',x:1,y:1,neighbors:['b','g']},{id:'g',x:2,y:0,neighbors:['c']},
  ]);
  expect(analyzeDifficultyV2(direct).raw.goalDeceptionRate).toBe(0);
  expect(analyzeDifficultyV2(deceptive).raw.goalDeceptionRate).toBeGreaterThan(0);
  expect(analyzeDifficultyV2(deceptive).raw.goalDeceptionMagnitude).toBeGreaterThan(0);
  expect(analyzeDifficultyV2(deceptive).score).toBeGreaterThan(analyzeDifficultyV2(direct).score);
});

test.each([
  {topology:'grid' as const,mask:'heart' as const,b:0},{topology:'grid' as const,mask:'rectangle' as const,b:.5},
  {topology:'freeform' as const,mask:'brain' as const,b:.2},
])('analysis is deterministic, finite, and does not mutate $topology/$mask',params=>{
  const maze=createMaze({width:19,height:15,seed:42,g:.3,tau:.4,regionDensity:.45,irregularity:.7,...params}),mazeGraph=mazeToGraph(maze);
  const before=[...mazeGraph.nodes].map(([id,node])=>[id,node.position,[...node.neighbors]]),first=analyzeDifficultyV2(mazeGraph),second=analyzeDifficultyV2(mazeGraph);
  expect(second).toEqual(first);expect(Object.values(first.raw).every(Number.isFinite)).toBe(true);
  expect([...mazeGraph.nodes].map(([id,node])=>[id,node.position,[...node.neighbors]])).toEqual(before);
  expect(first.raw.activeCells).toBe(mazeGraph.nodes.size);
  expect(first.score).toBeGreaterThanOrEqual(0);expect(first.score).toBeLessThanOrEqual(100);
  expect(Object.values(first.normalized).every(value=>value>=0&&value<=1)).toBe(true);
});

test.each([[0,'Easy'],[19,'Easy'],[20,'Moderate'],[34,'Moderate'],[35,'Challenging'],[49,'Challenging'],[50,'Hard'],[64,'Hard'],[65,'Expert'],[79,'Expert'],[80,'Brutal'],[94,'Brutal'],[95,'Diabolical'],[100,'Diabolical']] as const)('score %i maps to %s', (score,label)=>expect(difficultyLabel(score)).toBe(label));

test('composite scoring clamps to 0..100 across all active metrics',()=>{
  const metrics=(value:number):Difficulty2NormalizedMetrics=>({path:value,turns:value,solutionJunctions:value,branchBurden:value,traps:value,entropy:value,goalDeception:value,falseHope:value,loops:value,repetition:value});
  expect(scoreDifficultyV2(metrics(0))).toEqual({score:0,label:'Easy'});
  expect(scoreDifficultyV2(metrics(1))).toEqual({score:100,label:'Diabolical'});
});

test('a wrong branch approaching the goal creates more false hope',()=>{
  const withBranch=(x:number,y:number)=>graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','g','b']},{id:'g',x:2,y:0,neighbors:['a']},{id:'b',x,y,neighbors:['a']},
  ]);
  expect(analyzeDifficultyV2(withBranch(1.9,.1)).raw.falseHopeScore).toBeGreaterThan(analyzeDifficultyV2(withBranch(8,8)).raw.falseHopeScore);
});

test('adding an edge records cycle rank and loop density',()=>{
  const tree=base([{id:'b',x:1,y:1,neighbors:['a']}]);
  const cycle=graph([
    {id:'s',x:0,y:0,neighbors:['a','g']},{id:'a',x:1,y:0,neighbors:['s','g']},{id:'g',x:2,y:0,neighbors:['s','a']},
  ]);
  expect(analyzeDifficultyV2(tree).raw.cycleRank).toBe(0);
  expect(analyzeDifficultyV2(cycle).raw.cycleRank).toBe(1);
  expect(analyzeDifficultyV2(cycle).raw.loopDensity).toBeGreaterThan(0);
});

test('repeated radius-one neighborhoods increase perceptual repetition',()=>{
  const pair=graph([{id:'s',x:0,y:0,neighbors:['g']},{id:'g',x:1,y:0,neighbors:['s']}]);
  const corridor=graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','b']},{id:'b',x:2,y:0,neighbors:['a','c']},
    {id:'c',x:3,y:0,neighbors:['b','d']},{id:'d',x:4,y:0,neighbors:['c','g']},{id:'g',x:5,y:0,neighbors:['d']},
  ]);
  expect(structuralMetrics(createAnalysisContext(corridor)).localPatternRepetitionRate).toBeGreaterThan(structuralMetrics(createAnalysisContext(pair)).localPatternRepetitionRate);
});

test('diameter ratio falls when the selected endpoints cover less of the graph',()=>{
  const full=graph([{id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','g']},{id:'g',x:2,y:0,neighbors:['a']}]);
  const partial=graph([
    {id:'s',x:0,y:0,neighbors:['a','b']},{id:'a',x:1,y:0,neighbors:['s','g']},{id:'g',x:2,y:0,neighbors:['a']},
    {id:'b',x:0,y:1,neighbors:['s','c']},{id:'c',x:0,y:2,neighbors:['b','d']},{id:'d',x:0,y:3,neighbors:['c']},
  ]);
  expect(analyzeDifficultyV2(full).raw.startGoalDiameterRatio).toBe(1);
  expect(analyzeDifficultyV2(partial).raw.startGoalDiameterRatio).toBeLessThan(1);
});

test('analysis context excludes unreachable islands and independently verifies the goal',()=>{
  const connected=graph([{id:'s',x:0,y:0,neighbors:['g']},{id:'g',x:1,y:0,neighbors:['s']},{id:'island',x:9,y:9,neighbors:[]}]);
  expect(createAnalysisContext(connected).ids).toHaveLength(2);
  expect(()=>createAnalysisContext(graph([{id:'s',x:0,y:0,neighbors:[]},{id:'g',x:1,y:0,neighbors:[]}]))).toThrow(/unreachable/);
});

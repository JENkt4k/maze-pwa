import { createMaze } from '@src/app/maze';
import { analyzeDifficultyV2, createAnalysisContext } from '@src/maze/difficulty';
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
});

test('more plausible exits increase solution decision entropy',()=>{
  const twoChoices=base([{id:'b',x:1,y:1,neighbors:['a']}]);
  const threeChoices=graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:1,y:0,neighbors:['s','g','b','c']},{id:'g',x:2,y:0,neighbors:['a']},
    {id:'b',x:1,y:1,neighbors:['a']},{id:'c',x:1,y:-1,neighbors:['a']},
  ]);
  const low=analyzeDifficultyV2(twoChoices).raw,high=analyzeDifficultyV2(threeChoices).raw;
  expect(high.solutionDecisionCount).toBe(low.solutionDecisionCount);
  expect(high.decisionEntropy).toBeGreaterThan(low.decisionEntropy);
  expect(high.weightedDecisionEntropy).toBeGreaterThan(low.weightedDecisionEntropy);
});

test('correct moves away from the visible goal register as deception',()=>{
  const direct=base([]),deceptive=graph([
    {id:'s',x:0,y:0,neighbors:['a']},{id:'a',x:-1,y:0,neighbors:['s','b']},{id:'b',x:-1,y:1,neighbors:['a','c']},
    {id:'c',x:1,y:1,neighbors:['b','g']},{id:'g',x:2,y:0,neighbors:['c']},
  ]);
  expect(analyzeDifficultyV2(direct).raw.goalDeceptionRate).toBe(0);
  expect(analyzeDifficultyV2(deceptive).raw.goalDeceptionRate).toBeGreaterThan(0);
  expect(analyzeDifficultyV2(deceptive).raw.goalDeceptionMagnitude).toBeGreaterThan(0);
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
});

test('analysis context excludes unreachable islands and independently verifies the goal',()=>{
  const connected=graph([{id:'s',x:0,y:0,neighbors:['g']},{id:'g',x:1,y:0,neighbors:['s']},{id:'island',x:9,y:9,neighbors:[]}]);
  expect(createAnalysisContext(connected).ids).toHaveLength(2);
  expect(()=>createAnalysisContext(graph([{id:'s',x:0,y:0,neighbors:[]},{id:'g',x:1,y:0,neighbors:[]}]))).toThrow(/unreachable/);
});

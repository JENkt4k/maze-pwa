import { analyzeSolverSeeds } from '@src/app/solverSeedAnalysis';

test('multi-seed solver analysis compares every algorithm on identical seed counts',()=>{
  const progress:number[]=[];
  const result=analyzeSolverSeeds({width:7,height:7,seed:42,g:.3,b:.1,tau:.4},10,value=>progress.push(value.completed));
  expect(result).toMatchObject({completed:10,total:10,baseSeed:42});
  expect(result.results.map(row=>row.algorithm)).toEqual(['dfs','bfs','dijkstra','astar']);
  expect(result.results.every(row=>row.runs===10&&row.meanExpanded>0&&row.meanEvents>0)).toBe(true);
  expect(progress).toEqual([1,2,3,4,5,6,7,8,9,10]);
  expect(result.results.find(row=>row.algorithm==='bfs')?.meanPathLength).toBe(result.results.find(row=>row.algorithm==='astar')?.meanPathLength);
});

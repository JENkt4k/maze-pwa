import { createMaze } from '@src/app/maze';
import { mazeToGraph } from '@src/maze/graph';
import { applyKnowledge, DEFAULT_MOUSE_PHYSICS, floodDistances, simulateMicromouse } from '@src/maze/micromouse';
import { solveMaze } from '@src/maze/solvers';

const graph=(seed=42,b=.15,width=11,height=9)=>mazeToGraph(createMaze({width,height,seed,g:.3,b,tau:.4}));

test.each([{seed:1,b:0,width:7,height:7},{seed:42,b:.15,width:11,height:9},{seed:9001,b:.5,width:17,height:13}])('Micromouse completes search, return, and optimal known speed run: %j',({seed,b,width,height})=>{
  const maze=graph(seed,b,width,height),result=simulateMicromouse(maze);
  expect(result.success).toBe(true);
  expect(result.events.filter(event=>event.type==='phase').map(event=>event.phase)).toEqual(['search','return','speed']);
  expect(result.routes.search[0]).toBe(maze.start);
  expect(result.routes.search.at(-1)).toBe(maze.goals[0]);
  expect(result.routes.return.at(-1)).toBe(maze.start);
  expect(result.routes.speed.at(-1)).toBe(maze.goals[0]);
  expect(result.metrics.speed.cells).toBeGreaterThanOrEqual(solveMaze(maze,'bfs').metrics.pathLength);
  expect(result.metrics.speedRouteQuality).toBeGreaterThanOrEqual(1);
  expect(result.metrics.totalTimeMs).toBe(result.metrics.search.timeMs+result.metrics.return.timeMs+result.metrics.speed.timeMs);
  expect(simulateMicromouse(maze)).toEqual(result);
});

test('wall knowledge starts partial and flood fill uses observed walls',()=>{
  const maze=graph(),result=simulateMicromouse(maze),firstSense=result.events.findIndex(event=>event.type==='sense')+1,knowledge=applyKnowledge(result.events,firstSense);
  expect(knowledge.size).toBeLessThan(maze.nodes.size);
  expect([...knowledge.values()].some(walls=>Object.values(walls).includes('unknown'))).toBe(true);
  const distances=floodDistances(maze,knowledge,maze.goals[0]);
  expect(distances.get(maze.goals[0])).toBe(0);
  expect(distances.has(maze.start)).toBe(true);
});

test('physics configuration changes simulated time without changing decisions',()=>{
  const maze=graph(),normal=simulateMicromouse(maze),slow=simulateMicromouse(maze,{...DEFAULT_MOUSE_PHYSICS,maxSpeedMps:.5,accelerationMps2:1});
  expect(slow.routes).toEqual(normal.routes);
  expect(slow.metrics.totalTimeMs).toBeGreaterThan(normal.metrics.totalTimeMs);
});

test('disconnected courses stop with a bounded failure result',()=>{
  const nodes=new Map([
    ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:[]}],
    ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:[]}],
  ]);
  const result=simulateMicromouse({nodes,start:'0,0',goals:['1,0']});
  expect(result.success).toBe(false);
  expect(result.reason).toMatch(/No route|exceeded/);
  expect(result.events.length).toBeLessThan(20);
});

test('freeform graphs are rejected because cardinal physics does not apply',()=>{
  const freeform=mazeToGraph(createMaze({width:9,height:9,seed:42,g:.3,b:.1,tau:.4,topology:'freeform'}));
  expect(()=>simulateMicromouse(freeform)).toThrow(/grid topology/);
});

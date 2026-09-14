import { createMaze, openMazePassages } from '@src/app/maze';
import { mazeToGraph } from '@src/maze/graph';
import { applyKnowledge, compareMicromouseStrategies, DEFAULT_MOUSE_PHYSICS, DEFAULT_MOUSE_REALISM, floodDistances, simulateMicromouse } from '@src/maze/micromouse';
import { MICROMOUSE_FORMATS, matchingMicromouseFormat, micromouseEndpoints, micromouseFootprintMeters, micromouseGoalCells, micromouseGoalPassages } from '@src/maze/micromouseFormats';
import { matchingMouseProfile, MOUSE_PROFILES } from '@src/maze/micromouseProfiles';
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

test('sensor range reveals visible corridor walls beyond the current cell',()=>{
  const nodes=new Map(Array.from({length:5},(_,x)=>{const id=`${x},0`,neighbors=[x>0?`${x-1},0`:null,x<4?`${x+1},0`:null].filter((value):value is string=>value!==null);return[id,{id,position:{x,y:0},neighbors}] as const;})),maze={nodes,start:'0,0',goals:['4,0']};
  const near=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',{...DEFAULT_MOUSE_REALISM,sensorRangeCells:1}),far=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',{...DEFAULT_MOUSE_REALISM,sensorRangeCells:4});
  const first=(result:typeof near)=>result.events.findIndex(event=>event.type==='sense')+1;
  expect(applyKnowledge(near.events,first(near)).size).toBe(2);
  expect(applyKnowledge(far.events,first(far)).size).toBe(5);
});

test('seeded sensor noise creates repeatable collisions and recovery penalties',()=>{
  const nodes=new Map([
    ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:['1,0']}],
    ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:['0,0','1,1']}],
    ['0,1',{id:'0,1',position:{x:0,y:1},neighbors:['1,1']}],
    ['1,1',{id:'1,1',position:{x:1,y:1},neighbors:['1,0','0,1']}],
  ]),maze={nodes,start:'0,0',goals:['1,1']},noisy={...DEFAULT_MOUSE_REALISM,sensorNoise:1,collisionMs:500};
  const result=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',noisy,7),repeat=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',noisy,7);
  expect(result).toEqual(repeat);
  expect(result.metrics.collisions).toBeGreaterThan(0);
  expect(result.events.some(event=>event.type==='collision')).toBe(true);
  const slower=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',{...noisy,collisionMs:1000},7);
  expect(slower.metrics.totalTimeMs-result.metrics.totalTimeMs).toBe(result.metrics.collisions*500);
});

test('physics configuration changes simulated time without changing decisions',()=>{
  const maze=graph(),normal=simulateMicromouse(maze),slow=simulateMicromouse(maze,{...DEFAULT_MOUSE_PHYSICS,maxSpeedMps:.5,accelerationMps2:1});
  expect(slow.routes).toEqual(normal.routes);
  expect(slow.metrics.totalTimeMs).toBeGreaterThan(normal.metrics.totalTimeMs);
  const half=simulateMicromouse(maze,{...DEFAULT_MOUSE_PHYSICS,cellMeters:.09});
  expect(half.routes).toEqual(normal.routes);
  expect(half.metrics.totalTimeMs).toBeLessThan(normal.metrics.totalTimeMs);
});

test('diagonal speed mode cuts learned corners and reduces speed-run time',()=>{
  const nodes=new Map([
    ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:['1,0']}],
    ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:['0,0','1,1']}],
    ['1,1',{id:'1,1',position:{x:1,y:1},neighbors:['1,0']}],
  ]),maze={nodes,start:'0,0',goals:['1,1']},standard=simulateMicromouse(maze),diagonal=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',{...DEFAULT_MOUSE_REALISM,diagonalSpeedRuns:true});
  expect(diagonal.routes.speed).toEqual(standard.routes.speed);
  expect(diagonal.metrics.speedDiagonalCuts).toBe(1);
  expect(diagonal.metrics.speedDistanceCells).toBeLessThan(standard.metrics.speedDistanceCells);
  expect(diagonal.metrics.speed.timeMs).toBeLessThan(standard.metrics.speed.timeMs);
});

test('traction caps effective acceleration and increases travel time',()=>{
  const maze=graph(),normal=simulateMicromouse(maze),limited=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill',{...DEFAULT_MOUSE_REALISM,tractionLimitMps2:1});
  expect(normal.routes).toEqual(limited.routes);
  expect(normal.metrics.effectiveAccelerationMps2).toBe(DEFAULT_MOUSE_PHYSICS.accelerationMps2);
  expect(limited.metrics.effectiveAccelerationMps2).toBe(1);
  expect(limited.metrics.totalTimeMs).toBeGreaterThan(normal.metrics.totalTimeMs);
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

test('competition formats preserve the standard footprint and endpoints',()=>{
  expect(micromouseFootprintMeters(MICROMOUSE_FORMATS.classic)).toEqual({width:2.88,height:2.88});
  expect(micromouseFootprintMeters(MICROMOUSE_FORMATS.half)).toEqual({width:2.88,height:2.88});
  expect(micromouseEndpoints(MICROMOUSE_FORMATS.classic)).toEqual({start:{x:0,y:15},goal:{x:7,y:7}});
  expect(micromouseGoalCells(MICROMOUSE_FORMATS.classic)).toHaveLength(4);
  expect(micromouseEndpoints(MICROMOUSE_FORMATS.half)).toEqual({start:{x:0,y:31},goal:{x:15,y:15}});
  expect(micromouseGoalCells(MICROMOUSE_FORMATS.half)).toHaveLength(1);
  expect(matchingMicromouseFormat(16,16)?.id).toBe('classic');
  expect(matchingMicromouseFormat(19,19)).toBeUndefined();
});

test('classic competition goal cells form one open 2x2 area',()=>{
  const format=MICROMOUSE_FORMATS.classic,endpoints=micromouseEndpoints(format);
  const opened=openMazePassages(createMaze({width:16,height:16,seed:111,g:.3,b:0,tau:.4,startCell:endpoints.start,goalCell:endpoints.goal}),micromouseGoalPassages(format));
  const [topLeft,topRight,bottomLeft,bottomRight]=micromouseGoalCells(format).map(point=>opened.maze[point.y][point.x]);
  expect(topLeft.e).toBe(0);expect(topRight.w).toBe(0);
  expect(topLeft.s).toBe(0);expect(bottomLeft.n).toBe(0);
  expect(topRight.s).toBe(0);expect(bottomRight.n).toBe(0);
  expect(bottomLeft.e).toBe(0);expect(bottomRight.w).toBe(0);
});

test('Micromouse chooses a reachable goal from a goal zone',()=>{
  const nodes=new Map([
    ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:['1,0']}],
    ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:['0,0']}],
    ['2,0',{id:'2,0',position:{x:2,y:0},neighbors:[]}],
  ]);
  const result=simulateMicromouse({nodes,start:'0,0',goals:['2,0','1,0']});
  expect(result.success).toBe(true);
  expect(result.routes.search.at(-1)).toBe('1,0');
  expect(result.routes.speed.at(-1)).toBe('1,0');
});

test('robot profiles are recognized and custom motion remains custom',()=>{
  expect(matchingMouseProfile(MOUSE_PROFILES.balanced.motion)).toBe('balanced');
  expect(matchingMouseProfile({...MOUSE_PROFILES.balanced.motion,turn90Ms:91})).toBe('custom');
});

test('exploration strategies produce distinct searches and retain a learned speed route',()=>{
  const nodes=new Map([
    ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:['1,0','0,1']}],
    ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:['0,0']}],
    ['0,1',{id:'0,1',position:{x:0,y:1},neighbors:['0,0','0,2']}],
    ['0,2',{id:'0,2',position:{x:0,y:2},neighbors:['0,1']}],
  ]),maze={nodes,start:'0,0',goals:['0,2']};
  const flood=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'flood-fill'),wall=simulateMicromouse(maze,DEFAULT_MOUSE_PHYSICS,'right-wall');
  expect(flood.success).toBe(true);expect(wall.success).toBe(true);
  expect(wall.metrics.search.cells).toBeGreaterThan(flood.metrics.search.cells);
  expect(wall.routes.speed).toEqual(flood.routes.speed);
});

test('strategy comparison benchmarks every strategy without event payloads',()=>{
  const comparison=compareMicromouseStrategies(graph());
  expect(comparison.map(row=>row.strategy)).toEqual(['flood-fill','tremaux','right-wall']);
  expect(comparison.every(row=>Number.isFinite(row.metrics.totalTimeMs))).toBe(true);
  expect(comparison.every(row=>!('events' in row))).toBe(true);
});

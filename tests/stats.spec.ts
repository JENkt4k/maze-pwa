import { createHash } from 'node:crypto';
import { createMaze, findMaxDifficulty, normalizeMarker, toSVG, type MazeParams } from '@src/app/maze';
import { mazeToGraph } from '@src/maze/graph';

const baseline: MazeParams = { width:19, height:19, seed:42, g:.3, b:.15, tau:.4 };

test('existing saved-maze layouts retain their v1 seed contract', () => {
  const result = createMaze(baseline);
  expect(createHash('sha256').update(JSON.stringify(result.maze)).digest('hex'))
    .toBe('f48cff5e6dad84404d160192edc4b6355786a5e4ae12c55281ec74db543234f4');
  expect(createMaze(baseline)).toEqual(result);
});

test.each([7, 19, 41])('connected, symmetric mazes with closed boundaries at size %i', width => {
  for (let seed = 0; seed < 15; seed++) for (const b of [0, .5]) {
    const m = createMaze({ ...baseline, width, height: width - 2, seed, b });
    const height = m.maze.length;
    expect(m.treeSteps).toHaveLength(width * height - 1);
    const visited = new Set(['0,0']), queue = [[0, 0]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], cell = m.maze[y][x];
      for (const [dx, dy, wall, opposite] of [[1,0,'e','w'],[-1,0,'w','e'],[0,1,'s','n'],[0,-1,'n','s']] as const) {
        if (cell[wall]) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) throw new Error('Open boundary');
        if (m.maze[ny][nx][opposite]) throw new Error('Asymmetric wall');
        const key = `${nx},${ny}`;
        if (!visited.has(key)) { visited.add(key); queue.push([nx,ny]); }
      }
    }
    expect(visited.size).toBe(width * height);
    expect(Object.values(m.stats).every(Number.isFinite)).toBe(true);
  }
});

test.each(['dfs','prim','kruskal'] as const)('%s generation is deterministic, connected, and records a spanning tree', generator => {
  const first=createMaze({...baseline,generator,b:0});
  const second=createMaze({...baseline,generator,b:0});
  expect(first).toEqual(second);
  expect(first.treeSteps).toHaveLength(baseline.width*baseline.height-1);
  expect(first.stats.L).toBeGreaterThan(0);
});

test.each((['ellipse','diamond','heart'] as const).flatMap(mask=>(['dfs','prim','kruskal'] as const).map(generator=>({mask,generator}))))('$mask mask works with $generator generation',({mask,generator})=>{
    const result=createMaze({...baseline,mask,generator,b:.2});
    const active=result.mask.flat().filter(Boolean).length;
    expect(result.treeSteps).toHaveLength(active-1);
    expect(mazeToGraph(result).nodes.size).toBe(active);
    expect(result.mask[result.start.y][result.start.x]).toBe(true);
    expect(result.mask[result.goal.y][result.goal.x]).toBe(true);
});

test.each(['ellipse','diamond','heart'] as const)('%s SVG closes every active-cell mask boundary',mask=>{
  const result=createMaze({...baseline,mask,b:0});
  const svg=toSVG(result,{cell:10,margin:0,showStartGoal:false});
  const lines=[...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
    .map(match=>match.slice(1).map(Number).join(','));
  for(let y=0;y<result.mask.length;y++) for(let x=0;x<result.mask[y].length;x++) if(result.mask[y][x]){
    if(y===result.mask.length-1||!result.mask[y+1][x]) expect(lines).toContain(`${x*10},${(y+1)*10},${(x+1)*10},${(y+1)*10}`);
    if(x===result.mask[y].length-1||!result.mask[y][x+1]) expect(lines).toContain(`${(x+1)*10},${y*10},${(x+1)*10},${(y+1)*10}`);
  }
});

test('solution length is the shortest route through tree and braid edges', () => {
  for (const b of [0, .5]) {
    const m = createMaze({ ...baseline, b });
    const adjacency = new Map<string, string[]>();
    const key = (x:number, y:number) => `${x},${y}`;
    for (const edge of [...m.treeSteps, ...m.braidEdits]) {
      const a = key(edge.x, edge.y), z = key(edge.nx, edge.ny);
      adjacency.set(a, [...(adjacency.get(a) ?? []), z]);
      adjacency.set(z, [...(adjacency.get(z) ?? []), a]);
    }
    const start = key(m.start.x, m.start.y), goal = key(m.goal.x, m.goal.y);
    const distances = new Map([[start, 0]]), queue = [start];
    for (let i=0;i<queue.length;i++) for (const next of adjacency.get(queue[i]) ?? []) {
      if (!distances.has(next)) { distances.set(next, distances.get(queue[i])! + 1); queue.push(next); }
    }
    expect(m.stats.L).toBe(distances.get(goal));
    expect(m.stats.J).toBe([...adjacency.values()].filter(neighbors => neighbors.length >= 3).length);
    expect(m.stats.E).toBe([...adjacency.values()].filter(neighbors => neighbors.length === 1).length);
  }
  expect(createMaze({...baseline,b:0}).stats).not.toEqual(createMaze({...baseline,b:.5}).stats);
});

test('trivial solutions have zero turn rate and finite scores', () => {
  expect(createMaze({...baseline,width:1,height:1}).stats).toEqual({L:0,T:0,J:0,E:0,D:0});
  expect(createMaze({...baseline,width:7,height:1,b:0}).stats).toMatchObject({L:6,T:0,J:0,E:2});
});

test.each([
  {width:0}, {height:102}, {width:7.5}, {seed:NaN}, {seed:Infinity}, {g:-1}, {b:2}, {tau:NaN},
])('rejects invalid generator input %j', invalid => {
  expect(() => createMaze({...baseline,...invalid})).toThrow(RangeError);
});

test('difficulty selection preserves seed, size and never worsens the current score', () => {
  const params = {...baseline,width:7,height:9,g:.31,tau:.41};
  const best = findMaxDifficulty(params);
  expect(best).toMatchObject({seed:params.seed,width:7,height:9});
  expect(createMaze(best).stats.D).toBeGreaterThanOrEqual(createMaze(params).stats.D);
  expect(params).toEqual({...baseline,width:7,height:9,g:.31,tau:.41});
});

test('marker markup is escaped and only bounded raster data is accepted', () => {
  const payload = '</text><image onload="alert(1)"/><text>';
  const svg = toSVG(createMaze(baseline), {cell:24,margin:12,startIcon:payload});
  expect(svg).toContain('&lt;/text&gt;');
  expect(svg).not.toContain('<image onload=');
  expect(normalizeMarker('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
  expect(normalizeMarker('data:image/png;base64,AAAA" onload="x')).toBeNull();
  expect(normalizeMarker('data:text/html;base64,AAAA')).toBeNull();
  expect(normalizeMarker('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  expect(normalizeMarker('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦');
  expect(normalizeMarker('x'.repeat(65))).toBeNull();
  expect(() => toSVG(createMaze(baseline),{cell:NaN,margin:12})).toThrow(RangeError);
});

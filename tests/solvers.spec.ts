import { createMaze } from '@src/app/maze';
import { mazeToGraph, requireNode, type MazeGraph, type NodeId } from '@src/maze/graph';
import { solveMaze, type SolverId } from '@src/maze/solvers';

const algorithms: SolverId[] = ['dfs', 'bfs', 'dijkstra', 'astar'];

function expectValidPath(graph: MazeGraph, path: readonly NodeId[]) {
  expect(path[0]).toBe(graph.start);
  expect(graph.goals).toContain(path.at(-1));
  for (let index = 1; index < path.length; index++) {
    expect(requireNode(graph, path[index - 1]).neighbors).toContain(path[index]);
  }
}

test.each(algorithms)('%s returns deterministic events and a valid route', algorithm => {
  const graph = mazeToGraph(createMaze({ width: 15, height: 13, seed: 8675309, g: .3, b: .25, tau: .4 }));
  const first = solveMaze(graph, algorithm);
  const second = solveMaze(graph, algorithm);

  expect(first).toEqual(second);
  expectValidPath(graph, first.path);
  expect(first.metrics.pathLength).toBe(first.path.length - 1);
  expect(first.events.slice(-first.path.length).every(event => event.type === 'path')).toBe(true);
});

test.each(Array.from({ length: 12 }, (_, seed) => seed + 1))('shortest-path solvers agree for braided maze seed %s', seed => {
  const graph = mazeToGraph(createMaze({ width: 17, height: 13, seed, g: .4, b: .4, tau: .5 }));
  const bfs = solveMaze(graph, 'bfs');
  const dijkstra = solveMaze(graph, 'dijkstra');
  const astar = solveMaze(graph, 'astar');

  expect(dijkstra.metrics.pathLength).toBe(bfs.metrics.pathLength);
  expect(astar.metrics.pathLength).toBe(bfs.metrics.pathLength);
  expect(astar.metrics.expanded).toBeLessThanOrEqual(dijkstra.metrics.expanded);
});

test('DFS exposes backtracking separately from its final path', () => {
  const graph: MazeGraph = {
    start: 'start',
    goals: ['goal'],
    nodes: new Map([
      ['start', { id: 'start', position: { x: 0, y: 0 }, neighbors: ['dead-end', 'goal'] }],
      ['dead-end', { id: 'dead-end', position: { x: 0, y: 1 }, neighbors: ['start'] }],
      ['goal', { id: 'goal', position: { x: 1, y: 0 }, neighbors: ['start'] }],
    ]),
  };
  const result = solveMaze(graph, 'dfs');
  expect(result.events.some(event => event.type === 'backtrack')).toBe(true);
  expect(result.events.filter(event => event.type === 'path')).toHaveLength(result.path.length);
});

test('the graph adapter is an independent snapshot of maze topology', () => {
  const data = createMaze({ width: 7, height: 7, seed: 12, g: .2, b: .1, tau: .3 });
  const graph = mazeToGraph(data);
  const startNeighbors = [...requireNode(graph, graph.start).neighbors];
  data.maze[data.start.y][data.start.x].e = data.maze[data.start.y][data.start.x].e ? 0 : 1;
  expect(requireNode(graph, graph.start).neighbors).toEqual(startNeighbors);
});

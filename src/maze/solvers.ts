import { requireNode, type MazeGraph, type NodeId } from './graph';

export type SolverId = 'dfs' | 'bfs' | 'dijkstra' | 'astar';
export type SolverEvent =
  | Readonly<{ type: 'discover'; node: NodeId; from?: NodeId }>
  | Readonly<{ type: 'expand'; node: NodeId }>
  | Readonly<{ type: 'backtrack'; node: NodeId; to: NodeId }>
  | Readonly<{ type: 'path'; node: NodeId; index: number }>;
export type SolverMetrics = Readonly<{
  discovered: number;
  expanded: number;
  pathLength: number;
  turns: number;
  cost: number;
}>;
export type SolverRun = Readonly<{
  algorithm: SolverId;
  events: readonly SolverEvent[];
  path: readonly NodeId[];
  metrics: SolverMetrics;
}>;
export type MazeSolver = Readonly<{
  id: SolverId;
  name: string;
  description: string;
  solve: (graph: MazeGraph) => SolverRun;
}>;

function reconstruct(parents: ReadonlyMap<NodeId, NodeId | null>, goal: NodeId): NodeId[] {
  const path: NodeId[] = [];
  let current: NodeId | null | undefined = goal;
  while (current != null) {
    path.push(current);
    current = parents.get(current);
  }
  return path.reverse();
}

function turnsIn(graph: MazeGraph, path: readonly NodeId[]): number {
  let turns = 0;
  for (let index = 2; index < path.length; index++) {
    const a = requireNode(graph, path[index - 2]).position;
    const b = requireNode(graph, path[index - 1]).position;
    const c = requireNode(graph, path[index]).position;
    if (b.x - a.x !== c.x - b.x || b.y - a.y !== c.y - b.y) turns++;
  }
  return turns;
}

function finish(algorithm: SolverId, graph: MazeGraph, events: SolverEvent[], path: NodeId[], discovered: number, expanded: number): SolverRun {
  path.forEach((node, index) => events.push({ type: 'path', node, index }));
  const pathLength = Math.max(0, path.length - 1);
  return { algorithm, events, path, metrics: { discovered, expanded, pathLength, turns: turnsIn(graph, path), cost: pathLength } };
}

function assertGraph(graph: MazeGraph) {
  requireNode(graph, graph.start);
  if (graph.goals.length === 0) throw new Error('Maze graph needs at least one goal');
  graph.goals.forEach(goal => requireNode(graph, goal));
}

function breadthFirst(graph: MazeGraph): SolverRun {
  assertGraph(graph);
  const goalSet = new Set(graph.goals), parents = new Map<NodeId, NodeId | null>([[graph.start, null]]);
  const queue = [graph.start], events: SolverEvent[] = [{ type: 'discover', node: graph.start }];
  let expanded = 0, goal: NodeId | null = null;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    events.push({ type: 'expand', node: current });
    expanded++;
    if (goalSet.has(current)) { goal = current; break; }
    for (const neighbor of requireNode(graph, current).neighbors) if (!parents.has(neighbor)) {
      parents.set(neighbor, current);
      queue.push(neighbor);
      events.push({ type: 'discover', node: neighbor, from: current });
    }
  }
  if (!goal) throw new Error('Maze goal is unreachable');
  return finish('bfs', graph, events, reconstruct(parents, goal), parents.size, expanded);
}

function depthFirst(graph: MazeGraph): SolverRun {
  assertGraph(graph);
  const goalSet = new Set(graph.goals), parents = new Map<NodeId, NodeId | null>([[graph.start, null]]);
  const events: SolverEvent[] = [{ type: 'discover', node: graph.start }];
  const stack = [{ node: graph.start, next: 0 }];
  let expanded = 0, goal: NodeId | null = null;
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.next === 0) {
      events.push({ type: 'expand', node: frame.node });
      expanded++;
      if (goalSet.has(frame.node)) { goal = frame.node; break; }
    }
    const neighbors = requireNode(graph, frame.node).neighbors;
    if (frame.next >= neighbors.length) {
      stack.pop();
      if (stack.length) events.push({ type: 'backtrack', node: frame.node, to: stack[stack.length - 1].node });
      continue;
    }
    const neighbor = neighbors[frame.next++];
    if (parents.has(neighbor)) continue;
    parents.set(neighbor, frame.node);
    events.push({ type: 'discover', node: neighbor, from: frame.node });
    stack.push({ node: neighbor, next: 0 });
  }
  if (!goal) throw new Error('Maze goal is unreachable');
  return finish('dfs', graph, events, reconstruct(parents, goal), parents.size, expanded);
}

type QueueItem = { node: NodeId; distance: number; score: number; order: number };
function bestFirst(graph: MazeGraph, algorithm: 'dijkstra' | 'astar'): SolverRun {
  assertGraph(graph);
  const goalSet = new Set(graph.goals), distances = new Map<NodeId, number>([[graph.start, 0]]);
  const parents = new Map<NodeId, NodeId | null>([[graph.start, null]]), closed = new Set<NodeId>();
  const events: SolverEvent[] = [{ type: 'discover', node: graph.start }];
  let order = 0, expanded = 0, goal: NodeId | null = null;
  const heuristic = (id: NodeId) => {
    if (algorithm === 'dijkstra') return 0;
    const point = requireNode(graph, id).position;
    return Math.min(...graph.goals.map(candidate => {
      const target = requireNode(graph, candidate).position;
      return Math.abs(point.x - target.x) + Math.abs(point.y - target.y);
    }));
  };
  const open: QueueItem[] = [{ node: graph.start, distance: 0, score: heuristic(graph.start), order: order++ }];
  while (open.length) {
    open.sort((a, b) => a.score - b.score || a.distance - b.distance || a.order - b.order);
    const item = open.shift()!;
    if (closed.has(item.node) || item.distance !== distances.get(item.node)) continue;
    closed.add(item.node);
    events.push({ type: 'expand', node: item.node });
    expanded++;
    if (goalSet.has(item.node)) { goal = item.node; break; }
    for (const neighbor of requireNode(graph, item.node).neighbors) {
      const distance = item.distance + 1;
      if (distance >= (distances.get(neighbor) ?? Infinity)) continue;
      const firstDiscovery = !distances.has(neighbor);
      distances.set(neighbor, distance);
      parents.set(neighbor, item.node);
      open.push({ node: neighbor, distance, score: distance + heuristic(neighbor), order: order++ });
      if (firstDiscovery) events.push({ type: 'discover', node: neighbor, from: item.node });
    }
  }
  if (!goal) throw new Error('Maze goal is unreachable');
  return finish(algorithm, graph, events, reconstruct(parents, goal), distances.size, expanded);
}

export const SOLVERS: Readonly<Record<SolverId, MazeSolver>> = {
  dfs: { id: 'dfs', name: 'DFS', description: 'Depth-first search explores one branch at a time and visibly backtracks.', solve: depthFirst },
  bfs: { id: 'bfs', name: 'BFS', description: 'Breadth-first search explores in layers and guarantees a shortest path.', solve: breadthFirst },
  dijkstra: { id: 'dijkstra', name: 'Dijkstra', description: 'Expands the lowest-cost frontier; unit edges produce a shortest path.', solve: graph => bestFirst(graph, 'dijkstra') },
  astar: { id: 'astar', name: 'A*', description: 'Uses Manhattan distance to focus the shortest-path search toward the goal.', solve: graph => bestFirst(graph, 'astar') },
};

export function solveMaze(graph: MazeGraph, algorithm: SolverId): SolverRun {
  return SOLVERS[algorithm].solve(graph);
}

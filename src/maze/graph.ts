import type { Cell, MazeResult } from '../app/maze';

export type NodeId = string;
export type Point = Readonly<{ x: number; y: number }>;
export type MazeNode = Readonly<{
  id: NodeId;
  position: Point;
  neighbors: readonly NodeId[];
}>;
export type MazeGraph = Readonly<{
  nodes: ReadonlyMap<NodeId, MazeNode>;
  start: NodeId;
  goals: readonly NodeId[];
}>;

const DIRECTIONS = [
  { dx: 1, dy: 0, wall: 'e' },
  { dx: 0, dy: 1, wall: 's' },
  { dx: -1, dy: 0, wall: 'w' },
  { dx: 0, dy: -1, wall: 'n' },
] as const satisfies readonly { dx: number; dy: number; wall: keyof Pick<Cell, 'n'|'s'|'e'|'w'> }[];

export const nodeId = (point: Point): NodeId => `${point.x},${point.y}`;

export function mazeToGraph(result: MazeResult): MazeGraph {
  const nodes = new Map<NodeId, MazeNode>();
  for (const row of result.maze) for (const cell of row) {
    const neighbors = DIRECTIONS
      .filter(direction => cell[direction.wall] === 0)
      .map(direction => nodeId({ x: cell.x + direction.dx, y: cell.y + direction.dy }));
    const id = nodeId(cell);
    nodes.set(id, { id, position: { x: cell.x, y: cell.y }, neighbors });
  }
  return { nodes, start: nodeId(result.start), goals: [nodeId(result.goal)] };
}

export function requireNode(graph: MazeGraph, id: NodeId): MazeNode {
  const node = graph.nodes.get(id);
  if (!node) throw new Error(`Maze graph does not contain node ${id}`);
  return node;
}

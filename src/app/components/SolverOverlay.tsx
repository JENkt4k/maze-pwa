import { useMemo } from 'react';
import { requireNode, type MazeGraph, type NodeId } from '../../maze/graph';
import type { SolverEvent } from '../../maze/solvers';

type Props = {
  graph: MazeGraph;
  events: readonly SolverEvent[];
  eventIndex: number;
  cell: number;
  margin: number;
  widthCells: number;
  heightCells: number;
  color: string;
  opacity: number;
  freeform?:boolean;
};

export default function SolverOverlay({ graph, events, eventIndex, cell, margin, widthCells, heightCells, color, opacity,freeform }: Props) {
  const playback = useMemo(() => {
    const discovered = new Set<NodeId>(), expanded = new Set<NodeId>(), path: NodeId[] = [];
    let current: NodeId | null = null;
    for (const event of events.slice(0, eventIndex)) {
      if (event.type === 'discover') discovered.add(event.node);
      if (event.type === 'expand') { expanded.add(event.node); current = event.node; }
      if (event.type === 'backtrack') current = event.to;
      if (event.type === 'path') { path[event.index] = event.node; current = event.node; }
    }
    return { discovered, expanded, path, current };
  }, [events, eventIndex]);
  if (eventIndex === 0) return null;
  const center = (id: NodeId) => {
    const point = requireNode(graph, id).position;
    return { x: margin + point.x * cell + (freeform?0:cell/2), y: margin + point.y * cell + (freeform?0:cell/2) };
  };
  const pathPoints = playback.path.filter(Boolean).map(center);
  return <svg className="solver-overlay-svg" viewBox={`0 0 ${widthCells * cell + margin * 2} ${heightCells * cell + margin * 2}`} aria-hidden="true">
    <g className="solver-discovered">
      {[...playback.discovered].map(id => { const point = center(id); return <circle key={id} cx={point.x} cy={point.y} r={cell * .24} fill={color} opacity={opacity*.55} />; })}
    </g>
    <g className="solver-expanded">
      {[...playback.expanded].map(id => { const point = center(id); return <circle key={id} cx={point.x} cy={point.y} r={cell * .15} fill={color} opacity={opacity} />; })}
    </g>
    {pathPoints.length > 1 && <polyline className="solver-solution" points={pathPoints.map(point => `${point.x},${point.y}`).join(' ')} />}
    {playback.current && (() => { const point = center(playback.current); return <circle className="solver-current" cx={point.x} cy={point.y} r={cell * .3} fill={color} opacity={opacity} />; })()}
  </svg>;
}

import { useEffect, useMemo, type RefObject } from "react";
import { toSVG, type MazeResult } from "../maze";
import type { MazeGraph } from '../../maze/graph';
import type { SolverRun } from '../../maze/solvers';
import SolverOverlay from './SolverOverlay';
import GenerationOverlay from './GenerationOverlay';
import EndpointOverlay from './EndpointOverlay';
import type { MazePoint } from '../maze';

type RenderOpts = { cell:number; margin:number; stroke?:number; startIcon?:string|null; goalIcon?:string|null; iconScale?:number };
type Props = {
  hostRef: RefObject<HTMLDivElement>;
  data: MazeResult;
  graph: MazeGraph;
  solverRun: SolverRun;
  solverEnabled: boolean;
  solverEventIndex: number;
  generationEventIndex: number;
  generationComplete: boolean;
  generationColor: string;
  generationOpacity: number;
  solverColor: string;
  solverOpacity: number;
  render: RenderOpts;
  onSVGChange?: (svg:string) => void;
  endpointMode?:'start'|'goal'|null;
  onEndpointSelect?:(point:MazePoint)=>void;
};

export default function MazeView({ hostRef, data, graph, solverRun, solverEnabled, solverEventIndex, generationEventIndex, generationComplete, generationColor, generationOpacity, solverColor, solverOpacity, render, onSVGChange, endpointMode, onEndpointSelect }: Props) {
  const width = data.maze[0]?.length ?? 0;
  const height = data.maze.length;
  const { cell, margin, startIcon, goalIcon, iconScale = 0.7 } = render;
  const stroke = render.stroke ?? Math.max(2, Math.round(cell / 8));
  const baseSVG = useMemo(() => toSVG(data, {
    cell, margin, stroke, showStartGoal: true,
    startIcon, goalIcon, iconScale,
  }), [data, cell, margin, stroke, startIcon, goalIcon, iconScale]);

  useEffect(() => { onSVGChange?.(baseSVG); }, [baseSVG, onSVGChange]);
  return (
    <div className="maze-frame" ref={hostRef} id="print-maze-only">
      <div dangerouslySetInnerHTML={{ __html: baseSVG }} />
      {solverEnabled && <GenerationOverlay steps={[...data.treeSteps,...data.braidEdits]} eventIndex={generationEventIndex}
        complete={generationComplete} color={generationColor} opacity={generationOpacity}
        cell={cell} margin={margin} stroke={stroke} widthCells={width} heightCells={height} />}
      {solverEnabled && <SolverOverlay graph={graph} events={solverRun.events} eventIndex={solverEventIndex}
        color={solverColor} opacity={solverOpacity} cell={cell} margin={margin} widthCells={width} heightCells={height} />}
      {endpointMode&&onEndpointSelect&&<EndpointOverlay data={data} mode={endpointMode} cell={cell} margin={margin} onSelect={onEndpointSelect}/>}
    </div>
  );
}

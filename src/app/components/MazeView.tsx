import { useEffect, useMemo, type RefObject } from "react";
import { toSVG, type MazeResult } from "../maze";
import type { MazeGraph } from '../../maze/graph';
import type { SolverRun } from '../../maze/solvers';
import SolverOverlay from './SolverOverlay';
import GenerationOverlay from './GenerationOverlay';
import EndpointOverlay from './EndpointOverlay';
import type { MazePoint } from '../maze';
import GameplayOverlay from './GameplayOverlay';
import type { MazeGameState } from '../hooks/useMazeGame';
import type { NodeId } from '../../maze/graph';

type RenderOpts = { cell:number; margin:number; stroke?:number; wallStyle?:import('../../maze/walls').WallStyle;cornerRadius?:number;startIcon?:string|null; goalIcon?:string|null; iconScale?:number };
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
  gameplay?:{state:MazeGameState;breadcrumbs:boolean;move:(target:NodeId)=>void}|null;
};

export default function MazeView({ hostRef, data, graph, solverRun, solverEnabled, solverEventIndex, generationEventIndex, generationComplete, generationColor, generationOpacity, solverColor, solverOpacity, render, onSVGChange, endpointMode, onEndpointSelect,gameplay }: Props) {
  const width = data.maze[0]?.length ?? 0;
  const height = data.maze.length;
  const { cell, margin, startIcon, goalIcon, iconScale = 0.7,wallStyle='classic',cornerRadius=.3 } = render;
  const stroke = render.stroke ?? Math.max(2, Math.round(cell / 8));
  const baseSVG = useMemo(() => toSVG(data, {
    cell, margin, stroke, showStartGoal: true,
    startIcon, goalIcon, iconScale,wallStyle,cornerRadius,
  }), [data, cell, margin, stroke, startIcon, goalIcon, iconScale,wallStyle,cornerRadius]);

  useEffect(() => { onSVGChange?.(baseSVG); }, [baseSVG, onSVGChange]);
  return (
    <div className="maze-frame" ref={hostRef} id="print-maze-only">
      <div dangerouslySetInnerHTML={{ __html: baseSVG }} />
      {solverEnabled && <GenerationOverlay steps={[...data.treeSteps,...data.braidEdits]} eventIndex={generationEventIndex}
        complete={generationComplete} color={generationColor} opacity={generationOpacity}
        cell={cell} margin={margin} stroke={stroke} widthCells={width} heightCells={height} freeform={!!data.geometry} />}
      {solverEnabled && <SolverOverlay graph={graph} events={solverRun.events} eventIndex={solverEventIndex}
        color={solverColor} opacity={solverOpacity} cell={cell} margin={margin} widthCells={width} heightCells={height} freeform={!!data.geometry} />}
      {endpointMode&&onEndpointSelect&&<EndpointOverlay data={data} graph={graph} mode={endpointMode} cell={cell} margin={margin} onSelect={onEndpointSelect}/>}
      {!endpointMode&&gameplay&&<GameplayOverlay graph={graph} state={gameplay.state} breadcrumbs={gameplay.breadcrumbs} move={gameplay.move} cell={cell} margin={margin} width={width} height={height} freeform={!!data.geometry}/>}
    </div>
  );
}

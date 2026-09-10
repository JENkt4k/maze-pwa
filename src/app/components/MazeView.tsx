import React, { useEffect, useMemo, useState } from "react";
import { createMaze, toSVG, type Stats, type MazeParams } from "../maze";
import AnimatedOverlay from "./AnimatedOverlay";

type RenderOpts = { cell:number; margin:number; stroke?:number; startIcon?:string|null; goalIcon?:string|null; iconScale?:number };
type AnimOpts = { enabled:boolean; segMs:number; lingerMs:number };
type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  params: MazeParams;
  render: RenderOpts;
  animation?: AnimOpts;
  onStats?: (s:Stats) => void;
  onSVGChange?: (svg:string) => void;
};

export default function MazeView({ hostRef, params, render, animation, onStats, onSVGChange }: Props) {
  const { width, height, seed, g, b, tau } = params;
  const data = useMemo(() => createMaze({ width, height, seed, g, b, tau }), [width, height, seed, g, b, tau]);
  const { cell, margin, startIcon, goalIcon, iconScale = 0.7 } = render;
  const stroke = render.stroke ?? Math.max(2, Math.round(cell / 8));
  const enabled = !!animation?.enabled;
  const segMs = Math.max(10, animation?.segMs ?? 35);
  const lingerMs = Math.max(0, animation?.lingerMs ?? 2000);
  const runKey = `${width}|${height}|${seed}|${g}|${b}|${tau}|${segMs}|${lingerMs}|${enabled}`;
  const [completedRun, setCompletedRun] = useState<string | null>(null);
  const baseSVG = useMemo(() => toSVG(data, {
    cell, margin, stroke, showStartGoal: true,
    startIcon, goalIcon, iconScale,
  }), [data, cell, margin, stroke, startIcon, goalIcon, iconScale]);

  useEffect(() => { onSVGChange?.(baseSVG); }, [baseSVG, onSVGChange]);
  useEffect(() => { onStats?.(data.stats); }, [data.stats, onStats]);
  useEffect(() => {
    setCompletedRun(null);
    if (!enabled || data.treeSteps.length === 0) return;
    const timer = setTimeout(() => setCompletedRun(runKey), data.treeSteps.length * segMs + 120 + lingerMs);
    return () => clearTimeout(timer);
  }, [data, enabled, runKey, segMs, lingerMs]);

  return (
    <div className="maze-frame" ref={hostRef} id="print-maze-only">
      <div dangerouslySetInnerHTML={{ __html: baseSVG }} />
      <AnimatedOverlay key={runKey} steps={data.treeSteps} cell={cell} margin={margin}
        stroke={stroke} segMs={segMs} widthCells={width} heightCells={height}
        visible={enabled && completedRun !== runKey} />
    </div>
  );
}

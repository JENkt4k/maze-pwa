// src/app/components/MazeView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createMaze, toSVG } from "../maze";
import AnimatedOverlay from "./AnimatedOverlay";

export type MazeParams = { width:number;height:number;seed:number;g:number;b:number;tau:number };
type RenderOpts = {
  cell:number;
  margin:number;
  stroke?:number;
  startIcon?:string|null;
  goalIcon?:string|null;
  iconScale?:number; 
};
type AnimOpts = {
  enabled:boolean;
  segMs:number;
  lingerMs:number;
  hideWallsDuringAnim?:boolean;
};

type Props = {
  hostRef: React.RefObject<HTMLDivElement | null>;
  params: MazeParams;
  render: RenderOpts;
  animation?: AnimOpts;
  onStats?: (s:any) => void;
  onSVGChange?: (svg:string) => void;
};

type Phase = "idle" | "animating" | "linger";

export default function MazeView({
  hostRef,
  params,
  render,
  animation,
  onStats,
  onSVGChange
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const runIdRef = useRef(0);

  const {
    cell,
    margin,
    startIcon,
    goalIcon,
    iconScale = 0.7
  } = render;
  const stroke = render.stroke ?? Math.max(2, Math.round(cell/8));
  const enabled = !!animation?.enabled;
  const segMs = animation?.segMs ?? 35;
  const lingerMs = animation?.lingerMs ?? 2000;

  // Build key so createMaze runs once per “actual change”
  const mazeKey = `${params.width}x${params.height}|${params.seed}|g${params.g}|b${params.b}|t${params.tau}`;
  useEffect(() => { runIdRef.current++; }, [mazeKey]);

  // Compute maze + steps + stats once per key
  const data = useMemo(() => createMaze(params), [mazeKey]);

  // Base (phase-independent) SVG for print/render
  const baseSVG = useMemo(() => {
    return toSVG(data, {
      cell, margin, stroke,
      showStartGoal: true,
      startIcon: startIcon ?? undefined,
      goalIcon:  goalIcon  ?? undefined,
      iconScale,
      // ⛔ no dfsSteps here — animation is separate
    });
  }, [data, cell, margin, stroke, startIcon, goalIcon, iconScale]);

  // Notify parent: svg + stats (notify only on change)
  const lastSvg = useRef(""); useEffect(() => {
    if (onSVGChange && baseSVG !== lastSvg.current) { lastSvg.current = baseSVG; onSVGChange(baseSVG); }
  }, [baseSVG, onSVGChange]);
  const lastStats = useRef<any>(null); useEffect(() => {
    const s = data.stats, p = lastStats.current;
    if (!p || p.D!==s.D || p.L!==s.L || p.T!==s.T || p.J!==s.J || p.E!==s.E) { lastStats.current = s; onStats?.(s); }
  }, [data.stats, onStats]);

  // Phase machine per run
  useEffect(() => {
    if (!enabled || data.treeSteps.length === 0) { setPhase("idle"); return; }
    const myRun = runIdRef.current;
    setPhase("animating");
    const drawMs = data.treeSteps.length * segMs + 120;
    const t1 = setTimeout(() => { if (runIdRef.current === myRun) setPhase("linger"); }, drawMs);
    const t2 = setTimeout(() => { if (runIdRef.current === myRun) setPhase("idle");   }, drawMs + lingerMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [enabled, segMs, lingerMs, data.treeSteps.length]);

  const showOverlay = enabled && phase !== "idle";

  return (
    <div className="maze-frame" ref={hostRef} id="print-maze-only">
      {/* Static maze SVG */}
      <div dangerouslySetInnerHTML={{ __html: baseSVG }} />

      {/* Optional overlay */}
      <AnimatedOverlay
        steps={data.treeSteps}
        cell={cell}
        margin={margin}
        stroke={stroke}
        segMs={segMs}
        widthCells={params.width}
        heightCells={params.height}
        visible={showOverlay}
        autoHide={false /* handled by phase timers */}
        onDone={() => { /* we could flip to linger here if we wanted */ }}
      />
    </div>
  );
}

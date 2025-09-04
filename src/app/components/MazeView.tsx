// src/app/components/MazeView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createMaze, toSVG, type CarveStep } from "../maze";

export type MazeParams = { width:number;height:number;seed:number;g:number;b:number;tau:number };

type RenderOpts = {
  cell: number;
  margin: number;
  stroke?: number;
  startIcon?: string | null;
  goalIcon?: string | null;
  iconScale?: number;
};

type AnimOpts = {
  enabled: boolean;
  segMs: number;
  lingerMs: number;
  hideWallsDuringAnim?: boolean;
};

type Props = {
  hostRef: React.RefObject<HTMLDivElement | null>;
  params: MazeParams;
  render: RenderOpts;
  animation?: AnimOpts;
  onStats?: (s: any) => void;
  onSVGChange?: (svg: string) => void;
};

type Phase = "idle" | "animating" | "linger";

export default function MazeView({
  hostRef,
  params,
  render,
  animation,
  onStats,
  onSVGChange,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");

  // Compute maze + svg (pure)
  const memo = useMemo(() => {
    const { maze, stats, steps } = createMaze(params);

    const stroke = render.stroke ?? Math.max(2, Math.round(render.cell / 8));
    const passageWidth = Math.max(1, render.cell - stroke - 1);

    const includeDFS = !!animation?.enabled && phase !== "idle";
    const totalSec = Math.max(
      0.2,
      (steps.length * (animation?.segMs ?? 35)) / 1000
    );

    const svg = toSVG(maze, {
      cell: render.cell,
      margin: render.margin,
      stroke,
      showStartGoal: true,
      startIcon: render.startIcon ?? undefined,
      goalIcon: render.goalIcon ?? undefined,
      iconScale: render.iconScale ?? 0.7,
      dfsSteps: includeDFS ? (steps as CarveStep[]) : undefined,
      dfsTotalSec: animation?.enabled ? (steps.length * animation?.segMs) / 1000 : undefined,
      dfsPassageWidth: includeDFS ? passageWidth : undefined,
      hideWallsDuringAnim: animation?.hideWallsDuringAnim,
    });

    return { svg, stats, stepsCount: steps.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // params, render, animation?.enabled, animation?.segMs, animation?.hideWallsDuringAnim, phase
    // Dependencies for maze generation
    params.width, params.height, params.seed, params.g, params.b, params.tau,
    // Dependencies for SVG rendering
    render.cell, render.margin, render.stroke, render.startIcon, render.goalIcon, render.iconScale,
    // Dependencies for animation
    animation?.enabled, animation?.segMs, animation?.hideWallsDuringAnim
  ]);


  const lastSvg = useRef<string>("");
  useEffect(() => {
    if (onSVGChange && memo.svg !== lastSvg.current) {
      lastSvg.current = memo.svg;
      onSVGChange(memo.svg);
    }
  }, [memo.svg, onSVGChange]);

  const lastStats = useRef<any>(null);
  useEffect(() => {
    if (!onStats) return;
    const s = memo.stats;
    const prev = lastStats.current;
    const same = prev && prev.L===s.L && prev.T===s.T && prev.J===s.J && prev.E===s.E && prev.D===s.D;
    if (!same) { lastStats.current = s; onStats(s); }
  }, [memo.stats, onStats]);

  // Local phase machine
  useEffect(() => {
    const enabled = !!animation?.enabled;
    const stepsCount = memo.stepsCount;
    if (!enabled || stepsCount === 0) {
      if (phase !== "idle") setPhase("idle");
      return;
    }

    if (phase !== "animating") setPhase("animating");

  //   if (!animation?.enabled || memo.stepsCount === 0) { setPhase("idle"); return; }
  //   setPhase("animating");
  //   const drawMs = memo.stepsCount * (animation?.segMs ?? 35) + 120;
  //   const t1 = setTimeout(() => setPhase("linger"), drawMs);
  //   const t2 = setTimeout(() => setPhase("idle"),   drawMs + (animation?.lingerMs ?? 2000));
  //   return () => { clearTimeout(t1); clearTimeout(t2); };
  // }, [animation?.enabled, animation?.segMs, animation?.lingerMs, memo.stepsCount]);
    const segMs = animation?.segMs ?? 35;
    const lingerMs = animation?.lingerMs ?? 2000;
    const drawMs = stepsCount * segMs + 120;

    let cancelled = false;
    const t1 = window.setTimeout(() => {
      if (!cancelled && phase !== "linger") setPhase("linger");
    }, drawMs);
    const t2 = window.setTimeout(() => {
      if (!cancelled && phase !== "idle") setPhase("idle");
    }, drawMs + lingerMs);

    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
    // deps: everything that should RESTART the animation cycle
  }, [animation?.enabled, animation?.segMs, animation?.lingerMs, memo.stepsCount]); // <- NO `phase` here


  

  return (
    <div ref={hostRef} className="maze-view">
      <div dangerouslySetInnerHTML={{ __html: memo.svg }} />
    </div>
    // <div ref={hostRef} id="print-maze-only" dangerouslySetInnerHTML={{ __html: memo.svg }} />
  );
}

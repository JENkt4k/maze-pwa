// src/app/components/MazeView.tsx
import React, { useEffect, useMemo, useState } from "react";
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
      dfsTotalSec: includeDFS ? totalSec : undefined,
      dfsPassageWidth: includeDFS ? passageWidth : undefined,
      hideWallsDuringAnim: !!animation?.hideWallsDuringAnim && phase === "animating",
    });

    return { svg, stats, stepsCount: steps.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, render, animation?.enabled, animation?.segMs, animation?.hideWallsDuringAnim, phase]);

  // 🔑 Notify parent AFTER render computation (no setState during render)
  useEffect(() => {
    onSVGChange?.(memo.svg);
  }, [memo.svg, onSVGChange]);

  useEffect(() => {
    onStats?.(memo.stats);
  }, [memo.stats, onStats]);

  // Local phase machine
  useEffect(() => {
    if (!animation?.enabled || memo.stepsCount === 0) { setPhase("idle"); return; }
    setPhase("animating");
    const drawMs = memo.stepsCount * (animation?.segMs ?? 35) + 120;
    const t1 = setTimeout(() => setPhase("linger"), drawMs);
    const t2 = setTimeout(() => setPhase("idle"),   drawMs + (animation?.lingerMs ?? 2000));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animation?.enabled, animation?.segMs, animation?.lingerMs, memo.stepsCount]);

  return (
    <div ref={hostRef} id="print-maze-only" dangerouslySetInnerHTML={{ __html: memo.svg }} />
  );
}

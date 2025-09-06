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

  // Build maze + SVG (pure)
  const memo = useMemo(() => {
    console.log("MazeView: computing maze+SVG - useMemo called");
    // 🔁 NEW: createMaze now returns { maze, stats, treeSteps, ... }
    const { maze, stats, treeSteps } = createMaze(params);

    const stroke = render.stroke ?? Math.max(2, Math.round(render.cell / 8));
    const passageWidth = Math.max(1, render.cell - stroke - 1);

    const includeDFS = !!animation?.enabled && phase !== "idle";
    const totalSec = Math.max(
      0.2,
      (treeSteps.length * (animation?.segMs ?? 35)) / 1000
    );

    const res = createMaze(params);                // res: MazeResult

    const svg = toSVG(res, {
      cell: render.cell,
      margin: render.margin,
      stroke,
      showStartGoal: true,
      startIcon: render.startIcon ?? undefined,
      goalIcon:  render.goalIcon  ?? undefined,
      iconScale: render.iconScale ?? 0.7,
      dfsSteps: includeDFS ? res.treeSteps : undefined,
      dfsTotalSec: includeDFS ? (res.treeSteps.length * (animation?.segMs ?? 35)) / 1000 : undefined,
      dfsPassageWidth: includeDFS ? passageWidth : undefined,
      hideWallsDuringAnim: !!animation?.hideWallsDuringAnim && phase === "animating",
    });


    return { svg, stats, stepsCount: treeSteps.length };
    // phase is included so the embedded DFS toggles on/off in the SVG
  }, [
    params,
    render,
    animation?.enabled,
    animation?.segMs,
    animation?.hideWallsDuringAnim,
    phase,
  ]);

  // Notify parent AFTER render computation (no setState during render)
  const lastSvg = useRef<string>("");
  useEffect(() => {
    if (onSVGChange && memo.svg !== lastSvg.current) {
      lastSvg.current = memo.svg;
      onSVGChange(memo.svg);
    }
    console.log("MazeView: useEffect for onSVGChange fired");
  }, [memo.svg, onSVGChange]);

  const lastStats = useRef<any>(null);
  useEffect(() => {
    if (!onStats) return;
    const s = memo.stats;
    const prev = lastStats.current;
    const same =
      prev &&
      prev.L === s.L &&
      prev.T === s.T &&
      prev.J === s.J &&
      prev.E === s.E &&
      prev.D === s.D;
    if (!same) {
      lastStats.current = s;
      onStats(s);
    }
    console.log("MazeView: useEffect for onStats fired");
  }, [memo.stats, onStats]);

  // Phase machine: start/advance once per (maze/options) change
  // 🚫 No `phase` in deps => avoids update-depth loops
  useEffect(() => {
    if (!animation?.enabled || memo.stepsCount === 0) {
      if (phase !== "idle") setPhase("idle");
      return;
    }
    if (phase !== "animating") setPhase("animating");

    const segMs = animation?.segMs ?? 35;
    const lingerMs = animation?.lingerMs ?? 2000;
    const drawMs = memo.stepsCount * segMs + 120;

    let cancelled = false;
    const t1 = window.setTimeout(() => {
      if (!cancelled && phase !== "linger") setPhase("linger");
    }, drawMs);
    const t2 = window.setTimeout(() => {
      if (!cancelled && phase !== "idle") setPhase("idle");
    }, drawMs + lingerMs);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
    console.log("MazeView: useEffect for phase/animation fired");
  }, [animation?.enabled, animation?.segMs, animation?.lingerMs, memo.stepsCount]);

  return (
    <div
      ref={hostRef}
      id="print-maze-only"
      dangerouslySetInnerHTML={{ __html: memo.svg }}
    />
  );
}

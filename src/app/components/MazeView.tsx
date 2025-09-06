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

  // Destructure scalars so deps are stable primitives, not the whole objects
  const {
    cell,
    margin,
    stroke: strokeIn,
    startIcon,
    goalIcon,
    iconScale = 0.7,
  } = render;
  const enabled = !!animation?.enabled;
  const segMs = animation?.segMs ?? 35;
  const lingerMs = animation?.lingerMs ?? 2000;
  const hideWallsDuringAnim = !!animation?.hideWallsDuringAnim;

  // Build maze + SVG (pure) — SINGLE createMaze call
  const memo = useMemo(() => {
    // console.log("MazeView: computing maze+SVG - useMemo called");
    const res = createMaze(params); // MazeResult: { maze, treeSteps, stats, start, goal, ... }

    const stroke = strokeIn ?? Math.max(2, Math.round(cell / 8));
    const passageWidth = Math.max(1, cell - stroke - 1);

    const includeDFS = enabled && phase !== "idle";
    const totalSec = Math.max(0.2, (res.treeSteps.length * segMs) / 1000);

    const svg = toSVG(res, {
      cell,
      margin,
      stroke,
      showStartGoal: true,
      startIcon: startIcon ?? undefined,
      goalIcon:  goalIcon  ?? undefined,
      iconScale,
      dfsSteps: includeDFS ? (res.treeSteps as CarveStep[]) : undefined,
      dfsTotalSec: includeDFS ? totalSec : undefined,
      dfsPassageWidth: includeDFS ? passageWidth : undefined,
      hideWallsDuringAnim: hideWallsDuringAnim && phase === "animating",
    });

    return { svg, stats: res.stats, stepsCount: res.treeSteps.length };
  }, [
    // strictly the things that change the maze/SVG
    params.width, params.height, params.seed, params.g, params.b, params.tau,
    cell, margin, strokeIn, startIcon, goalIcon, iconScale,
    enabled, segMs, hideWallsDuringAnim,
    phase, // phase toggles DFS layer on/off
  ]);

  // Notify parent ONLY when changed (no setState during render)
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
    const p = lastStats.current;
    const same = p && p.L===s.L && p.T===s.T && p.J===s.J && p.E===s.E && p.D===s.D;
    if (!same) { lastStats.current = s; onStats(s); }
    console.log("MazeView: useEffect for onStats fired");
  }, [memo.stats, onStats]);

  // Phase machine: start/advance ONCE per (maze/options) change
  useEffect(() => {
    if (!enabled || memo.stepsCount === 0) { if (phase !== "idle") setPhase("idle"); return; }
    if (phase !== "animating") setPhase("animating");

    const drawMs = memo.stepsCount * segMs + 120;
    const t1 = window.setTimeout(() => { if (phase !== "linger") setPhase("linger"); }, drawMs);
    const t2 = window.setTimeout(() => { if (phase !== "idle")   setPhase("idle");   }, drawMs + lingerMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    console.log("MazeView: useEffect for phase/animation fired");
  }, [enabled, segMs, lingerMs, memo.stepsCount]); // ← no `phase` here, avoids loops

  return (
    <div
      ref={hostRef}
      id="print-maze-only"
      dangerouslySetInnerHTML={{ __html: memo.svg }}
    />
  );
}

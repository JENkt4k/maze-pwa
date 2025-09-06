// src/app/components/AnimatedOverlay.tsx
import React, { useEffect, useMemo, useRef } from "react";
import type { CarveStep } from "../maze";

type Mode = "segments" | "polyline";

type Props = {
  steps: CarveStep[];
  cell: number;
  margin: number;
  stroke: number;         // black wall thickness; we derive passage width from cell & stroke
  segMs: number;          // ms per segment
  widthCells: number;     // grid W
  heightCells: number;    // grid H
  visible: boolean;
  mode?: Mode;            // "segments" (classic) | "polyline"
  autoHide?: boolean;
  onDone?: () => void;
};

export default function AnimatedOverlay({
  steps, cell, margin, stroke, segMs,
  widthCells, heightCells,
  visible,
  mode = "segments",
  autoHide = false,
  onDone,
}: Props) {
  // shared geometry
  const viewW = widthCells * cell + margin * 2;
  const viewH = heightCells * cell + margin * 2;
  const cx = (x:number) => margin + x*cell + cell/2;
  const cy = (y:number) => margin + y*cell + cell/2;
  const durSec = Math.max(0.2, (steps.length * Math.max(10, segMs)) / 1000);
  const passageWidth = Math.max(1, cell - stroke - 1); // fills the channel nicely

  // Notify completion on a timer tied to step count (matches classic behavior)
  const doneRef = useRef(false);
  useEffect(() => {
    if (!visible) { doneRef.current = false; return; }
    doneRef.current = false;
    const totalMs = steps.length * Math.max(10, segMs) + 120;
    const t = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone?.(); }
    }, totalMs);
    return () => clearTimeout(t);
  }, [visible, steps.length, segMs, onDone]);

  if (!visible || steps.length === 0) return null;

  if (mode === "polyline") {
    // === new single-path approach ===
    const d = useMemo(() => {
      if (!steps.length) return "";
      let P = `M ${cx(steps[0].x)} ${cy(steps[0].y)}`;
      for (const s of steps) P += ` L ${cx(s.nx)} ${cy(s.ny)}`;
      return P;
    }, [steps, cell, margin]);

    return (
      <svg className="dfs-overlay-svg" viewBox={`0 0 ${viewW} ${viewH}`} aria-hidden="true">
        <defs>
          <style>{`@keyframes dfs-grow { to { stroke-dashoffset: 0; } }`}</style>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={passageWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `dfs-grow ${durSec}s linear forwards` }}
          onAnimationEnd={() => { if (autoHide) onDone?.(); }}
        />
      </svg>
    );
  }

  // === classic "one tiny path per segment" with staggered delay ===
  const segDurSec = Math.max(0.03, Math.max(10, segMs) / 1000);

  return (
    <svg className="dfs-overlay-svg dfs-anim" viewBox={`0 0 ${viewW} ${viewH}`} aria-hidden="true">
      <g style={{ ["--dur" as any]: `${segDurSec}s` }}>
        {steps.map((s, i) => {
          const d = `M ${cx(s.x)} ${cy(s.y)} L ${cx(s.nx)} ${cy(s.ny)}`;
          const delay = i * segDurSec;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={passageWidth}
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              style={{
                // `style.css` already supplies: animation: dfs-draw var(--dur) linear forwards;
                // we only set the per-path delay:
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </g>
    </svg>
  );
}

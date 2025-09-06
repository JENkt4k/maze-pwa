// src/app/components/AnimatedOverlay.tsx
import React, { useEffect, useMemo, useRef } from "react";
import type { CarveStep } from "../maze";

type Props = {
  steps: CarveStep[];
  cell: number;
  margin: number;
  stroke: number;         // blue path thickness
  segMs: number;          // ms per segment
  widthCells: number;     // W
  heightCells: number;    // H
  visible: boolean;       // show/hide overlay
  autoHide?: boolean;     // hide automatically after finishing
  onDone?: () => void;    // called when animation finished
};

export default function AnimatedOverlay({
  steps, cell, margin, stroke, segMs, widthCells, heightCells,
  visible, autoHide = false, onDone,
}: Props) {

  // Build one polyline path "M x y L x y ..."
  const { pathD, viewW, viewH, durSec } = useMemo(() => {
    const cx = (x:number) => margin + x*cell + cell/2;
    const cy = (y:number) => margin + y*cell + cell/2;

    const d = steps.length
      ? `M ${cx(steps[0].x)} ${cy(steps[0].y)} ` +
        steps.map(s => `L ${cx(s.nx)} ${cy(s.ny)}`).join(" ")
      : "";

    return {
      pathD: d,
      viewW: widthCells * cell + margin*2,
      viewH: heightCells * cell + margin*2,
      durSec: Math.max(0.2, (steps.length * segMs) / 1000),
    };
  }, [steps, cell, margin, widthCells, heightCells, segMs]);

  // Notify when completed
  const doneRef = useRef(false);
  useEffect(() => {
    if (!visible) { doneRef.current = false; return; }
    doneRef.current = false;
    const ms = steps.length * segMs + 120;
    const t = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    }, ms);
    return () => clearTimeout(t);
  }, [visible, steps.length, segMs, onDone]);

  if (!visible || !steps.length) return null;

  // NOTE: we keep the overlay as its own <svg> absolutely positioned by CSS.
  return (
    <svg className="dfs-overlay-svg" viewBox={`0 0 ${viewW} ${viewH}`} aria-hidden="true">
      <defs>
        <style>{`
          @keyframes dfs-grow { to { stroke-dashoffset: 0; } }
        `}</style>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={Math.max(1, cell - stroke - 1)}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: `dfs-grow ${durSec}s linear forwards`,
        }}
        onAnimationEnd={() => { if (autoHide) onDone?.(); }}
      />
    </svg>
  );
}

import type { CarveStep } from "../maze";

type Props = {
  steps: CarveStep[];
  cell: number;
  margin: number;
  stroke: number;
  segMs: number;
  widthCells: number;
  heightCells: number;
  visible: boolean;
};

export default function AnimatedOverlay({ steps, cell, margin, stroke, segMs, widthCells, heightCells, visible }: Props) {
  if (!visible || steps.length === 0) return null;
  const center = (n: number) => margin + n * cell + cell / 2;
  const duration = Math.max(10, segMs) / 1000;
  return (
    <svg className="dfs-overlay-svg" viewBox={`0 0 ${widthCells * cell + margin * 2} ${heightCells * cell + margin * 2}`} aria-hidden="true">
      <g>
        {steps.map((s, i) => (
          <path key={i} d={`M ${center(s.x)} ${center(s.y)} L ${center(s.nx)} ${center(s.ny)}`}
            fill="none" stroke="#3b82f6" strokeWidth={Math.max(1, cell - stroke - 1)}
            strokeLinecap="round" strokeLinejoin="round" pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `dfs-draw ${duration}s linear forwards`, animationDelay: `${i * duration}s` }} />
        ))}
      </g>
    </svg>
  );
}

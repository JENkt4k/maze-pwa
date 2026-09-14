

import type { Stats } from "../maze";
import type { Difficulty2Analysis } from '../../maze/difficulty';

export default function StatsCard({ stats,difficulty }: { stats: Stats;difficulty:Difficulty2Analysis }) {
  const Row = ({ label, value, strong=false }:{label:string;value:string|number;strong?:boolean}) => (
    <div className="hstack stats-row">
      <span>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
  return (
    <div className="panel stats-card">
      <div className="stats-heading">Stats</div>
      <Row label="Solution length (steps)" value={stats.L} />
      <Row label="Solution turn rate" value={stats.T.toFixed(2)} />
      <Row label="Junctions J" value={stats.J} />
      <Row label="Dead ends E" value={stats.E} />
      <div className="stats-divider" />
      <Row label="Estimated difficulty" value={`${difficulty.score}/100 — ${difficulty.label}`} strong />
      <Row label="Legacy difficulty D" value={stats.D.toFixed(3)} />
      <p>Deterministic structural estimate based on path decisions, wrong branches, traps, and goal deception. It is not yet calibrated from human results.</p>
    </div>
  );
}

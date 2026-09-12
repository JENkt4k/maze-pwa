

import type { Stats } from "../maze";
import type { Difficulty2Analysis } from '../../maze/difficulty';

export default function StatsCard({ stats,difficulty }: { stats: Stats;difficulty:Difficulty2Analysis }) {
  const Row = ({ label, value, strong=false }:{label:string;value:string|number;strong?:boolean}) => (
    <div className="hstack" style={{ justifyContent:"space-between", fontSize:13, padding:"2px 0" }}>
      <span style={{ color:"#6b7280" }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
  return (
    <div className="panel" style={{ border:"1px solid #e6e9ef", background:"#f9fbff", minWidth:220 }}>
      <div style={{ fontWeight:600, marginBottom:6 }}>Stats</div>
      <Row label="Solution length (steps)" value={stats.L} />
      <Row label="Solution turn rate" value={stats.T.toFixed(2)} />
      <Row label="Junctions J" value={stats.J} />
      <Row label="Dead ends E" value={stats.E} />
      <div style={{ height:1, background:"#e6e9ef", margin:"8px 0" }}/>
      <Row label="Estimated difficulty" value={`${difficulty.score}/100 — ${difficulty.label}`} strong />
      <Row label="Legacy difficulty D" value={stats.D.toFixed(3)} />
      <p style={{ fontSize:12, color:"#586174", marginBottom:0 }}>Deterministic structural estimate based on path decisions, wrong branches, traps, and goal deception. It is not yet calibrated from human results.</p>
    </div>
  );
}

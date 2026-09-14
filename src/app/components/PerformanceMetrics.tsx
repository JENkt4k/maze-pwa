import { costRating, roundedCost, totalMazeCost, type MazePerformanceMetrics } from '../performance';

export default function PerformanceMetrics({metrics}:{metrics:MazePerformanceMetrics}){
  const rows=[['Generation',metrics.generationMs],['Graph',metrics.graphMs],['Difficulty',metrics.difficultyMs],['Identity',metrics.identityMs],['Solver',metrics.solverMs],['SVG render',metrics.svgMs]] as const,total=totalMazeCost(metrics);
  return <section className="performance-metrics" aria-label="Maze performance costs">
    <p>Measured once when applied maze, solver, or render settings change. Robot simulations remain separately initiated.</p>
    <dl className="solver-metrics">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{roundedCost(value)} ms</dd></div>)}</dl>
    <div className="performance-total"><span>{metrics.cells.toLocaleString()} cells</span><strong>{total} ms — {costRating(total)}</strong></div>
  </section>;
}

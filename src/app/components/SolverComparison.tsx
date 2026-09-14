import { useEffect, useMemo, useState } from 'react';
import type { MazeGraph } from '../../maze/graph';
import { SOLVERS, solveMaze, type SolverId, type SolverRun } from '../../maze/solvers';
import type { MazeParams } from '../maze';
import { useSolverSeedAnalysis } from '../hooks/useSolverSeedAnalysis';
import type { SolverSeedAggregate, SolverSeedCount } from '../solverSeedAnalysis';

type Props={graph:MazeGraph;params:MazeParams;initial:SolverId};
type Snapshot={discovered:number;expanded:number;path:number};
const ids=Object.keys(SOLVERS) as SolverId[];
const timeline=(run:SolverRun):Snapshot[]=>{const result:Snapshot[]=[{discovered:0,expanded:0,path:0}];for(const event of run.events){const previous=result[result.length-1],next={...previous};if(event.type==='discover')next.discovered++;else if(event.type==='expand')next.expanded++;else if(event.type==='path')next.path++;result.push(next);}return result;};

export default function SolverComparison({graph,params,initial}:Props){
  const [left,setLeft]=useState<SolverId>(initial),[right,setRight]=useState<SolverId>(initial==='astar'?'bfs':'astar');
  const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(40);
  const runs=useMemo(()=>({left:solveMaze(graph,left),right:solveMaze(graph,right)}),[graph,left,right]);
  const timelines=useMemo(()=>({left:timeline(runs.left),right:timeline(runs.right)}),[runs]);
  useEffect(()=>{setProgress(0);setPlaying(false);},[graph,left,right]);
  useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setProgress(value=>{const next=Math.min(100,value+2);if(next===100)setPlaying(false);return next;}),speed);return()=>window.clearTimeout(timer);},[playing,progress,speed]);
  const snapshots={left:timelines.left[Math.ceil(runs.left.events.length*progress/100)],right:timelines.right[Math.ceil(runs.right.events.length*progress/100)]};
  const batch=useSolverSeedAnalysis(params);
  return <section className="solver-comparison" aria-label="Side-by-side solver playback">
    <div className="solver-compare-selectors">
      <label>Left solver<select name="comparison-left-solver" value={left} onChange={event=>setLeft(event.target.value as SolverId)}>{ids.map(id=><option key={id} value={id}>{SOLVERS[id].name}</option>)}</select></label>
      <label>Right solver<select name="comparison-right-solver" value={right} onChange={event=>setRight(event.target.value as SolverId)}>{ids.map(id=><option key={id} value={id}>{SOLVERS[id].name}</option>)}</select></label>
    </div>
    <div className="solver-compare-cards">{([['left',runs.left,snapshots.left],['right',runs.right,snapshots.right]] as const).map(([side,run,current])=><article key={side} aria-label={`${SOLVERS[run.algorithm].name} playback`}>
      <strong>{SOLVERS[run.algorithm].name}</strong>
      <div className="solver-live-bars" aria-label={`${SOLVERS[run.algorithm].name} live search metrics`}>
        <MetricBar label="Discovered" value={current.discovered} max={run.metrics.discovered}/><MetricBar label="Expanded" value={current.expanded} max={run.metrics.expanded}/><MetricBar label="Path shown" value={current.path} max={run.path.length}/>
      </div>
      <dl className="solver-metrics"><div><dt>Events</dt><dd>{run.events.length}</dd></div><div><dt>Path</dt><dd>{run.metrics.pathLength}</dd></div><div><dt>Turns</dt><dd>{run.metrics.turns}</dd></div></dl>
    </article>)}</div>
    <div className="solver-buttons" role="group" aria-label="Comparison playback controls"><button type="button" className="btn btn-sm btn-primary" onClick={()=>{if(progress===100)setProgress(0);setPlaying(value=>!value);}}>{playing?'Pause':progress===100?'Replay':'Play'}</button><button type="button" className="btn btn-sm" onClick={()=>{setPlaying(false);setProgress(0);}}>Restart</button><button type="button" className="btn btn-sm" disabled={progress===100} onClick={()=>{setPlaying(false);setProgress(value=>Math.min(100,value+2));}}>Step</button></div>
    <label>Comparison speed: {speed} ms/frame<input name="comparison-speed" type="range" min="10" max="200" step="10" value={speed} onChange={event=>setSpeed(Number(event.target.value))}/></label>
    <label>Shared progress — {progress}%<input name="comparison-progress" type="range" min="0" max="100" step="1" value={progress} onChange={event=>{setPlaying(false);setProgress(Number(event.target.value));}}/></label>
    <details className="solver-seed-analysis"><summary>Multi-seed charts</summary><div className="stack">
      <p>Runs all four solvers on the same generated mazes in a background worker.</p>
      <label>Maze seeds<select name="solver-seed-count" value={batch.count} disabled={batch.running} onChange={event=>batch.setCount(Number(event.target.value) as SolverSeedCount)}><option value="10">10 seeds</option><option value="25">25 seeds</option><option value="50">50 seeds</option></select></label>
      <button type="button" className="btn" onClick={batch.running?batch.cancel:batch.run}>{batch.running?'Cancel analysis':'Run multi-seed analysis'}</button>
      {batch.result&&<><div role="status">{batch.running?`Analyzing ${batch.result.completed}/${batch.result.total} seeds`:`Analysis complete — ${batch.result.total} seeds`}</div><SeedCharts rows={batch.result.results}/></>}
      {batch.error&&<p role="alert">{batch.error}</p>}
    </div></details>
  </section>;
}

function MetricBar({label,value,max}:{label:string;value:number;max:number}){
  const percent=max?Math.min(100,value/max*100):0;
  return <div><span>{label}</span><div className="metric-track"><span style={{width:`${percent}%`}}/></div><output>{value}/{max}</output></div>;
}

const aggregateMetrics=[['meanExpanded','Expanded'],['meanDiscovered','Discovered'],['meanPathLength','Path'],['meanTurns','Turns'],['meanEvents','Events']] as const;
function SeedCharts({rows}:{rows:readonly SolverSeedAggregate[]}){
  return <div className="solver-seed-charts" role="region" aria-label="Multi-seed solver charts">{aggregateMetrics.map(([key,label])=>{
    const max=Math.max(1,...rows.map(row=>row[key]));
    return <section key={key} aria-label={`Average ${label.toLowerCase()}`}><strong>{label}</strong>{rows.map(row=><div key={row.algorithm}><span>{SOLVERS[row.algorithm].name}</span><div className="metric-track"><span style={{width:`${row[key]/max*100}%`}}/></div><output>{row[key].toFixed(1)}</output></div>)}</section>;
  })}</div>;
}

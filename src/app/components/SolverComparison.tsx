import { useEffect, useMemo, useState } from 'react';
import type { MazeGraph } from '../../maze/graph';
import { SOLVERS, solveMaze, type SolverEvent, type SolverId, type SolverRun } from '../../maze/solvers';

type Props={graph:MazeGraph;initial:SolverId};
type Snapshot={discovered:number;expanded:number;path:number};
const ids=Object.keys(SOLVERS) as SolverId[];
const snapshot=(run:SolverRun,progress:number):Snapshot=>run.events.slice(0,Math.ceil(run.events.length*progress/100)).reduce((value,event:SolverEvent)=>{
  if(event.type==='discover')value.discovered++;
  else if(event.type==='expand')value.expanded++;
  else if(event.type==='path')value.path++;
  return value;
},{discovered:0,expanded:0,path:0});

export default function SolverComparison({graph,initial}:Props){
  const [left,setLeft]=useState<SolverId>(initial),[right,setRight]=useState<SolverId>(initial==='astar'?'bfs':'astar');
  const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(40);
  const runs=useMemo(()=>({left:solveMaze(graph,left),right:solveMaze(graph,right)}),[graph,left,right]);
  useEffect(()=>{setProgress(0);setPlaying(false);},[graph,left,right]);
  useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setProgress(value=>{const next=Math.min(100,value+2);if(next===100)setPlaying(false);return next;}),speed);return()=>window.clearTimeout(timer);},[playing,progress,speed]);
  const snapshots={left:snapshot(runs.left,progress),right:snapshot(runs.right,progress)};
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
  </section>;
}

function MetricBar({label,value,max}:{label:string;value:number;max:number}){
  const percent=max?Math.min(100,value/max*100):0;
  return <div><span>{label}</span><div className="metric-track"><span style={{width:`${percent}%`}}/></div><output>{value}/{max}</output></div>;
}

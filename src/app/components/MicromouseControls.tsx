import { useEffect, useState } from 'react';
import type { PlaybackState } from '../hooks/useSolverPlayback';
import type { MicromouseComparison, MicromouseMetrics, MousePhase, MouseRealism, MouseStrategyId } from '../../maze/micromouse';
import { MICROMOUSE_FORMATS, micromouseFootprintMeters, type MicromouseFormat, type MicromouseFormatId } from '../../maze/micromouseFormats';
import { matchingMouseProfile, MOUSE_PROFILES, type MouseMotion, type MouseProfileId } from '../../maze/micromouseProfiles';
import type { BatchSeedCount, MicromouseBatchResult } from '../micromouseBatch';
import { batchCsv, batchJson, comparisonCsv, comparisonJson, downloadText, exportFilename, type ComparisonExportContext } from '../micromouseExport';

export type MicromouseBatchControls={count:BatchSeedCount;setCount:(count:BatchSeedCount)=>void;running:boolean;result:MicromouseBatchResult|null;error:string|null;durationMs:number|null;run:()=>void;cancel:()=>void};
export type MicromouseControlsProps={available:boolean;active:boolean;reason?:string;failureReason?:string;state:PlaybackState;phase:MousePhase|'ready'|'complete';eventCount:number;speed:number;setSpeed:(value:number)=>void;showWalls:boolean;setShowWalls:(value:boolean)=>void;showFlood:boolean;setShowFlood:(value:boolean)=>void;showRoute:boolean;setShowRoute:(value:boolean)=>void;metrics?:MicromouseMetrics;simulationCostMs?:number;comparisonCostMs?:number;format?:MicromouseFormat;exportContext:ComparisonExportContext;applyFormat:(id:MicromouseFormatId)=>void;motion:MouseMotion;setMotion:(motion:MouseMotion)=>void;realism:MouseRealism;setRealism:(realism:MouseRealism)=>void;strategy:MouseStrategyId;setStrategy:(strategy:MouseStrategyId)=>void;comparisons?:readonly MicromouseComparison[];toggleComparison:()=>void;batch:MicromouseBatchControls;start:()=>void;play:()=>void;pause:()=>void;restart:()=>void;step:()=>void;seek:(index:number)=>void;seekPhase:(phase:MousePhase)=>void};
const seconds=(ms:number)=>`${(ms/1000).toFixed(2)} s`;
const strategyNames:Record<MouseStrategyId,string>={'flood-fill':'Flood Fill',tremaux:'Trémaux','right-wall':'Right-Wall'};

export default function MicromouseControls(props:MicromouseControlsProps){
  const [draftMotion,setDraftMotion]=useState(props.motion),[draftRealism,setDraftRealism]=useState(props.realism);
  useEffect(()=>setDraftMotion(props.motion),[props.motion]);
  useEffect(()=>setDraftRealism(props.realism),[props.realism]);
  const dirty=JSON.stringify(draftMotion)!==JSON.stringify(props.motion)||JSON.stringify(draftRealism)!==JSON.stringify(props.realism);
  const applySettings=()=>{props.setMotion(draftMotion);props.setRealism(draftRealism);};
  const resetSettings=()=>{setDraftMotion(props.motion);setDraftRealism(props.realism);};
  const progress=props.eventCount?Math.round(props.state.index/props.eventCount*100):0,label=props.phase==='ready'?'Ready':props.phase==='complete'?'Complete':props.phase[0].toUpperCase()+props.phase.slice(1),profileId=matchingMouseProfile(draftMotion);
  return <div className="mouse-controls" role="group" aria-label="Micromouse controls">
    <label>Competition format
      <select name="micromouse-format" value={props.format?.id??'custom'} onChange={e=>{if(e.target.value!=='custom')props.applyFormat(e.target.value as MicromouseFormatId)}}>
        <option value="custom">Custom maze</option>
        {Object.values(MICROMOUSE_FORMATS).map(format=><option key={format.id} value={format.id}>{format.name} ({format.width}×{format.height} · {format.cellPitchCm} cm)</option>)}
      </select>
    </label>
    {props.format&&<CompetitionDimensions format={props.format} speedCells={props.metrics?.speed.cells}/>}
    <label>Exploration strategy<select name="micromouse-strategy" value={props.strategy} onChange={e=>props.setStrategy(e.target.value as MouseStrategyId)}>
      <option value="flood-fill">Flood Fill</option><option value="tremaux">Trémaux (least visited)</option><option value="right-wall">Right-Wall Follower</option>
    </select></label>
    <p>{props.strategy==='flood-fill'?'Heads toward the lowest estimated distance.':props.strategy==='tremaux'?'Prefers the least-visited passage while using the goal distance as a tie-breaker.':'Keeps the right wall; reliable on perfect mazes but may loop in braided mazes.'}</p>
    <section className="calculation-policy" aria-label="Calculation policy"><strong>Calculation policy</strong><p>Maze visuals and solving update after applied maze changes. Robot simulations run only when you press Start, Compare, or Run benchmark.</p><dl className="solver-metrics"><div><dt>Simulation</dt><dd>{props.simulationCostMs===undefined?'Not run':`${props.simulationCostMs} ms`}</dd></div><div><dt>Comparison</dt><dd>{props.comparisonCostMs===undefined?'Not run':`${props.comparisonCostMs} ms`}</dd></div><div><dt>Batch</dt><dd>{props.batch.durationMs===null?'Not run':`${props.batch.durationMs} ms`}</dd></div></dl></section>
    <button type="button" className="btn btn-sm" disabled={!props.available} aria-expanded={Boolean(props.comparisons)} onClick={props.toggleComparison}>{props.comparisons?'Hide strategy comparison':'Compare all strategies'}</button>
    {props.comparisons&&<StrategyComparison rows={props.comparisons} selected={props.strategy} context={props.exportContext}/>}
    <BatchBenchmark batch={props.batch} available={props.available}/>
    <fieldset className="mouse-physics"><legend>Robot physics</legend>
      <label>Robot profile<select name="micromouse-profile" value={profileId} onChange={e=>{if(e.target.value!=='custom')setDraftMotion(MOUSE_PROFILES[e.target.value as MouseProfileId].motion)}}>
        {Object.entries(MOUSE_PROFILES).map(([id,profile])=><option key={id} value={id}>{profile.name}</option>)}<option value="custom">Custom</option>
      </select></label>
      <p>{profileId==='custom'?'Custom robot motion settings.':MOUSE_PROFILES[profileId].description}</p>
      <label>Maximum speed: {draftMotion.maxSpeedMps.toFixed(2)} m/s<input name="mouse-max-speed" type="range" min="0.2" max="5" step="0.05" value={draftMotion.maxSpeedMps} onChange={e=>setDraftMotion({...draftMotion,maxSpeedMps:Number(e.target.value)})}/></label>
      <label>Acceleration: {draftMotion.accelerationMps2.toFixed(1)} m/s²<input name="mouse-acceleration" type="range" min="0.5" max="20" step="0.5" value={draftMotion.accelerationMps2} onChange={e=>setDraftMotion({...draftMotion,accelerationMps2:Number(e.target.value)})}/></label>
      <label>Traction limit: {draftRealism.tractionLimitMps2.toFixed(1)} m/s²<input name="mouse-traction-limit" type="range" min="0.5" max="20" step="0.5" value={draftRealism.tractionLimitMps2} onChange={e=>setDraftRealism({...draftRealism,tractionLimitMps2:Number(e.target.value)})}/></label>
      <p>Effective acceleration: {Math.min(draftMotion.accelerationMps2,draftRealism.tractionLimitMps2).toFixed(1)} m/s².</p>
      <label>90° turn: {draftMotion.turn90Ms} ms<input name="mouse-turn-time" type="range" min="20" max="500" step="5" value={draftMotion.turn90Ms} onChange={e=>setDraftMotion({...draftMotion,turn90Ms:Number(e.target.value)})}/></label>
      <label className="hstack"><input name="mouse-diagonal-speed" type="checkbox" checked={draftRealism.diagonalSpeedRuns} onChange={e=>setDraftRealism({...draftRealism,diagonalSpeedRuns:e.target.checked})}/>Allow diagonal speed-run cornering</label>
      <p>Diagonal mode cuts across learned 90° corners without changing the search route.</p>
    </fieldset>
    <fieldset className="mouse-sensors"><legend>Sensors and correction</legend>
      <label>Sensor range: {draftRealism.sensorRangeCells} {draftRealism.sensorRangeCells===1?'cell':'cells'}<input name="mouse-sensor-range" type="range" min="1" max="4" step="1" value={draftRealism.sensorRangeCells} onChange={e=>setDraftRealism({...draftRealism,sensorRangeCells:Number(e.target.value)})}/></label>
      <label>Reading noise: {Math.round(draftRealism.sensorNoise*100)}%<input name="mouse-sensor-noise" type="range" min="0" max="25" step="1" value={Math.round(draftRealism.sensorNoise*100)} onChange={e=>setDraftRealism({...draftRealism,sensorNoise:Number(e.target.value)/100})}/></label>
      <label>Position correction: {draftRealism.correctionMs} ms/cell<input name="mouse-correction-time" type="range" min="0" max="100" step="5" value={draftRealism.correctionMs} onChange={e=>setDraftRealism({...draftRealism,correctionMs:Number(e.target.value)})}/></label>
      <label>Collision recovery: {draftRealism.collisionMs} ms<input name="mouse-collision-time" type="range" min="0" max="2000" step="50" value={draftRealism.collisionMs} onChange={e=>setDraftRealism({...draftRealism,collisionMs:Number(e.target.value)})}/></label>
      <p>Noise is deterministic for each maze seed. False-open readings can cause collisions; recovery and correction time are included in results.</p>
    </fieldset>
    <div className="robot-settings-actions" role="group" aria-label="Robot settings changes"><button type="button" className="btn btn-primary" disabled={!dirty} onClick={applySettings}>Apply changes</button><button type="button" className="btn" disabled={!dirty} onClick={resetSettings}>Reset changes</button>{dirty&&<span role="status">Changes not applied</span>}</div>
    {!props.available?<p>{props.reason}</p>:<>
      <div className="game-status" role="status"><strong>{label}</strong><span>{progress}%</span></div>
      {props.failureReason&&<p role="alert">Simulation stopped: {props.failureReason}</p>}
      <div className="grid-3">
        <button type="button" className="btn btn-sm btn-primary" onClick={props.active?(props.state.playing?props.pause:props.play):props.start}>{props.active?(props.state.playing?'Pause':props.state.finished?'Replay':'Resume'):'Start'}</button>
        <button type="button" className="btn btn-sm" onClick={props.restart} disabled={!props.active}>Restart</button>
        <button type="button" className="btn btn-sm" onClick={props.step} disabled={!props.active||props.state.finished}>Step</button>
      </div>
      <label>Playback speed: {props.speed} ms/event<input name="micromouse-speed" type="range" min="10" max="250" step="10" value={props.speed} onChange={e=>props.setSpeed(Number(e.target.value))}/></label>
      <label>{label} — {progress}%<input name="micromouse-progress" aria-label="Micromouse progress" type="range" min="0" max={props.eventCount} value={props.state.index} onChange={e=>props.seek(Number(e.target.value))}/></label>
      <div className="grid-3" role="group" aria-label="Micromouse phases">{(['search','return','speed'] as const).map(phase=><button key={phase} type="button" className="btn btn-sm" disabled={!props.active} onClick={()=>props.seekPhase(phase)}>{phase[0].toUpperCase()+phase.slice(1)}</button>)}</div>
      <div className="mouse-layer-toggles">
        <label><input name="mouse-walls" type="checkbox" checked={props.showWalls} onChange={e=>props.setShowWalls(e.target.checked)}/>Known walls</label>
        <label><input name="mouse-flood" type="checkbox" checked={props.showFlood} onChange={e=>props.setShowFlood(e.target.checked)}/>Flood values</label>
        <label><input name="mouse-route" type="checkbox" checked={props.showRoute} onChange={e=>props.setShowRoute(e.target.checked)}/>Route</label>
      </div>
      {props.metrics&&<dl className="solver-metrics">
        <div><dt>Search</dt><dd>{seconds(props.metrics.search.timeMs)}</dd></div><div><dt>Return</dt><dd>{seconds(props.metrics.return.timeMs)}</dd></div>
        <div><dt>Speed run</dt><dd>{seconds(props.metrics.speed.timeMs)}</dd></div><div><dt>Total</dt><dd>{seconds(props.metrics.totalTimeMs)}</dd></div>
        <div><dt>Explored</dt><dd>{props.metrics.exploredPercent}%</dd></div><div><dt>Revisits</dt><dd>{props.metrics.revisits}</dd></div>
        <div><dt>Speed route</dt><dd>{props.metrics.speed.cells} cells</dd></div><div><dt>Route quality</dt><dd>{props.metrics.speedRouteQuality.toFixed(2)}×</dd></div>
        <div><dt>Speed distance</dt><dd>{props.metrics.speedDistanceCells.toFixed(2)} cells</dd></div><div><dt>Diagonal cuts</dt><dd>{props.metrics.speedDiagonalCuts}</dd></div>
        <div><dt>Effective acceleration</dt><dd>{props.metrics.effectiveAccelerationMps2.toFixed(1)} m/s²</dd></div>
        <div><dt>Collisions</dt><dd>{props.metrics.collisions}</dd></div>
      </dl>}
    </>}
  </div>;
}

function BatchBenchmark({batch,available}:{batch:MicromouseBatchControls;available:boolean}){
  return <details className="mouse-batch"><summary>Batch benchmark</summary><div className="stack">
    <label>Maze seeds<select name="mouse-batch-count" value={batch.count} disabled={batch.running} onChange={e=>batch.setCount(Number(e.target.value) as BatchSeedCount)}><option value="10">10 seeds</option><option value="25">25 seeds</option><option value="50">50 seeds</option></select></label>
    <button type="button" className="btn btn-sm" disabled={!available} onClick={batch.running?batch.cancel:batch.run}>{batch.running?'Cancel benchmark':'Run batch benchmark'}</button>
    {batch.result&&<><div role="status">{batch.running?`Benchmarking ${batch.result.completed}/${batch.result.total}`:`Benchmark complete — ${batch.result.total} seeds`}</div><div className="leaderboard-scroll"><table aria-label="Batch benchmark results"><thead><tr><th>Strategy</th><th>Finish</th><th>Mean search</th><th>Median</th><th>Cells</th><th>Revisits</th><th>Explored</th><th>Speed</th></tr></thead><tbody>{batch.result.results.map(row=><tr key={row.strategy}><td>{strategyNames[row.strategy]}</td><td>{Math.round(row.completionRate*100)}%</td><td>{seconds(row.meanSearchTimeMs)}</td><td>{seconds(row.medianSearchTimeMs)}</td><td>{row.meanSearchCells.toFixed(1)}</td><td>{row.meanRevisits.toFixed(1)}</td><td>{row.meanExploredPercent.toFixed(1)}%</td><td>{seconds(row.meanSpeedTimeMs)}</td></tr>)}</tbody></table></div><ExportButtons kind="batch" csv={()=>batchCsv(batch.result!)} json={()=>batchJson(batch.result!)}/></>}
    {batch.error&&<p role="alert">{batch.error}</p>}
  </div></details>;
}

function StrategyComparison({rows,selected,context}:{rows:readonly MicromouseComparison[];selected:MouseStrategyId;context:ComparisonExportContext}){
  return <section className="mouse-comparison" aria-label="Strategy comparison"><strong>Same maze · same robot</strong><div className="leaderboard-scroll"><table>
    <thead><tr><th>Strategy</th><th>Search</th><th>Time</th><th>Revisits</th><th>Explored</th><th>Speed</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.strategy} className={row.strategy===selected?'selected':''}><td>{strategyNames[row.strategy]}</td>{row.success?<><td>{row.metrics.search.cells}</td><td>{seconds(row.metrics.search.timeMs)}</td><td>{row.metrics.revisits}</td><td>{row.metrics.exploredPercent}%</td><td>{seconds(row.metrics.speed.timeMs)}</td></>:<td colSpan={5}>Did not finish</td>}</tr>)}</tbody>
  </table></div><ExportButtons kind="comparison" csv={()=>comparisonCsv(rows,context)} json={()=>comparisonJson(rows,context)}/></section>;
}

function ExportButtons({kind,csv,json}:{kind:'batch'|'comparison';csv:()=>string;json:()=>string}){return <div className="export-actions" role="group" aria-label={`${kind==='batch'?'Batch benchmark':'Strategy comparison'} export`}><button type="button" className="btn btn-sm" onClick={()=>downloadText(exportFilename(kind,'csv'),csv(),'text/csv;charset=utf-8')}>Export CSV</button><button type="button" className="btn btn-sm" onClick={()=>downloadText(exportFilename(kind,'json'),json(),'application/json')}>Export JSON</button></div>;}

function CompetitionDimensions({format,speedCells}:{format:MicromouseFormat;speedCells?:number}){
  const footprint=micromouseFootprintMeters(format);
  return <div className="competition-spec" role="region" aria-label="Competition dimensions">
    <strong>{format.name} dimensions</strong>
    <span>{format.width}×{format.height} cells · {footprint.width.toFixed(2)}×{footprint.height.toFixed(2)} m nominal</span>
    <span>{format.cellPitchCm} cm cell pitch · {format.passageWidthCm} cm passage</span>
    <span>{format.wallThicknessCm} cm wall thickness · {format.wallHeightCm} cm wall height</span>
    <span>Goal: {format.id==='classic'?'four-cell center zone':'center target cell'}</span>
    {speedCells!==undefined&&<span>Speed-route distance: {(speedCells*format.cellPitchCm/100).toFixed(2)} m</span>}
  </div>;
}

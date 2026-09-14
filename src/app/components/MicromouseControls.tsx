import type { PlaybackState } from '../hooks/useSolverPlayback';
import type { MicromouseMetrics, MousePhase } from '../../maze/micromouse';
import { MICROMOUSE_FORMATS, micromouseFootprintMeters, type MicromouseFormat, type MicromouseFormatId } from '../../maze/micromouseFormats';

export type MicromouseControlsProps={available:boolean;active:boolean;reason?:string;failureReason?:string;state:PlaybackState;phase:MousePhase|'ready'|'complete';eventCount:number;speed:number;setSpeed:(value:number)=>void;showWalls:boolean;setShowWalls:(value:boolean)=>void;showFlood:boolean;setShowFlood:(value:boolean)=>void;showRoute:boolean;setShowRoute:(value:boolean)=>void;metrics?:MicromouseMetrics;format?:MicromouseFormat;applyFormat:(id:MicromouseFormatId)=>void;start:()=>void;play:()=>void;pause:()=>void;restart:()=>void;step:()=>void;seek:(index:number)=>void;seekPhase:(phase:MousePhase)=>void};
const seconds=(ms:number)=>`${(ms/1000).toFixed(2)} s`;

export default function MicromouseControls(props:MicromouseControlsProps){
  const progress=props.eventCount?Math.round(props.state.index/props.eventCount*100):0,label=props.phase==='ready'?'Ready':props.phase==='complete'?'Complete':props.phase[0].toUpperCase()+props.phase.slice(1);
  return <div className="mouse-controls" role="group" aria-label="Micromouse controls">
    <label>Competition format
      <select name="micromouse-format" value={props.format?.id??'custom'} onChange={e=>{if(e.target.value!=='custom')props.applyFormat(e.target.value as MicromouseFormatId)}}>
        <option value="custom">Custom maze</option>
        {Object.values(MICROMOUSE_FORMATS).map(format=><option key={format.id} value={format.id}>{format.name} ({format.width}×{format.height} · {format.cellPitchCm} cm)</option>)}
      </select>
    </label>
    {props.format&&<CompetitionDimensions format={props.format} speedCells={props.metrics?.speed.cells}/>}
    {!props.available?<p>{props.reason}</p>:<>
      <div className="game-status" role="status"><strong>{label}</strong><span>{progress}%</span></div>
      {props.failureReason&&<p role="alert">Simulation stopped: {props.failureReason}</p>}
      <div className="grid-3">
        <button type="button" className="btn btn-sm btn-primary" onClick={props.active?(props.state.playing?props.pause:props.play):props.start}>{props.active?(props.state.playing?'Pause':props.state.finished?'Replay':'Resume'):'Start'}</button>
        <button type="button" className="btn btn-sm" onClick={props.restart} disabled={!props.active}>Restart</button>
        <button type="button" className="btn btn-sm" onClick={props.step} disabled={!props.active||props.state.finished}>Step</button>
      </div>
      <label>Playback speed: {props.speed} ms/event<input name="micromouse-speed" type="range" min="10" max="250" step="10" value={props.speed} onChange={e=>props.setSpeed(Number(e.target.value))}/></label>
      <label>{label} — {progress}%<input aria-label="Micromouse progress" type="range" min="0" max={props.eventCount} value={props.state.index} onChange={e=>props.seek(Number(e.target.value))}/></label>
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
      </dl>}
    </>}
  </div>;
}

function CompetitionDimensions({format,speedCells}:{format:MicromouseFormat;speedCells?:number}){
  const footprint=micromouseFootprintMeters(format);
  return <div className="competition-spec" role="region" aria-label="Competition dimensions">
    <strong>{format.name} dimensions</strong>
    <span>{format.width}×{format.height} cells · {footprint.width.toFixed(2)}×{footprint.height.toFixed(2)} m nominal</span>
    <span>{format.cellPitchCm} cm cell pitch · {format.passageWidthCm} cm passage</span>
    <span>{format.wallThicknessCm} cm wall thickness · {format.wallHeightCm} cm wall height</span>
    {speedCells!==undefined&&<span>Speed-route distance: {(speedCells*format.cellPitchCm/100).toFixed(2)} m</span>}
  </div>;
}

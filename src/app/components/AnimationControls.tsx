import { GENERATORS, type GeneratorId } from '../maze';
import { ANIMATION_MODES, type AnimationMode } from '../../maze/animation';
import { SOLVERS, type SolverId, type SolverMetrics } from '../../maze/solvers';
import type { PlaybackState } from '../hooks/useSolverPlayback';

export type AnimationControlsProps = {
  mode: AnimationMode;
  setMode: (mode: AnimationMode) => void;
  generator: GeneratorId;
  setGenerator: (generator: GeneratorId) => void;
  solver: SolverId;
  setSolver: (solver: SolverId) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  generationColor: string;
  setGenerationColor: (color: string) => void;
  generationOpacity: number;
  setGenerationOpacity: (opacity: number) => void;
  solverColor: string;
  setSolverColor: (color: string) => void;
  solverOpacity: number;
  setSolverOpacity: (opacity: number) => void;
  phase: 'Building'|'Solving'|'Complete';
  state: PlaybackState;
  eventCount: number;
  metrics: SolverMetrics;
  play: () => void;
  pause: () => void;
  restart: () => void;
  step: () => void;
  seek: (index: number) => void;
};

export default function AnimationControls(props:AnimationControlsProps){
  const progress=props.eventCount===0?0:Math.round(props.state.index/props.eventCount*100);
  return <div className="solver-controls">
    <label>Animation mode
      <select name="animation-mode" value={props.mode} onChange={event=>props.setMode(event.target.value as AnimationMode)}>
        {Object.entries(ANIMATION_MODES).map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select>
    </label>
    <label>Generation algorithm
      <select name="generation-algorithm" value={props.generator} disabled={props.mode==='solve'} onChange={event=>props.setGenerator(event.target.value as GeneratorId)}>
        {Object.values(GENERATORS).map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
    {props.mode!=='solve'&&<p className="solver-description">{GENERATORS[props.generator].description}</p>}
    <label>Solving algorithm
      <select name="solving-algorithm" value={props.solver} disabled={props.mode==='build'} onChange={event=>props.setSolver(event.target.value as SolverId)}>
        {Object.values(SOLVERS).map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
    {props.mode!=='build'&&<p className="solver-description">{SOLVERS[props.solver].description}</p>}
    {props.mode!=='build'&&<>
      <label className="color-control">Solver color
        <input aria-label="Solver animation color" type="color" value={props.solverColor} onChange={event=>props.setSolverColor(event.target.value)}/>
      </label>
      <label>Solver opacity: {Math.round(props.solverOpacity*100)}%
        <input aria-label="Solver animation opacity" type="range" min={10} max={100} step={5} value={Math.round(props.solverOpacity*100)} onChange={event=>props.setSolverOpacity(Number(event.target.value)/100)}/>
      </label>
    </>}
    {props.mode!=='solve'&&<>
      <label className="color-control">Build color
        <input aria-label="Build animation color" type="color" value={props.generationColor} onChange={event=>props.setGenerationColor(event.target.value)}/>
      </label>
      <label>Build opacity: {Math.round(props.generationOpacity*100)}%
        <input aria-label="Build animation opacity" type="range" min={10} max={100} step={5} value={Math.round(props.generationOpacity*100)} onChange={event=>props.setGenerationOpacity(Number(event.target.value)/100)}/>
      </label>
    </>}
    <label className="hstack"><input type="checkbox" checked={props.enabled} onChange={event=>props.setEnabled(event.target.checked)}/>Show animation overlay</label>
    <label>Playback speed: {props.speed} ms/event
      <input type="range" min={10} max={250} step={10} value={props.speed} onChange={event=>props.setSpeed(Number(event.target.value))} disabled={!props.enabled}/>
    </label>
    <div className="solver-buttons" role="group" aria-label="Animation playback controls">
      <button className="btn btn-sm" type="button" onClick={props.state.playing?props.pause:props.play} disabled={!props.enabled}>{props.state.playing?'Pause':props.state.finished?'Replay':'Play'}</button>
      <button className="btn btn-sm" type="button" onClick={props.restart} disabled={!props.enabled}>Restart</button>
      <button className="btn btn-sm" type="button" onClick={props.step} disabled={!props.enabled||props.state.finished}>Step</button>
    </div>
    <label>{props.phase} — {progress}%
      <input aria-label="Animation progress" type="range" min={0} max={props.eventCount} value={props.state.index} onChange={event=>props.seek(Number(event.target.value))} disabled={!props.enabled}/>
    </label>
    {props.mode!=='build'&&<dl className="solver-metrics">
      <div><dt>Discovered</dt><dd>{props.metrics.discovered}</dd></div>
      <div><dt>Expanded</dt><dd>{props.metrics.expanded}</dd></div>
      <div><dt>Path</dt><dd>{props.metrics.pathLength} steps</dd></div>
      <div><dt>Turns</dt><dd>{props.metrics.turns}</dd></div>
    </dl>}
  </div>;
}

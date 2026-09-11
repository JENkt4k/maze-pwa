import { SOLVERS, type SolverId, type SolverMetrics } from '../../maze/solvers';
import type { PlaybackState } from '../hooks/useSolverPlayback';

export type SolverControlsProps = {
  algorithm: SolverId;
  setAlgorithm: (algorithm: SolverId) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  state: PlaybackState;
  eventCount: number;
  metrics: SolverMetrics;
  play: () => void;
  pause: () => void;
  restart: () => void;
  step: () => void;
  seek: (index: number) => void;
};

export default function SolverControls(props: SolverControlsProps) {
  const solver = SOLVERS[props.algorithm];
  const progress = props.eventCount === 0 ? 0 : Math.round(props.state.index / props.eventCount * 100);
  return <div className="solver-controls">
    <label>Algorithm
      <select value={props.algorithm} onChange={event => props.setAlgorithm(event.target.value as SolverId)}>
        {Object.values(SOLVERS).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
    <p className="solver-description">{solver.description}</p>
    <label className="hstack"><input type="checkbox" checked={props.enabled} onChange={event => props.setEnabled(event.target.checked)} />Show solver overlay</label>
    <label>Playback speed: {props.speed} ms/event
      <input type="range" min={10} max={250} step={10} value={props.speed} onChange={event => props.setSpeed(Number(event.target.value))} disabled={!props.enabled} />
    </label>
    <div className="solver-buttons" role="group" aria-label="Solver playback controls">
      <button className="btn btn-sm" type="button" onClick={props.state.playing ? props.pause : props.play} disabled={!props.enabled}>{props.state.playing ? 'Pause' : props.state.finished ? 'Replay' : 'Play'}</button>
      <button className="btn btn-sm" type="button" onClick={props.restart} disabled={!props.enabled}>Restart</button>
      <button className="btn btn-sm" type="button" onClick={props.step} disabled={!props.enabled || props.state.finished}>Step</button>
    </div>
    <label>Progress: {progress}%
      <input aria-label="Solver progress" type="range" min={0} max={props.eventCount} value={props.state.index} onChange={event => props.seek(Number(event.target.value))} disabled={!props.enabled} />
    </label>
    <dl className="solver-metrics">
      <div><dt>Discovered</dt><dd>{props.metrics.discovered}</dd></div>
      <div><dt>Expanded</dt><dd>{props.metrics.expanded}</dd></div>
      <div><dt>Path</dt><dd>{props.metrics.pathLength} steps</dd></div>
      <div><dt>Turns</dt><dd>{props.metrics.turns}</dd></div>
    </dl>
  </div>;
}

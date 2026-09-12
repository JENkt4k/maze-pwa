import type { MazeGameState } from '../hooks/useMazeGame';

type Props={active:boolean;state:MazeGameState;breadcrumbs:boolean;setBreadcrumbs:(value:boolean)=>void;start:()=>void;pause:()=>void;restart:()=>void};
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;

export default function GameplayControls(props:Props){
  const label=props.state.status==='complete'?'Completed':props.state.status==='playing'?'Playing':props.state.status==='paused'?'Paused':'Ready';
  return <div className="game-controls" role="group" aria-label="Gameplay controls">
    <div className="game-status" role="status" aria-live="polite"><strong>{label}</strong><span>{time(props.state.elapsedMs)}</span></div>
    <div className="grid-3">
      <button type="button" className="btn btn-sm btn-primary" onClick={props.start}>{props.state.status==='paused'?'Resume':props.state.status==='complete'?'Play again':props.active?'Focus game':'Play'}</button>
      <button type="button" className="btn btn-sm" onClick={props.pause} disabled={props.state.status!=='playing'}>Pause</button>
      <button type="button" className="btn btn-sm" onClick={props.restart}>Restart</button>
    </div>
    <label className="hstack"><input name="game-breadcrumbs" type="checkbox" checked={props.breadcrumbs} onChange={e=>props.setBreadcrumbs(e.target.checked)}/><span>Show breadcrumbs</span></label>
    <dl className="solver-metrics"><div><dt>Moves</dt><dd>{props.state.moves}</dd></div><div><dt>Revisits</dt><dd>{props.state.revisits}</dd></div></dl>
    <p>Use arrow keys or WASD, swipe, or select a highlighted adjacent cell.</p>
  </div>;
}

import type { MazeGameState } from '../hooks/useMazeGame';

type Props={active:boolean;state:MazeGameState;breadcrumbs:boolean;setBreadcrumbs:(value:boolean)=>void;start:()=>void;pause:()=>void;restart:()=>void;hint:()=>void;newMaze:()=>void;difficulty:number;personalBestMs?:number};
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
    <button type="button" className="btn btn-sm" disabled={props.state.status!=='playing'} onClick={props.hint}>Show next move</button>
    {!!props.state.hints&&<p>{props.state.hints} hint{props.state.hints===1?'':'s'} used — assisted runs are excluded from rankings.</p>}
    {props.state.status==='complete'&&<section className="game-results" aria-label="Maze results">
      <strong>Maze complete!</strong>
      <dl className="solver-metrics"><div><dt>Time</dt><dd>{time(props.state.elapsedMs)}</dd></div><div><dt>Difficulty</dt><dd>{props.difficulty}/100</dd></div><div><dt>Moves</dt><dd>{props.state.moves}</dd></div><div><dt>Revisits</dt><dd>{props.state.revisits}</dd></div></dl>
      <p>{props.state.hints?'Assisted completion':props.personalBestMs===undefined?'First ranked completion':props.state.elapsedMs<props.personalBestMs?'New personal best!':`Personal best: ${time(props.personalBestMs)}`}</p>
      <div className="hstack"><button type="button" className="btn btn-primary" onClick={props.restart}>Play again</button><button type="button" className="btn" onClick={props.newMaze}>New maze</button></div>
    </section>}
    <p>Use arrow keys or WASD, swipe, or select a highlighted adjacent cell.</p>
  </div>;
}

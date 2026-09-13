import { useEffect, useMemo, useState } from 'react';
import type { PlayHistoryEntry } from '../history';
import { leaderboardMazes, rankAttempts, type LeaderboardSort } from '../leaderboard';
import { SHARED_LEADERBOARD_CONSENT_KEY, SharedLeaderboardClient, submissionFromAttempt, type SharedScore } from '../sharedLeaderboard';

export type LeaderboardProps={entries:readonly PlayHistoryEntry[];currentMazeId:string;sharedEndpoint?:string};
const duration=(ms:number)=>{const tenths=Math.floor(ms/100);const seconds=Math.floor(tenths/10);return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}.${tenths%10}`;};

export default function Leaderboard({entries,currentMazeId,sharedEndpoint}:LeaderboardProps){
  const mazes=useMemo(()=>leaderboardMazes(entries),[entries]);
  const [selected,setSelected]=useState(currentMazeId);
  const [sort,setSort]=useState<LeaderboardSort>('time');
  const [sharedEnabled,setSharedEnabled]=useState(()=>{try{return localStorage.getItem(SHARED_LEADERBOARD_CONSENT_KEY)==='true';}catch{return false;}});
  const [name,setName]=useState('');
  const [shared,setShared]=useState<readonly SharedScore[]>([]);
  const [sharedStatus,setSharedStatus]=useState<'idle'|'loading'|'submitting'>('idle');
  const [sharedError,setSharedError]=useState<string|null>(null);
  useEffect(()=>{if(!mazes.some(maze=>maze.mazeId===selected))setSelected(mazes.find(maze=>maze.mazeId===currentMazeId)?.mazeId??mazes[0]?.mazeId??'');},[mazes,currentMazeId,selected]);
  const ranked=rankAttempts(entries,selected,sort),benchmark=ranked.find(entry=>entry.micromouse)?.micromouse;
  const latest=ranked[0];
  const client=useMemo(()=>sharedEndpoint?new SharedLeaderboardClient(sharedEndpoint):null,[sharedEndpoint]);
  useEffect(()=>{
    if(!sharedEnabled||!client||!selected){setShared([]);return;}
    const controller=new AbortController();setSharedStatus('loading');setSharedError(null);
    client.list(selected,sort,controller.signal).then(result=>setShared(result.entries)).catch(error=>{if(!controller.signal.aborted)setSharedError(error instanceof Error?error.message:'Could not load the shared leaderboard.');}).finally(()=>{if(!controller.signal.aborted)setSharedStatus('idle');});
    return()=>controller.abort();
  },[sharedEnabled,client,selected,sort]);
  const toggleShared=(enabled:boolean)=>{setSharedEnabled(enabled);try{localStorage.setItem(SHARED_LEADERBOARD_CONSENT_KEY,String(enabled));}catch{}if(!enabled){setShared([]);setSharedError(null);}};
  const submit=async()=>{
    if(!client||!latest||!name.trim())return;setSharedStatus('submitting');setSharedError(null);
    try{await client.submit(submissionFromAttempt(latest,name));const result=await client.list(selected,sort);setShared(result.entries);}
    catch(error){setSharedError(error instanceof Error?error.message:'Could not submit this score.');}
    finally{setSharedStatus('idle');}
  };
  return <div className="leaderboard" role="region" aria-label="Local leaderboard">
    {!mazes.length?<p className="muted">Complete a maze to create its leaderboard.</p>:<>
      <label>Maze<select name="leaderboard-maze" value={selected} onChange={event=>setSelected(event.target.value)}>{mazes.map(maze=><option key={maze.mazeId} value={maze.mazeId}>{maze.label}</option>)}</select></label>
      <div className="history-filters" role="group" aria-label="Leaderboard ranking">
        <button type="button" className={`btn btn-sm${sort==='time'?' btn-primary':''}`} aria-pressed={sort==='time'} onClick={()=>setSort('time')}>Best time</button>
        <button type="button" className={`btn btn-sm${sort==='moves'?' btn-primary':''}`} aria-pressed={sort==='moves'} onClick={()=>setSort('moves')}>Fewest moves</button>
      </div>
      <div className="leaderboard-scroll"><table><thead><tr><th>Rank</th><th>Time</th><th>Moves</th><th>Revisits</th></tr></thead><tbody>{ranked.map((entry,index)=><tr key={entry.id}><td>{index+1}</td><td>{duration(entry.elapsedMs)}</td><td>{entry.moves}</td><td>{entry.revisits}</td></tr>)}</tbody></table></div>
      {benchmark&&<section className="robot-benchmark" aria-label="Micromouse benchmark"><strong>Micromouse benchmark</strong><dl className="solver-metrics"><div><dt>Total</dt><dd>{duration(benchmark.totalTimeMs)}</dd></div><div><dt>Speed run</dt><dd>{duration(benchmark.speedTimeMs)}</dd></div><div><dt>Speed route</dt><dd>{benchmark.speedCells} cells</dd></div><div><dt>Explored</dt><dd>{benchmark.exploredPercent}%</dd></div><div><dt>Turns</dt><dd>{benchmark.turns}</dd></div></dl></section>}
    </>}
    <section className="shared-leaderboard" aria-label="Shared leaderboard">
      <div className="history-heading"><strong>Shared leaderboard</strong><span className="muted">Optional</span></div>
      <label className="shared-consent"><input type="checkbox" checked={sharedEnabled} onChange={event=>toggleShared(event.target.checked)}/><span>Enable online scores</span></label>
      {!sharedEndpoint?<p className="muted">Online scores are not configured for this deployment.</p>:sharedEnabled&&<>
        <p className="muted">Shares your display name, maze settings, time, moves, and revisits. Routes and drawings stay on this device.</p>
        <div className="shared-submit"><label>Display name<input className="input" name="shared-display-name" maxLength={24} value={name} onChange={event=>setName(event.target.value)} placeholder="Player"/></label><button type="button" className="btn btn-primary" disabled={!latest||!name.trim()||sharedStatus!=='idle'} onClick={submit}>Submit best local score</button></div>
        {sharedError&&<p role="alert" className="shared-error">{sharedError}</p>}
        {sharedStatus==='loading'?<p role="status" className="muted">Loading online scores…</p>:shared.length?<div className="leaderboard-scroll"><table><thead><tr><th>Rank</th><th>Player</th><th>Time</th><th>Moves</th><th>Revisits</th></tr></thead><tbody>{shared.map((entry,index)=><tr key={entry.id}><td>{index+1}</td><td>{entry.name}</td><td>{duration(entry.elapsedMs)}</td><td>{entry.moves}</td><td>{entry.revisits}</td></tr>)}</tbody></table></div>:<p className="muted">No online scores for this maze yet.</p>}
      </>}
    </section>
  </div>;
}

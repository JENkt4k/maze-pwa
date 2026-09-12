import { useEffect, useMemo, useState } from 'react';
import type { PlayHistoryEntry } from '../history';
import { leaderboardMazes, rankAttempts, type LeaderboardSort } from '../leaderboard';

export type LeaderboardProps={entries:readonly PlayHistoryEntry[];currentMazeId:string};
const duration=(ms:number)=>{const tenths=Math.floor(ms/100);const seconds=Math.floor(tenths/10);return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}.${tenths%10}`;};

export default function Leaderboard({entries,currentMazeId}:LeaderboardProps){
  const mazes=useMemo(()=>leaderboardMazes(entries),[entries]);
  const [selected,setSelected]=useState(currentMazeId);
  const [sort,setSort]=useState<LeaderboardSort>('time');
  useEffect(()=>{if(!mazes.some(maze=>maze.mazeId===selected))setSelected(mazes.find(maze=>maze.mazeId===currentMazeId)?.mazeId??mazes[0]?.mazeId??'');},[mazes,currentMazeId,selected]);
  const ranked=rankAttempts(entries,selected,sort),benchmark=ranked.find(entry=>entry.micromouse)?.micromouse;
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
  </div>;
}

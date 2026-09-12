import { useState } from 'react';
import type { PlayHistoryEntry } from '../history';

export type PlayHistoryProps={entries:readonly PlayHistoryEntry[];onOpen:(id:string)=>void;onDelete:(id:string)=>void;onClear:()=>void};
type Filter='all'|'completed'|'unfinished';
const duration=(ms:number)=>{const seconds=Math.floor(ms/1000);return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};

export default function PlayHistory({entries,onOpen,onDelete,onClear}:PlayHistoryProps){
  const [filter,setFilter]=useState<Filter>('all');
  const visible=entries.filter(entry=>filter==='all'||(filter==='completed'?entry.status==='completed':entry.status!=='completed'));
  return <div className="play-history" role="region" aria-label="Play history">
    <div className="history-filters" role="group" aria-label="History filter">
      {(['all','completed','unfinished'] as const).map(value=><button type="button" key={value} className={`btn btn-sm${filter===value?' btn-primary':''}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}
    </div>
    {!visible.length?<p className="muted">{entries.length?'No attempts match this filter.':'Play a maze to start your history.'}</p>:<ol className="history-list">
      {visible.map(entry=><li key={entry.id}>
        <div className="history-heading"><strong>{entry.status[0].toUpperCase()+entry.status.slice(1)}</strong><time dateTime={new Date(entry.startedAt).toISOString()}>{new Date(entry.startedAt).toLocaleString()}</time></div>
        <div className="history-metrics"><span>{duration(entry.elapsedMs)}</span><span>{entry.moves} moves</span><span>{entry.revisits} revisits</span></div>
        <div className="history-maze">{entry.params.width}×{entry.params.height} · seed {entry.params.seed}</div>
        <div className="hstack"><button type="button" className="btn btn-sm" onClick={()=>onOpen(entry.id)}>Reopen</button><button type="button" className="btn btn-sm btn-danger" onClick={()=>onDelete(entry.id)}>Delete</button></div>
      </li>)}
    </ol>}
    {!!entries.length&&<button type="button" className="btn btn-sm btn-danger" onClick={onClear}>Clear history</button>}
  </div>;
}

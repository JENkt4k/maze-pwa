import { abandonHistoryEntry, createHistoryEntry, historyGameState, parsePlayHistory, updateHistoryEntry } from '@src/app/history';
import type { MazeGameState } from '@src/app/hooks/useMazeGame';

const params={width:7,height:9,seed:42,g:.3,b:.15,tau:.4,topology:'grid' as const,generator:'dfs' as const};
const state:MazeGameState={key:'course-key',current:'0,0',route:['0,0'],moves:0,revisits:0,elapsedMs:0,status:'playing'};

test('history entries follow a gameplay attempt through completion and restore paused',()=>{
  const started=createHistoryEntry('maze-id','course-key',params,state,1000,'attempt-id');
  const completed=updateHistoryEntry(started,{...state,current:'1,0',route:['0,0','1,0'],moves:1,elapsedMs:2345,status:'complete'},4000);
  expect(completed).toMatchObject({id:'attempt-id',status:'completed',completedAt:4000,elapsedMs:2345,moves:1});
  expect(historyGameState(completed)).toEqual({key:'course-key',current:'1,0',route:['0,0','1,0'],moves:1,revisits:0,elapsedMs:2345,status:'complete'});
  expect(abandonHistoryEntry(completed,5000)).toBe(completed);
});

test('history parser rejects malformed records, deduplicates, sorts, and pauses interrupted play',()=>{
  const older=createHistoryEntry('maze-a','key-a',params,state,1000,'a');
  const newer=createHistoryEntry('maze-b','key-b',params,state,2000,'b');
  const parsed=parsePlayHistory(JSON.stringify([older,{bad:true},newer,older]));
  expect(parsed.map(entry=>entry.id)).toEqual(['b','a']);
  expect(parsed.every(entry=>entry.status==='paused')).toBe(true);
  expect(parsePlayHistory('{')).toEqual([]);
});

test('abandoning an unfinished attempt preserves its measurements',()=>{
  const entry=createHistoryEntry('maze-id','course-key',params,{...state,moves:3,revisits:1,elapsedMs:900},1000,'attempt-id');
  expect(abandonHistoryEntry(entry,2000)).toMatchObject({status:'abandoned',updatedAt:2000,moves:3,revisits:1,elapsedMs:900});
});

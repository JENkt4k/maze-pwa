import { decodeSignal,encodeSignal,mergeRoomResults,parseRoomResult,resultFromAttempt,roomResultsCsv,type RoomResult } from '@src/app/competitionRoom';
import type { PlayHistoryEntry } from '@src/app/history';
import type { MazeGraph } from '@src/maze/graph';

const graph:MazeGraph={start:'0,0',goals:['1,1'],nodes:new Map([
  ['0,0',{id:'0,0',position:{x:0,y:0},neighbors:['1,0']}],
  ['1,0',{id:'1,0',position:{x:1,y:0},neighbors:['0,0','1,1']}],
  ['1,1',{id:'1,1',position:{x:1,y:1},neighbors:['1,0']}],
])};
const params={width:7,height:7,seed:42,g:.3,b:.1,tau:.4};
const attempt:PlayHistoryEntry={version:1,id:'result-1',mazeId:'maze-a',gameKey:'key',params,startedAt:0,updatedAt:2500,completedAt:2500,status:'completed',elapsedMs:2500,moves:2,revisits:0,hints:0,route:['0,0','1,0','1,1']};

test('manual offer and answer codes preserve signaling data',()=>{
  const signal={version:1 as const,kind:'offer' as const,roomId:'room-a',mazeId:'maze-a',maze:params,description:{type:'offer' as const,sdp:'v=0\r\na=ice:example'}};
  const encoded=encodeSignal(signal);
  expect(encoded).toMatch(/^z\./);
  expect(decodeSignal(encoded,'offer')).toEqual(signal);
  const legacy=Buffer.from(JSON.stringify(signal),'utf8').toString('base64url');
  expect(decodeSignal(legacy,'offer')).toEqual(signal);
  expect(()=>decodeSignal('not-a-code','offer')).toThrow(/valid InfiMaze offer/);
  expect(()=>decodeSignal(encodeSignal({...signal,kind:'answer',description:{type:'answer',sdp:'v=0'}}),'offer')).toThrow();
});

test('peer results are derived and their complete replay is validated',()=>{
  const result=resultFromAttempt(attempt,'  Ada  ');
  expect(result.player).toBe('Ada');
  expect(parseRoomResult(result,'maze-a',graph)).toEqual(result);
  expect(()=>parseRoomResult({...result,route:['0,0','1,1']},'maze-a',graph)).toThrow(/impossible move/);
  expect(()=>parseRoomResult({...result,moves:99},'maze-a',graph)).toThrow(/metrics/);
  expect(()=>resultFromAttempt({...attempt,hints:1},'Ada')).toThrow(/without hints/);
});

test('room standings deduplicate, rank, and export portable CSV',()=>{
  const slow=resultFromAttempt(attempt,'Ada'),fast:RoomResult={...slow,id:'result-2',player:'Grace',elapsedMs:1800};
  expect(mergeRoomResults([slow],[fast,slow]).map(result=>result.player)).toEqual(['Grace','Ada']);
  const csv=roomResultsCsv([fast,slow]);
  expect(csv).toContain('"rank","player","time_ms"');
  expect(csv).toContain('"Grace","1800"');
});

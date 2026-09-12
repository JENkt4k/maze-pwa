import { leaderboardMazes, rankAttempts } from '@src/app/leaderboard';
import type { PlayHistoryEntry } from '@src/app/history';

const params={width:7,height:7,seed:42,g:.3,b:.15,tau:.4,topology:'grid' as const,generator:'dfs' as const};
const entry=(id:string,mazeId:string,elapsedMs:number,moves:number,revisits=0,completedAt=1000):PlayHistoryEntry=>({version:1,id,mazeId,gameKey:`key-${mazeId}`,params,startedAt:0,updatedAt:completedAt,completedAt,status:'completed',elapsedMs,moves,revisits,route:['0,0','1,0']});

test('leaderboard ranks only completed attempts for one maze',()=>{
  const entries=[entry('slow','maze-a',9000,8),entry('fast','maze-a',5000,12),entry('efficient','maze-a',7000,7),{...entry('paused','maze-a',1000,1),status:'paused' as const},entry('other','maze-b',1000,1)];
  expect(rankAttempts(entries,'maze-a','time').map(item=>item.id)).toEqual(['fast','efficient','slow']);
  expect(rankAttempts(entries,'maze-a','moves').map(item=>item.id)).toEqual(['efficient','slow','fast']);
});

test('maze groups are ordered by most recent completion',()=>{
  const groups=leaderboardMazes([entry('a','maze-a',5000,5,0,1000),entry('b','maze-b',6000,6,0,2000)]);
  expect(groups.map(group=>group.mazeId)).toEqual(['maze-b','maze-a']);
  expect(groups[0].label).toBe('7×7 · seed 42');
});

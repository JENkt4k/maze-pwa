import type { PlayHistoryEntry } from '@src/app/history';
import { parseSharedLeaderboard, SharedLeaderboardClient, submissionFromAttempt } from '@src/app/sharedLeaderboard';

const attempt:PlayHistoryEntry={version:1,id:'local',mazeId:'maze-a',gameKey:'key',params:{width:7,height:7,seed:42,g:.3,b:.15,tau:.4,startIcon:'data:image/png;base64,secret',goalIcon:'🏁'},startedAt:1,updatedAt:3,completedAt:3,status:'completed',elapsedMs:2000,moves:9,revisits:1,route:['0,0','1,0']};

test('submission contains score and reproducible maze data without private play data',()=>{
  const submission=submissionFromAttempt(attempt,'  Player  ','submission');
  expect(submission).toMatchObject({version:1,submissionId:'submission',name:'Player',mazeId:'maze-a',elapsedMs:2000,moves:9,revisits:1});
  expect(submission.params).not.toHaveProperty('startIcon');
  expect(submission.params).not.toHaveProperty('goalIcon');
  expect(submission).not.toHaveProperty('route');
});

test('shared responses drop malformed entries and reject the wrong maze',()=>{
  const valid={id:'one',name:'Player',elapsedMs:2000,moves:9,revisits:1,submittedAt:10};
  expect(parseSharedLeaderboard({version:1,mazeId:'maze-a',entries:[valid,{...valid,id:'bad',elapsedMs:-1}]},'maze-a').entries).toEqual([valid]);
  expect(()=>parseSharedLeaderboard({version:1,mazeId:'other',entries:[]},'maze-a')).toThrow(/invalid response/);
});

test('client uses versioned endpoints and surfaces safe API errors',async()=>{
  const request=jest.fn().mockResolvedValue(new Response(JSON.stringify({version:1,mazeId:'maze-a',entries:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
  const client=new SharedLeaderboardClient('https://scores.example/api',request as unknown as typeof fetch);
  await client.list('maze-a','moves');
  expect(String(request.mock.calls[0][0])).toBe('https://scores.example/api/v1/leaderboards/maze-a?sort=moves&limit=50');
  request.mockResolvedValueOnce(new Response(JSON.stringify({error:'Try again later.'}),{status:429,headers:{'Content-Type':'application/json'}}));
  await expect(client.submit(submissionFromAttempt(attempt,'Player','two'))).rejects.toThrow('Try again later.');
});

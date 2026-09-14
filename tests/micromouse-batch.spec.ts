import { runMicromouseBatch } from '@src/app/micromouseBatch';
import { MOUSE_PROFILES } from '@src/maze/micromouseProfiles';

const params={width:7,height:7,seed:42,g:.3,b:0,tau:.4,generator:'dfs' as const,topology:'grid' as const};

test('batch benchmark aggregates every strategy across deterministic seeds',()=>{
  const progress:number[]=[],result=runMicromouseBatch(params,10,MOUSE_PROFILES.balanced.motion,value=>progress.push(value.completed));
  expect(result.completed).toBe(10);expect(result.total).toBe(10);
  expect(result.results.map(row=>row.strategy)).toEqual(['flood-fill','tremaux','right-wall']);
  expect(result.results.every(row=>row.runs===10&&row.completionRate>=0&&row.completionRate<=1)).toBe(true);
  expect(progress).toEqual([1,2,3,4,5,6,7,8,9,10]);
  expect(runMicromouseBatch(params,10,MOUSE_PROFILES.balanced.motion)).toEqual(result);
});

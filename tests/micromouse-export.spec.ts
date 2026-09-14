import { batchCsv, batchJson, comparisonCsv, comparisonJson } from '@src/app/micromouseExport';
import { runMicromouseBatch } from '@src/app/micromouseBatch';
import { createMaze } from '@src/app/maze';
import { mazeToGraph } from '@src/maze/graph';
import { compareMicromouseStrategies, DEFAULT_MOUSE_PHYSICS } from '@src/maze/micromouse';
import { MOUSE_PROFILES } from '@src/maze/micromouseProfiles';

const motion=MOUSE_PROFILES.balanced.motion;
const params={width:7,height:7,seed:42,g:.3,b:0,tau:.4,generator:'dfs' as const,topology:'grid' as const};

test('batch exports retain configuration and every seed-strategy run',()=>{
  const result=runMicromouseBatch(params,10,motion),csv=batchCsv(result),json=JSON.parse(batchJson(result));
  expect(result.runs).toHaveLength(30);
  expect(csv.split('\r\n')).toHaveLength(32);
  expect(csv).toContain('seed,width,height,format,generator,topology,robot_profile');
  expect(csv).toContain('42,7,7,custom,dfs,grid,balanced');
  expect(json).toMatchObject({version:1,type:'micromouse-batch',baseSeed:42,maze:{width:7,height:7,generator:'dfs'},robotProfile:'balanced'});
  expect(json.runs).toHaveLength(30);
});

test('same-maze strategy exports contain reproducible context and metrics',()=>{
  const rows=compareMicromouseStrategies(mazeToGraph(createMaze(params)),{...DEFAULT_MOUSE_PHYSICS,...motion});
  const context={seed:42,width:7,height:7,generator:'dfs' as const,topology:'grid' as const,format:'custom',motion};
  expect(comparisonCsv(rows,context).split('\r\n')).toHaveLength(5);
  const json=JSON.parse(comparisonJson(rows,context));
  expect(json.context).toMatchObject({seed:42,format:'custom',robotProfile:'balanced'});
  expect(json.results.map((row:{strategy:string})=>row.strategy)).toEqual(['flood-fill','tremaux','right-wall']);
});

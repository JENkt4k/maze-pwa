import { costRating, measure, roundedCost, totalMazeCost } from '@src/app/performance';
import { createMaze } from '@src/app/maze';
import { mazeFingerprint,mazeToGraph } from '@src/maze/graph';

test('pipeline measurements retain values and classify known budgets',()=>{
  expect(measure(()=>42).value).toBe(42);
  expect(roundedCost(1.26)).toBe(1.3);
  const metrics={cells:10201,generationMs:10,graphMs:10,difficultyMs:10,identityMs:10,solverMs:5,svgMs:5};
  expect(totalMazeCost(metrics)).toBe(50);
  expect(costRating(50)).toBe('Responsive');
  expect(costRating(50.1)).toBe('Moderate');
  expect(costRating(151)).toBe('Heavy');
});

test('streamed fingerprints remain compatible with saved maze identities',()=>{
  const graph=mazeToGraph(createMaze({width:41,height:41,seed:42,g:.3,b:.15,tau:.4}));
  const canonical=[...graph.nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(node=>`${node.id}@${node.position.x.toFixed(5)},${node.position.y.toFixed(5)}>${[...node.neighbors].sort().join(',')}`).join('|')+`#${graph.start}>${[...graph.goals].sort().join(',')}`;
  let hash=0x811c9dc5;for(let index=0;index<canonical.length;index++){hash^=canonical.charCodeAt(index);hash=Math.imul(hash,0x01000193);}
  expect(mazeFingerprint(graph)).toBe(`v1-${(hash>>>0).toString(16).padStart(8,'0')}`);
});

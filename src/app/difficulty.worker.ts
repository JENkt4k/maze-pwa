import { searchDifficultyV2, type DifficultySearchBudget, type DifficultySearchProgress } from './difficultySearch';
import type { MazeParams } from './maze';

self.onmessage = (event: MessageEvent<{params:MazeParams;budget:DifficultySearchBudget}>) => {
  try {
    const result=searchDifficultyV2(event.data.params,event.data.budget,(progress:DifficultySearchProgress)=>self.postMessage({type:'progress',progress}));
    self.postMessage({type:'complete',progress:result});
  }
  catch { self.postMessage({ error: 'Could not search difficulty settings. Please try again.' }); }
};

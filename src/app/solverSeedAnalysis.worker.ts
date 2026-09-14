/// <reference lib="webworker" />
import { analyzeSolverSeeds, type SolverSeedCount } from './solverSeedAnalysis';
import type { MazeParams } from './maze';

declare const self:DedicatedWorkerGlobalScope;
self.onmessage=(event:MessageEvent<{params:MazeParams;count:SolverSeedCount}>)=>{
  try{const result=analyzeSolverSeeds(event.data.params,event.data.count,progress=>self.postMessage({type:'progress',result:progress}));self.postMessage({type:'complete',result});}
  catch{self.postMessage({type:'error',error:'Could not complete solver seed analysis.'});}
};
export{};

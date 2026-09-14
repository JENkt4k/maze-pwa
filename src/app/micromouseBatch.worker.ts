import { runMicromouseBatch, type BatchSeedCount } from './micromouseBatch';
import type { MazeParams } from './maze';
import type { MouseMotion } from '../maze/micromouseProfiles';

self.onmessage=(event:MessageEvent<{params:MazeParams;count:BatchSeedCount;motion:MouseMotion}>)=>{
  try{const result=runMicromouseBatch(event.data.params,event.data.count,event.data.motion,progress=>self.postMessage({type:'progress',result:progress}));self.postMessage({type:'complete',result});}
  catch{self.postMessage({type:'error',error:'Could not complete the Micromouse benchmark.'});}
};

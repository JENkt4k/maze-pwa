import { runMicromouseBatch, type BatchSeedCount } from './micromouseBatch';
import type { MazeParams } from './maze';
import type { MouseMotion } from '../maze/micromouseProfiles';
import type { MouseRealism } from '../maze/micromouse';

self.onmessage=(event:MessageEvent<{params:MazeParams;count:BatchSeedCount;motion:MouseMotion;realism:MouseRealism}>)=>{
  try{const result=runMicromouseBatch(event.data.params,event.data.count,event.data.motion,progress=>self.postMessage({type:'progress',result:progress}),event.data.realism);self.postMessage({type:'complete',result});}
  catch{self.postMessage({type:'error',error:'Could not complete the Micromouse benchmark.'});}
};

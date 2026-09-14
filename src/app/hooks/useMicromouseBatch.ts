import { useEffect, useRef, useState } from 'react';
import type { MouseMotion } from '../../maze/micromouseProfiles';
import type { MazeParams } from '../maze';
import type { BatchSeedCount, MicromouseBatchResult } from '../micromouseBatch';
import type { MouseRealism } from '../../maze/micromouse';

export function useMicromouseBatch(params:MazeParams,motion:MouseMotion,realism:MouseRealism,initialCount:BatchSeedCount=10){
  const workerRef=useRef<Worker|null>(null),startedRef=useRef(0),[count,setCount]=useState<BatchSeedCount>(initialCount),[running,setRunning]=useState(false),[result,setResult]=useState<MicromouseBatchResult|null>(null),[error,setError]=useState<string|null>(null),[durationMs,setDurationMs]=useState<number|null>(null);
  useEffect(()=>()=>workerRef.current?.terminate(),[]);
  useEffect(()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setResult(null);setError(null);setDurationMs(null);},[params.width,params.height,params.seed,params.g,params.b,params.tau,params.generator,params.braidMode,params.topology,params.regionDensity,params.irregularity,params.mask,params.customMask,params.startCell,params.goalCell,motion.maxSpeedMps,motion.accelerationMps2,motion.turn90Ms,realism.sensorRangeCells,realism.sensorNoise,realism.correctionMs,realism.collisionMs,realism.diagonalSpeedRuns,realism.tractionLimitMps2]);
  const run=()=>{workerRef.current?.terminate();startedRef.current=performance.now();setRunning(true);setResult(null);setError(null);setDurationMs(null);try{const worker=new Worker(new URL('../micromouseBatch.worker.ts',import.meta.url),{type:'module'});workerRef.current=worker;const finish=()=>{worker.terminate();if(workerRef.current===worker)workerRef.current=null;setRunning(false);};worker.onmessage=(event:MessageEvent<{type:'progress'|'complete'|'error';result?:MicromouseBatchResult;error?:string}>)=>{if(workerRef.current!==worker)return;if(event.data.result)setResult(event.data.result);if(event.data.type==='complete'){setDurationMs(Math.round(performance.now()-startedRef.current));finish();}else if(event.data.type==='error'){finish();setError(event.data.error??'Could not complete the benchmark.');}};worker.onerror=()=>{finish();setError('Micromouse benchmark workers are unavailable.');};worker.postMessage({params,count,motion,realism});}catch{setRunning(false);setError('Micromouse benchmark workers are unavailable.');}};
  const cancel=()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);};
  return{count,setCount,running,result,error,durationMs,run,cancel};
}

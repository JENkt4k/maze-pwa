import { useEffect, useRef, useState } from 'react';
import type { MazeParams } from '../maze';
import type { SolverSeedCount, SolverSeedResult } from '../solverSeedAnalysis';

export function useSolverSeedAnalysis(params:MazeParams){
  const workerRef=useRef<Worker|null>(null),[count,setCount]=useState<SolverSeedCount>(10),[running,setRunning]=useState(false),[result,setResult]=useState<SolverSeedResult|null>(null),[error,setError]=useState<string|null>(null);
  useEffect(()=>()=>workerRef.current?.terminate(),[]);
  useEffect(()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setResult(null);setError(null);},[params.width,params.height,params.seed,params.g,params.b,params.tau,params.generator,params.braidMode,params.topology,params.regionDensity,params.irregularity,params.mask,params.customMask,params.startCell,params.goalCell]);
  const run=()=>{workerRef.current?.terminate();setRunning(true);setResult(null);setError(null);try{const worker=new Worker(new URL('../solverSeedAnalysis.worker.ts',import.meta.url),{type:'module'});workerRef.current=worker;const finish=()=>{worker.terminate();if(workerRef.current===worker)workerRef.current=null;setRunning(false);};worker.onmessage=(event:MessageEvent<{type:'progress'|'complete'|'error';result?:SolverSeedResult;error?:string}>)=>{if(workerRef.current!==worker)return;if(event.data.result)setResult(event.data.result);if(event.data.type==='complete')finish();else if(event.data.type==='error'){setError(event.data.error??'Could not complete solver seed analysis.');finish();}};worker.onerror=()=>{setError('Solver analysis workers are unavailable.');finish();};worker.postMessage({params,count});}catch{setRunning(false);setError('Solver analysis workers are unavailable.');}};
  const cancel=()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);};
  return{count,setCount,running,result,error,run,cancel};
}

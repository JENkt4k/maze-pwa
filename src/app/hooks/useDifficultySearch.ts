import { useEffect, useRef, useState } from 'react';
import type { MazeParams } from '../maze';
import type { DifficultySearchBudget, DifficultySearchProgress } from '../difficultySearch';

export function useDifficultySearch(params: MazeParams, apply: (params: MazeParams) => void) {
  const workerRef = useRef<Worker | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget,setBudget]=useState<DifficultySearchBudget>(250);
  const [progress,setProgress]=useState<DifficultySearchProgress|null>(null);
  const progressRef=useRef<DifficultySearchProgress|null>(null);
  const { width, height, seed, g, b, tau, generator, braidMode, topology, regionDensity, irregularity, mask, customMask, startCell, goalCell } = params;
  useEffect(() => {
    setSearching(false);
    setError(null);
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, [width,height,seed,g,b,tau,generator,braidMode,topology,regionDensity,irregularity,mask,customMask,startCell,goalCell]);

  function search() {
    workerRef.current?.terminate();
    setError(null);
    setSearching(true);
    setProgress(null);progressRef.current=null;
    try {
      const worker = new Worker(new URL('../difficulty.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      const finish = () => { worker.terminate(); workerRef.current = null; setSearching(false); };
      worker.onmessage = (event: MessageEvent<{type?:'progress'|'complete';progress?:DifficultySearchProgress;error?:string}>) => {
        if (workerRef.current !== worker) return;
        if(event.data.progress){setProgress(event.data.progress);progressRef.current=event.data.progress;}
        if(event.data.type==='complete'){finish();if(event.data.progress)apply(event.data.progress.bestParams);}
        else if(event.data.error){finish();setError(event.data.error);}
      };
      worker.onerror = () => { if (workerRef.current === worker) { finish(); setError('Could not search difficulty settings. Please try again.'); } };
      worker.postMessage({params,budget});
    } catch { workerRef.current = null; setSearching(false); setError('Difficulty search is unavailable in this browser.'); }
  }
  function cancel(){const best=progressRef.current;workerRef.current?.terminate();workerRef.current=null;setSearching(false);if(best)apply(best.bestParams);}
  return { search, cancel, searching, error, budget, setBudget, progress };
}

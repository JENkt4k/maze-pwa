import { useEffect, useRef, useState } from 'react';
import type { MazeParams } from '../maze';

export function useDifficultySearch(params: MazeParams, apply: (params: MazeParams) => void) {
  const workerRef = useRef<Worker | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width, height, seed, g, b, tau } = params;
  useEffect(() => {
    setSearching(false);
    setError(null);
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, [width, height, seed, g, b, tau]);

  function search() {
    workerRef.current?.terminate();
    setError(null);
    setSearching(true);
    try {
      const worker = new Worker(new URL('../difficulty.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      const finish = () => { worker.terminate(); workerRef.current = null; setSearching(false); };
      worker.onmessage = (event: MessageEvent<{ params?: MazeParams; error?: string }>) => {
        if (workerRef.current !== worker) return;
        finish();
        if (event.data.params) apply(event.data.params);
        else setError(event.data.error ?? 'Could not search difficulty settings.');
      };
      worker.onerror = () => { if (workerRef.current === worker) { finish(); setError('Could not search difficulty settings. Please try again.'); } };
      worker.postMessage(params);
    } catch { workerRef.current = null; setSearching(false); setError('Difficulty search is unavailable in this browser.'); }
  }
  return { search, searching, error };
}

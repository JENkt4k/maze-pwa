import { useEffect, useState } from 'react';

export type PlaybackState = Readonly<{
  index: number;
  playing: boolean;
  finished: boolean;
}>;

export function useSolverPlayback(eventCount: number, runKey: string, enabled: boolean, stepMs: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(enabled);
  const finished = index >= eventCount;

  useEffect(() => {
    setIndex(0);
    setPlaying(enabled);
  }, [runKey, enabled]);

  useEffect(() => {
    if (!enabled || !playing || finished) return;
    const timer = window.setTimeout(() => setIndex(current => Math.min(eventCount, current + 1)), Math.max(10, stepMs));
    return () => window.clearTimeout(timer);
  }, [enabled, playing, finished, index, eventCount, stepMs]);

  useEffect(() => { if (finished) setPlaying(false); }, [finished]);

  return {
    state: { index, playing, finished } satisfies PlaybackState,
    play: () => { if (finished) setIndex(0); setPlaying(true); },
    pause: () => setPlaying(false),
    restart: () => { setIndex(0); setPlaying(enabled); },
    step: () => { setPlaying(false); setIndex(current => Math.min(eventCount, current + 1)); },
    seek: (next: number) => { setPlaying(false); setIndex(Math.max(0, Math.min(eventCount, Math.trunc(next)))); },
  };
}

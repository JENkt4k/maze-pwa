import { findMaxDifficulty, type MazeParams } from './maze';

self.onmessage = (event: MessageEvent<MazeParams>) => {
  try { self.postMessage({ params: findMaxDifficulty(event.data) }); }
  catch { self.postMessage({ error: 'Could not search difficulty settings. Please try again.' }); }
};

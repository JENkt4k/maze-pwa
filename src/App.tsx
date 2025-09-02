import { useMemo, useState } from 'react';
import { createMaze, toSVG } from './maze';

export default function App() {
  const [seed, setSeed] = useState(42);
  const { svg, stats } = useMemo(() => {
    const { maze, stats } = createMaze({
      width: 19,
      height: 19,
      seed,
      g: 0.30,   // goal bias (easier ← higher)
      b: 0.15,   // braid factor
      tau: 0.40, // turn penalty (straighter)
    });
    const svg = toSVG(maze, { cell: 24, stroke: 3, margin: 16, showStartGoal: true });
    return { svg, stats };
  }, [seed]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Kid-Friendly Maze</h1>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <div style={{ marginTop: 12 }}>
        <strong>Stats:</strong>
        <pre>{JSON.stringify(stats, null, 2)}</pre>
      </div>
      <button onClick={() => setSeed(prev => prev + 1)}>New Maze</button>
    </div>
  );
}

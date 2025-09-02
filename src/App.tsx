import React, { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";   // ✅ keep this
import { createMaze, toSVG } from "./maze";


type SavedMaze = {
  id: string;                  // uuid-ish
  name: string;                // user label
  params: {
    width: number;
    height: number;
    seed: number;
    g: number;
    b: number;
    tau: number;
  };
  createdAt: number;           // ms epoch
};

const STORAGE_KEY = 'savedMazes:v1';

function loadSaved(): SavedMaze[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedMaze[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveAll(list: SavedMaze[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
    // PWA status via registerSW (no React hook)
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => void) | null>(null);
  // --- Parameters / state ---
  const [seed, setSeed] = useState(42);
  const [width, setWidth] = useState(19);
  const [height, setHeight] = useState(19);
  const [g, setG] = useState(0.30);
  const [b, setB] = useState(0.15);
  const [tau, setTau] = useState(0.40);

  const [saved, setSaved] = useState<SavedMaze[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');

  // load saved list once
  useEffect(() => { setSaved(loadSaved()); }, []);

  const { svg, stats, currentParams } = useMemo(() => {
    const params = { width, height, seed, g, b, tau };
    const { maze, stats } = createMaze(params);
    const svg = toSVG(maze, { cell: 24, stroke: 3, margin: 16, showStartGoal: true });
    return { svg, stats, currentParams: params };
  }, [width, height, seed, g, b, tau]);

  function newMaze() {
    setSeed(s => s + 1);
  }

  function handleSave() {
    const name = saveName.trim() || `Maze ${saved.length + 1}`;
    const entry: SavedMaze = {
      id: uid(),
      name,
      params: { ...currentParams },
      createdAt: Date.now(),
    };
    const next = [entry, ...saved];
    setSaved(next);
    saveAll(next);
    setSaveName('');
    setSelectedId(entry.id);
  }

  function handleLoad(id: string) {
    const item = saved.find(s => s.id === id);
    if (!item) return;
    const p = item.params;
    setWidth(p.width);
    setHeight(p.height);
    setSeed(p.seed);
    setG(p.g);
    setB(p.b);
    setTau(p.tau);
    setSelectedId(id);
  }

  function handleDelete(id: string) {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    saveAll(next);
    if (selectedId === id) setSelectedId(null);
  }

  function handlePrint() {
    // Build a full minimal HTML doc with ONLY the SVG
    const html = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <title>Maze Print</title>
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    .wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    /* Keep SVG inside margins on paper */
    svg { width: 95vw; height: auto; max-height: 95vh; }
    @page { margin: 10mm; }
    @media print { .wrap { padding: 0; } }
  </style>
  </head>
  <body>
    <div class="wrap">${svg}</div>
    <script>
      // Wait for layout to settle before printing
      window.addEventListener('load', () => {
        setTimeout(() => { window.print(); }, 0);
      });
      // Close after printing (optional)
      window.addEventListener('afterprint', () => { window.close(); });
    </script>
  </body>
  </html>`;

    // Use a Blob URL instead of document.write (more reliable)
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const win = window.open(url, '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!win) return; // popup blocked

    // Revoke the object URL once the print window has loaded it
    const cleanup = () => URL.revokeObjectURL(url);
    // Some browsers fire 'load' on the opened window, others only on its document
    win.addEventListener?.('load', cleanup);
    // Fallback cleanup after a few seconds
    setTimeout(cleanup, 10000);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      gap: 16,
      padding: 16,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      background: 'linear-gradient(180deg,#f6f7fb,#eef1f6)'
    }}>
      {/* Sidebar controls */}
      <aside style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Maze Controls</h2>

        <fieldset style={fs}>
          <legend style={lg}>Size</legend>
          <Label>
            Width: {width}
            <input type="range" min={7} max={41} step={2} value={width}
                   onChange={e => setWidth(parseInt(e.target.value))}/>
          </Label>
          <Label>
            Height: {height}
            <input type="range" min={7} max={41} step={2} value={height}
                   onChange={e => setHeight(parseInt(e.target.value))}/>
          </Label>
        </fieldset>

        <fieldset style={fs}>
          <legend style={lg}>Difficulty Knobs</legend>
          <Label>
            Goal bias g: {g.toFixed(2)}
            <input type="range" min={0} max={1} step={0.01} value={g}
                   onChange={e => setG(parseFloat(e.target.value))}/>
          </Label>
          <Label>
            Braid b: {b.toFixed(2)}
            <input type="range" min={0} max={0.5} step={0.01} value={b}
                   onChange={e => setB(parseFloat(e.target.value))}/>
          </Label>
          <Label>
            Turn penalty τ: {tau.toFixed(2)}
            <input type="range" min={0} max={1} step={0.01} value={tau}
                   onChange={e => setTau(parseFloat(e.target.value))}/>
          </Label>
        </fieldset>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button style={btn} onClick={newMaze}>New Maze</button>
          <button style={btn} onClick={handlePrint}>Print</button>
        </div>

        <fieldset style={fs}>
          <legend style={lg}>Save / Load</legend>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              placeholder="Name this maze…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              style={inp}
            />
            <button style={btnPrimary} onClick={handleSave}>Save current</button>
          </div>

          {saved.length > 0 ? (
            <div style={{ marginTop: 12, display: 'grid', gap: 6, maxHeight: 220, overflow: 'auto' }}>
              {saved.map(sv => (
                <div key={sv.id} style={{
                  border: '1px solid #e6e9ef',
                  borderRadius: 10,
                  padding: 8,
                  background: sv.id === selectedId ? '#f0f6ff' : '#fafbff',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{sv.name}</div>
                    <div style={{ fontSize: 12, color: '#586174' }}>
                      {sv.params.width}×{sv.params.height}, seed {sv.params.seed}, g {sv.params.g.toFixed(2)}, b {sv.params.b.toFixed(2)}, τ {sv.params.tau.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnSm} onClick={() => handleLoad(sv.id)}>Load</button>
                    <button style={btnDangerSm} onClick={() => handleDelete(sv.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#7a879b' }}>No saved mazes yet.</div>
          )}
        </fieldset>
      </aside>

      {/* Main canvas */}
      <main style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        padding: 16,
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        gap: 12
      }}>
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Kid-Friendly Maze</h1>
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            seed {seed}
          </div>
        </header>

        <section style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'start',
          gap: 16
        }}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{
            border: '1px solid #e6e9ef',
            borderRadius: 12,
            padding: 12,
            minWidth: 220,
            background: '#f9fbff'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Stats</div>
            <Stat label="Length L" value={stats.L} />
            <Stat label="Turn rate T" value={stats.T.toFixed(2)} />
            <Stat label="Junctions J" value={stats.J} />
            <Stat label="Dead ends E" value={stats.E} />
            <div style={{ height: 1, background: '#e6e9ef', margin: '8px 0' }} />
            <Stat label="Difficulty D" value={stats.D.toFixed(3)} strong />
          </div>
        </section>
      </main>
{(offlineReady || needRefresh) && (
  <div style={{
    position:'fixed', left:16, right:16, bottom:16, zIndex:50,
    background:'#111827', color:'#fff', borderRadius:12, padding:12,
    display:'flex', gap:8, alignItems:'center', justifyContent:'space-between',
    boxShadow:'0 12px 30px rgba(0,0,0,.25)'
  }}>
    <span>
      {offlineReady ? 'App is ready to work offline.' : 'A new version is available.'}
    </span>
    <div style={{display:'flex', gap:8}}>
      {needRefresh && (
        <button
          onClick={() => updateSWRef.current?.(true)}  // ✅ use ref
          style={{
            padding:'6px 10px',
            borderRadius:8,
            border:'none',
            background:'#34d399',
            color:'#111'
          }}
        >
          Update
        </button>
      )}
      <button
        onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}
        style={{
          padding:'6px 10px',
          borderRadius:8,
          border:'1px solid #374151',
          background:'transparent',
          color:'#fff'
        }}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  );
}

/* ------- tiny UI helpers (inline “design system”) ------- */

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#3c4557' }}>{children}</label>;
}
function Stat({ label, value, strong }: { label: string, value: string | number, strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}

const fs: React.CSSProperties = {
  border: '1px solid #e6e9ef',
  borderRadius: 12,
  padding: 12
};
const lg: React.CSSProperties = {
  fontSize: 12,
  color: '#3c4557',
  padding: '0 6px'
};
const btn: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid #d1d7e0',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 600
};
const btnPrimary: React.CSSProperties = {
  ...btn,
  background: 'linear-gradient(180deg,#4f9cff,#357cf6)',
  color: 'white',
  border: 'none'
};
const btnSm: React.CSSProperties = {
  ...btn,
  padding: '6px 8px',
  fontSize: 12
};
const btnDangerSm: React.CSSProperties = {
  ...btnSm,
  background: 'linear-gradient(180deg,#ff6b6b,#e35151)',
  color: '#fff',
  border: 'none'
};
const inp: React.CSSProperties = {
  border: '1px solid #d1d7e0',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 14
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { createMaze, toSVG } from "./maze";
import PWABanner from "./components/PWABanner";
import StatsCard from "./components/StatsCard";
import Sidebar from "./components/Sidebar";
import Fab from "./components/Fab";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useResizeObserver } from "./hooks/useResizeObserver";
import "../style.css";

type SavedMaze = {
  id: string;
  name: string;
  params: { width:number;height:number;seed:number;g:number;b:number;tau:number };
  createdAt: number;
};

const STORAGE_KEY = "savedMazes:v1";
const clamp = (n:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, n));
const loadSaved = ():SavedMaze[] => { try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const saveAll = (list:SavedMaze[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// put at module scope (top of App.tsx, outside the component)
let __printing = false;

function handlePrint(svg: string) {
  if (__printing) return;
  __printing = true;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Maze Print</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  .wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; }
  svg { width: 95vw; height: auto; max-height: 95vh; }
  @page { margin: 10mm; }
  @media print { .wrap { padding: 0; } }
</style>
</head>
<body>
  <div class="wrap">${svg}</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.referrerPolicy = "no-referrer";

  iframe.onload = () => {
    const iw = iframe.contentWindow;
    if (!iw) return;
    const done = () => {
      try { iframe.remove(); } catch {}
      __printing = false;
      iw.removeEventListener?.("afterprint", done as any);
    };
    iw.addEventListener?.("afterprint", done as any);

    try {
      iw.focus();
      iw.print();
    } catch {
      setTimeout(done, 1500);
    }
  };

  (iframe as any).srcdoc = html;
  document.body.appendChild(iframe);
}


export default function App() {
  /* PWA */
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => void) | null>(null);
  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });
    updateSWRef.current = updateSW;
  }, []);
  const { canInstall, install } = usePWAInstall();

  /* Maze params */
  const [seed, setSeed] = useState(42);
  const [width, setWidth] = useState(19);
  const [height, setHeight] = useState(19);
  const [g, setG] = useState(0.3);
  const [b, setB] = useState(0.15);
  const [tau, setTau] = useState(0.4);

  /* Saved mazes */
  const [saved, setSaved] = useState<SavedMaze[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [saveName, setSaveName] = useState("");
  useEffect(() => setSaved(loadSaved()), []);

  /* Responsive cell */
  const { ref: svgHostRef, rect: hostRect } = useResizeObserver<HTMLDivElement>();
  const [cell, setCell] = useState(24);
  useEffect(() => {
    const hostW = hostRect?.width ?? 0;
    const basis = hostW > 0 ? hostW : Math.min(window.innerWidth || 360, 480);
    const px = Math.floor((basis - 32) / width);
    setCell(clamp(px, 18, 36));
  }, [hostRect, width]);

  /* Maze render */
  const { svg, stats, currentParams } = useMemo(() => {
    const params = { width, height, seed, g, b, tau };
    const { maze, stats } = createMaze(params);
    const svg = toSVG(maze, {
      cell,
      stroke: Math.max(2, Math.round(cell/8)),
      margin: Math.round(cell/2),
      showStartGoal: true,
      startIcon: "🚀",
      goalIcon: "🏁",
      iconScale: 0.7,
    });
    return { svg, stats, currentParams: params };
  }, [width, height, seed, g, b, tau, cell]);

  /* Controls placement & state */
  const [isMobile, setIsMobile] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const apply = () => { setIsMobile(mq.matches); setControlsOpen(!mq.matches); };
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* Actions */
  const newMaze = () => setSeed(s => s+1);
  const handleSave = () => {
    const name = saveName.trim() || `Maze ${saved.length + 1}`;
    const entry: SavedMaze = { id: uid(), name, params: { ...currentParams }, createdAt: Date.now() };
    const next = [entry, ...saved];
    setSaved(next); saveAll(next);
    setSaveName(""); setSelectedId(entry.id);
  };
  const handleLoad = (id:string) => {
    const item = saved.find(s => s.id === id); if (!item) return;
    const p = item.params;
    setWidth(p.width); setHeight(p.height); setSeed(p.seed); setG(p.g); setB(p.b); setTau(p.tau);
    setSelectedId(id);
  };
  const handleDelete = (id:string) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next); saveAll(next);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="shell">
      {/* MAIN */}
      <main className="panel main">
        <header className="sticky-top hstack" style={{ justifyContent:"space-between" }}>
          <div className="hstack" style={{ alignItems:"baseline", gap:12 }}>
            <h1 style={{ margin:0, fontSize:22 }}>Kid-Friendly Maze</h1>
            <div style={{ color:"#6b7280", fontSize:12 }}>seed {seed}</div>
          </div>

          <button
            className="btn"
            style={{ padding:"8px 12px" }}
            aria-expanded={controlsOpen}
            aria-controls="controls-panel"
            onClick={() => setControlsOpen(v => !v)}
            title="Show/Hide Controls"
          >
            {controlsOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </header>

        {/* Stack: Maze first, Stats below */}
        <section className="stack">
          <div
            ref={svgHostRef as any}
            id="print-maze-only"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <StatsCard stats={stats}/>
        </section>
      </main>


      {/* CONTROLS */}
      <Sidebar
        canInstall={canInstall} onInstall={install}
        width={width} height={height} g={g} b={b} tau={tau}
        setWidth={setWidth} setHeight={setHeight} setG={setG} setB={setB} setTau={setTau}
        onNew={newMaze} onPrint={() => handlePrint(svg)}
        saveName={saveName} setSaveName={setSaveName}
        saved={saved} selectedId={selectedId}
        onSave={handleSave} onLoad={handleLoad} onDelete={handleDelete}
        isMobile={isMobile}
        controlsOpen={controlsOpen}
        onMinimize={() => setControlsOpen(false)}   // ← minimize button handler
      />

      {/* Mobile FABs: show gear when controls are minimized */}
      <Fab
        showInstall={canInstall}
        onNew={newMaze}
        onPrint={() => handlePrint(svg)}
        onInstall={install}
        showGear={isMobile && !controlsOpen}
        onGear={() => setControlsOpen(true)}
      />

      <PWABanner
        offlineReady={offlineReady}
        needRefresh={needRefresh}
        onUpdate={() => updateSWRef.current?.(true)}
        onClose={() => { setNeedRefresh(false); setOfflineReady(false); }}
      />
    </div>
  );
}

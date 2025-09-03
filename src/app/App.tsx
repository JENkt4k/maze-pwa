import { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { createMaze, toSVG } from "./maze";
import PWABanner from "./components/PWABanner";
import StatsCard from "./components/StatsCard";
import Sidebar from "./components/Sidebar";
import Fab from "./components/Fab";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useResizeObserver } from "./hooks/useResizeObserver";
import "../style.css";
import DrawingCanvas from "./components/DrawingCanvas";


const SETTINGS_KEY = "maze:settings:v1";

type Settings = {
  seed: number;
  width: number;
  height: number;
  g: number;
  b: number;
  tau: number;
  controlsOpen: boolean;
  lockSize: boolean;
  animateDFS: boolean;            // show classic carve animation
  dfsSegMs: number;               // ms per segment
};


function loadSettings(): Partial<Settings> | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

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

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}
function isStandalonePWA() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}


function handlePrint(svg: string) {
  if (__printing) return;
  __printing = true;

  if (isIOS() || isStandalonePWA()) {
    // iOS / standalone PWA: print the current page with print CSS
    requestAnimationFrame(() => {
      window.print();
      // let afterprint reset the guard if supported
      const done = () => { __printing = false; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      // fallback reset
      setTimeout(done, 1500);
    });
    return;
  }

  // Desktop / normal Chrome path: print isolated SVG in a hidden iframe
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Maze Print</title>
<style>
  html,body{margin:0;padding:0;background:#fff}
  .wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
  svg{width:95vw;height:auto;max-height:95vh}
  @page{margin:10mm}
  @media print{.wrap{padding:0}}
</style>
</head><body><div class="wrap">${svg}</div></body></html>`;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position:"fixed", right:"0", bottom:"0", width:"0", height:"0", border:"0" });
  iframe.referrerPolicy = "no-referrer";
  iframe.onload = () => {
    const iw = iframe.contentWindow;
    if (!iw) { iframe.remove(); __printing = false; return; }
    const done = () => { try { iframe.remove(); } catch {} __printing = false; iw.removeEventListener?.("afterprint", done as any); };
    iw.addEventListener?.("afterprint", done as any);
    try {
      iw.focus();
      iw.requestAnimationFrame?.(() => iw.print());
      setTimeout(() => iw.print(), 50);
    } catch { setTimeout(done, 1500); }
  };
  (iframe as any).srcdoc = html;
  document.body.appendChild(iframe);
}

// Replace your stepsOverlaySVG with this one-path version.
function stepsOverlaySVG(
  steps: { x:number; y:number; nx:number; ny:number }[],
  opts: { cell:number; margin:number; stroke:number; segMs:number; w:number; h:number }
) {
  const { cell, margin, stroke, segMs, w, h } = opts;
  const px = (c: number) => margin + c * cell + cell / 2;
  const passageWidth = cell/2 - (2 * stroke);


  // overall SVG box matches the main SVG
  const widthPx  = w * cell + margin * 2;
  const heightPx = h * cell + margin * 2;

  // Each step becomes one short line from (x,y) center to (nx,ny) center.
  // We give each an animation delay = index * segMs.
  const segDur = Math.max(10, segMs); // guard
  let out = `<svg xmlns="http://www.w3.org/2000/svg" class="dfs-anim" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`;
  out += `<g style="--seg-dur:${Math.max(0.03, segDur/1000)}s">`;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const x1 = px(s.x), y1 = px(s.y);
    const x2 = px(s.nx), y2 = px(s.ny);
    const delay = (i * segDur) / 1000; // seconds
    out += `<path d="M ${x1} ${y1} L ${x2} ${y2}" 
      stroke="#3b82f6" 
      stroke-width="${passageWidth}" 
      fill="none" pathLength="1" style="animation-delay:${delay}s"/>`;
  }

  out += `</g></svg>`;
  return out;
}




export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
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

  // Start/Goal markers (emoji string OR data URL from image)
  const [startIcon, setStartIcon] = useState<string | null>("🚀");
  const [goalIcon, setGoalIcon]   = useState<string | null>("🏁");

  // state
  const [animating, setAnimating] = useState(false);
  const stepsCountRef = useRef(0);

  /* Maze params */
  // const [seed, setSeed] = useState(42);
  // const [width, setWidth] = useState(19);
  // const [height, setHeight] = useState(19);
  // const [g, setG] = useState(0.3);
  // const [b, setB] = useState(0.15);
  // const [tau, setTau] = useState(0.4);
    /* Maze params (with persisted defaults) */
  const persisted = loadSettings();

  const [seed, setSeed]     = useState(persisted?.seed   ?? 42);
  const [width, setWidth_]  = useState(persisted?.width  ?? 19);
  const [height, setHeight_] = useState(persisted?.height ?? 19);
  const [g, setG]           = useState(persisted?.g      ?? 0.3);
  const [b, setB]           = useState(persisted?.b      ?? 0.15);
  const [tau, setTau]       = useState(persisted?.tau    ?? 0.4);

  const [animateDFS, setAnimateDFS] = useState(persisted?.animateDFS ?? false);
  const [dfsSegMs, setDfsSegMs]     = useState(persisted?.dfsSegMs ?? 35);
  
  type Phase = "idle" | "animating" | "linger";

  const [phase, setPhase] = useState<Phase>("idle");
  const [lingerMs, setLingerMs] = useState(2000); // adjust as you like (or expose in Sidebar)


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
  const { svg, stats, currentParams, overlay, stepsCount } = useMemo(() => {
    const params = { width, height, seed, g, b, tau };
    const { maze, stats, steps } = createMaze(params);
    const stroke = Math.max(2, Math.round(cell/8));

    const base = toSVG(maze, {
      cell, stroke, margin: Math.round(cell/2),
      showStartGoal: true,
      startIcon: startIcon ?? undefined,
      goalIcon: goalIcon ?? undefined,
      iconScale: 0.7
    });

    const ov = animateDFS
      ? stepsOverlaySVG(steps, {
          cell,
          margin: Math.round(cell/2),
          stroke,
          segMs: dfsSegMs,
          w: width,
          h: height
        })
      : "";

    return { svg: base, stats, currentParams: params, overlay: ov, stepsCount: steps?.length ?? 0 };
  }, [width, height, seed, g, b, tau, cell, startIcon, goalIcon, animateDFS, dfsSegMs]);

  // drive the animating flag
  useEffect(() => {
    if (!animateDFS || stepsCount === 0) {
      setPhase("idle");
      return;
    }
    // Phase 1: animate
    setPhase("animating");

    const totalMs = stepsCount * dfsSegMs + 150; // draw duration (+ tiny buffer)

    // switch to linger (overlay + SVG)
    const t1 = setTimeout(() => setPhase("linger"), totalMs + lingerMs);

    // switch to idle (SVG only)
    const t2 = setTimeout(() => setPhase("idle"), totalMs + 2 * lingerMs);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animateDFS, stepsCount, dfsSegMs, lingerMs]);



  /* Controls placement & state */
  const [isMobile, setIsMobile]   = useState(false);
  const [controlsOpen, setControlsOpen] = useState(
    persisted?.controlsOpen ?? true
  );

  /* Keep width/height locked together (square) if enabled */
  const [lockSize, setLockSize] = useState(persisted?.lockSize ?? false);

  const setWidth = (w: number) => {
    const even = w % 2 === 1 ? w : w + 1;            // keep odd if your maze expects odd
    setWidth_(even);
    if (lockSize) setHeight_(even);
  };
  const setHeight = (h: number) => {
    const even = h % 2 === 1 ? h : h + 1;
    setHeight_(even);
    if (lockSize) setWidth_(even);
  };

  useEffect(() => {
    const s: Settings = {
      seed, width, height, g, b, tau,
      controlsOpen,
      lockSize,
      animateDFS,
      dfsSegMs,
    };
    saveSettings(s);
  }, [seed, width, height, g, b, tau, controlsOpen, lockSize, animateDFS, dfsSegMs]);

  // Heuristic sweep to maximize stats.D over (g, b, tau) for current size & seed
  const findMaxDifficulty = () => {
    // coarse grid keeps it fast in-browser; tweak steps if you want
    const gVals   = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const bVals   = [0.00, 0.10, 0.20, 0.30, 0.40, 0.50];
    const tauVals = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

    let best: { g:number;b:number;tau:number; D:number } | null = null;

    for (const gg of gVals) {
      for (const bb of bVals) {
        for (const tt of tauVals) {
          const { stats } = createMaze({ width, height, seed, g: gg, b: bb, tau: tt });
          const D = Number(stats?.D ?? 0);
          if (!best || D > best.D) {
            best = { g: gg, b: bb, tau: tt, D };
          }
        }
      }
    }
    if (best) {
      setG(best.g); setB(best.b); setTau(best.tau);
      // Optionally bump seed to re-generate with new params:
      setSeed((s) => s + 1);
    }
  };

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
          {/* <div
            ref={svgHostRef as any}
            id="print-maze-only"
            dangerouslySetInnerHTML={{ __html: svg }}
          /> */}
          {/* Maze and drawing overlay */}
          <div className="draw-wrap">
            <div ref={hostRef} className="maze-host">
              {/* Base maze SVG */}
              <div
                id="print-maze-only"
                style={{ opacity: phase === "animating" ? 0 : 1, transition: "opacity .2s" }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />

              {/* DFS overlay */}
              {(phase === "animating" || phase === "linger") && overlay && (
                <div
                  className="maze-overlay"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: overlay }}
                />
              )}

              {/* ⬇️ Drawing canvas MUST be inside .maze-host */}
              <DrawingCanvas hostRef={hostRef} />
            </div>
          </div>
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
        lockSize={lockSize}                         // ← NEW
        setLockSize={setLockSize}                   // ← NEW
        onMaxDifficulty={findMaxDifficulty}         // ← NEW
        startIcon={startIcon}
        goalIcon={goalIcon}
        setStartIcon={setStartIcon}
        setGoalIcon={setGoalIcon}
        animateDFS={animateDFS}
        setAnimateDFS={setAnimateDFS}
        dfsSegMs={dfsSegMs}
        setDfsSegMs={setDfsSegMs}
      />

      {/* Mobile FABs: show gear when controls are minimized */}
      <Fab
        visible={true}                                 // ← always render when you intend to show
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

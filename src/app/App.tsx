// src/app/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import PWABanner from "./components/PWABanner";
import StatsCard from "./components/StatsCard";
import Sidebar from "./components/Sidebar";
import Fab from "./components/Fab";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useResizeObserver } from "./hooks/useResizeObserver";
import "../style.css";
import DrawingCanvas from "./components/DrawingCanvas";
import MazeView from "./components/MazeView";
import { createMaze } from "./maze"; // still used by max-difficulty sweep

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
  if (__printing) return; __printing = true;
  if (isIOS() || isStandalonePWA()) {
    requestAnimationFrame(() => {
      window.print();
      const done = () => { __printing = false; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done); setTimeout(done, 1500);
    }); return;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Maze Print</title>
<style>html,body{margin:0} .wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
svg{width:95vw;height:auto;max-height:95vh} @page{margin:10mm} @media print{.wrap{padding:0}}</style></head>
<body><div class="wrap">${svg}</div></body></html>`;
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position:"fixed", right:"0", bottom:"0", width:"0", height:"0", border:"0" });
  iframe.referrerPolicy = "no-referrer";
  iframe.onload = () => {
    const iw = iframe.contentWindow; if (!iw) { iframe.remove(); __printing=false; return; }
    const done = () => { try{iframe.remove();}catch{} __printing=false; iw.removeEventListener?.("afterprint", done as any); };
    iw.addEventListener?.("afterprint", done as any);
    try { iw.focus(); iw.requestAnimationFrame?.(()=> iw.print()); setTimeout(()=> iw.print(), 50); } catch { setTimeout(done,1500); }
  };
  (iframe as any).srcdoc = html; document.body.appendChild(iframe);
}

const toOdd = (n:number) => (n % 2 ? n : n + 1);
const clamp01 = (x:number) => Math.max(0, Math.min(1, x));
const clampB  = (x:number) => Math.max(0, Math.min(0.5, x));


function parseFromURL() {
  const q = new URLSearchParams(window.location.search);

  const getNum = (k: string): number | undefined => {
    if (!q.has(k)) return undefined;                  // key not present
    const raw = q.get(k);
    if (raw == null) return undefined;
    if (raw.trim() === "") return undefined;          // present but empty (?k=)
    const v = Number(raw);
    return Number.isFinite(v) ? v : undefined;        // ignore NaN / Infinity
  };

  const parseI = (
    k: string, lo: number, hi: number, makeOdd = false
  ): number | undefined => {
    const v = getNum(k);
    if (v === undefined) return undefined;
    const vv = Math.max(lo, Math.min(hi, Math.trunc(v)));
    return makeOdd ? toOdd(vv) : vv;
  };

  const parseF = (
    k: string, clampFn: (x:number)=>number
  ): number | undefined => {
    const v = getNum(k);
    if (v === undefined) return undefined;
    return clampFn(v);
  };

  const getEmoji = (k: string): string | null | undefined => {
    if (!q.has(k)) return undefined;                  // don’t override if absent
    const raw = q.get(k) ?? "";
    const s = raw.trim();
    return s === "" ? null : decodeURIComponent(s);   // explicit empty clears
  };

  return {
    width:     parseI("w",   7, 41, true),
    height:    parseI("h",   7, 41, true),
    seed:      parseI("seed",-2147483648, 2147483647, false),
    g:         parseF("g",   clamp01),
    b:         parseF("b",   clampB),
    tau:       parseF("tau", clamp01),
    startIcon: getEmoji("start"),
    goalIcon:  getEmoji("goal"),
  };
}

function buildShareURL(p:{
  width:number;height:number;seed:number;g:number;b:number;tau:number;
  startIcon:string|null; goalIcon:string|null;
}) {
  const u = new URL(window.location.href);
  const q = u.searchParams;
  q.set("w", String(p.width));
  q.set("h", String(p.height));
  q.set("seed", String(p.seed));
  q.set("g", p.g.toFixed(2));
  q.set("b", p.b.toFixed(2));
  q.set("tau", p.tau.toFixed(2));
  // only include emoji markers (skip large data URLs)
  if (p.startIcon && p.startIcon.length <= 4) q.set("start", encodeURIComponent(p.startIcon)); else q.delete("start");
  if (p.goalIcon  && p.goalIcon.length  <= 4) q.set("goal",  encodeURIComponent(p.goalIcon));  else q.delete("goal");
  u.search = q.toString();
  return u.toString();
}


export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  /* PWA */
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => void) | null>(null);
  useEffect(() => {
    const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setNeedRefresh(true), onOfflineReady: () => setOfflineReady(true) });
    updateSWRef.current = updateSW;
  }, []);
  const { canInstall, install } = usePWAInstall();

  /* Load from URL if present (overrides some settings) */
  const fromURL = parseFromURL();


  /* Persisted params */
  const persisted = (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); } catch { return null; } })();

  const [seed, setSeed]        = useState(fromURL.seed   ?? persisted?.seed   ?? 42);
  const [width, setWidthRaw]   = useState(fromURL.width  ?? persisted?.width  ?? 19);
  const [height, setHeightRaw] = useState(fromURL.height ?? persisted?.height ?? 19);
  const [g, setG]              = useState(fromURL.g      ?? persisted?.g      ?? 0.3);
  const [b, setB]              = useState(fromURL.b      ?? persisted?.b      ?? 0.15);
  const [tau, setTau]          = useState(fromURL.tau    ?? persisted?.tau    ?? 0.4);
  const [controlsOpen, setControlsOpen] = useState(persisted?.controlsOpen ?? true);
  const [lockSize, setLockSize]         = useState(persisted?.lockSize ?? false);

  // Markers/emoji:
  const [startIcon, setStartIcon] = useState<string | null>(fromURL.startIcon ?? persisted?.startIcon ?? "🚀");
  const [goalIcon,  setGoalIcon]  = useState<string | null>(fromURL.goalIcon  ?? persisted?.goalIcon  ?? "🏁");

  // saved mazes UI state and handlers
  const [saveName, setSaveName] = useState<string>("");
  const [saved, setSaved] = useState<SavedMaze[]>(() => loadSaved());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = () => {
    const name = saveName.trim() || `Maze ${saved.length + 1}`;
    const params = { width, height, seed, g, b, tau };
    const id = uid();
    const newMaze: SavedMaze = { id, name, params, createdAt: Date.now() };
    const updated = [...saved, newMaze];
    setSaved(updated);
    saveAll(updated);
    setSelectedId(id);
  };

  const handleLoad = (id: string) => {
    const maze = saved.find(m => m.id === id);
    if (!maze) return;
    setWidth(maze.params.width);
    setHeight(maze.params.height);
    setSeed(maze.params.seed);
    setG(maze.params.g);
    setB(maze.params.b);
    setTau(maze.params.tau);
    setSelectedId(id);
  };

  const handleDelete = (id: string) => {
    const updated = saved.filter(m => m.id !== id);
    setSaved(updated);
    saveAll(updated);
    if (selectedId === id) setSelectedId(null);
  };

  const handleShare = async () => {
    const url = buildShareURL({ width, height, seed, g, b, tau, startIcon, goalIcon });
    try {
      // Native share on mobile; clipboard elsewhere
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Maze", text: "Check out this maze!", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Share link copied to clipboard!");
      }
    } catch {
      // rock-bottom fallback
      prompt("Copy this link:", url);
    }
  };

  /* Responsive cell */
  const { ref: svgHostRef, rect: hostRect } = useResizeObserver<HTMLDivElement>();
  const [cell, setCell] = useState(24);
  useEffect(() => {
    const hostW = hostRect?.width ?? 0;
    const basis = hostW > 0 ? hostW : Math.min(window.innerWidth || 360, 480);
    const px = Math.floor((basis - 32) / width);
    const clamp = (n:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, n));
    setCell(clamp(px, 18, 36));
  }, [hostRect, width]);

  // keep odd dims if needed and lock together
  const setWidth  = (w:number) => { const odd = w%2? w : w+1; setWidthRaw(odd); if (lockSize) setHeightRaw(odd); };
  const setHeight = (h:number) => { const odd = h%2? h : h+1; setHeightRaw(odd); if (lockSize) setWidthRaw(odd); };

  // persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ seed,width,height,g,b,tau,controlsOpen,lockSize }));
    } catch {}
  }, [seed,width,height,g,b,tau,controlsOpen,lockSize]);

  // compute margin/stroke once from cell
  const margin = Math.round(cell/2);
  const stroke = Math.max(2, Math.round(cell/8));

  // animation prefs
  const [animateDFS, setAnimateDFS] = useState(true);
  const [dfsSegMs, setDfsSegMs]     = useState(35);
  const [lingerMs, setLingerMs]     = useState(2000);
  const [hideWallsDuringAnim, setHideWallsDuringAnim] = useState(true);

  // print: keep the latest svg string from MazeView
  const [currentSVG, setCurrentSVG] = useState<string>("");

  // stats from MazeView
  const [stats, setStats] = useState<any>({ L:0,T:0,J:0,E:0,D:0 });

  // mobile / controls open behavior (same as your baseline)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const apply = () => { setIsMobile(mq.matches); setControlsOpen(!mq.matches); };
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // actions (new maze, save/load, delete) — same as your baseline
  // … keep your existing handlers here (omitted for brevity) …

  // quick max-difficulty sweep (uses createMaze; unchanged from your baseline)
  const findMaxDifficulty = () => {
    const gVals = [0.0,0.2,0.4,0.6,0.8,1.0];
    const bVals = [0.00,0.10,0.20,0.30,0.40,0.50];
    const tVals = [0.0,0.2,0.4,0.6,0.8,1.0];
    let best: { g:number;b:number;tau:number; D:number } | null = null;
    for (const gg of gVals) for (const bb of bVals) for (const tt of tVals) {
      const { stats } = createMaze({ width, height, seed, g:gg, b:bb, tau:tt });
      const D = Number(stats?.D ?? 0);
      if (!best || D > best.D) best = { g:gg, b:bb, tau:tt, D };
    }
    if (best) {
      setG(best.g); setB(best.b); setTau(best.tau); setSeed((s: number) => s + 1);
    }
  };

  interface NewMazeFn {
    (): void;
  }
  const newMaze: NewMazeFn = () => setSeed((s: number) => s + 1);

  return (
    <div className="shell">
      <main className="panel main">
        <header className="sticky-top hstack" style={{ justifyContent:"space-between" }}>
          <div className="hstack" style={{ alignItems:"baseline", gap:12 }}>
            <h1 style={{ margin:0, fontSize:22 }}>Kid-Friendly Maze</h1>
            <div style={{ color:"#6b7280", fontSize:12 }}>seed {seed}</div>
          </div>
          <button className="btn" style={{ padding:"8px 12px" }}
            aria-expanded={controlsOpen} aria-controls="controls-panel"
            onClick={() => setControlsOpen(v=>!v)} title="Show/Hide Controls">
            {controlsOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </header>

        <section className="stack">
          {/* Maze + drawing; MazeView owns animation & emits svg/stats */}
          <div className="draw-wrap">
            <MazeView
              hostRef={svgHostRef}
              params={{ width, height, seed, g, b, tau }}
              render={{ cell, margin, stroke, startIcon, goalIcon, iconScale: 0.7 }}
              animation={{ enabled: animateDFS, segMs: dfsSegMs, lingerMs, hideWallsDuringAnim }}
              onStats={setStats}
              onSVGChange={setCurrentSVG}
            />
            <DrawingCanvas hostRef={svgHostRef} />
          </div>

          <StatsCard stats={stats} />
        </section>
      </main>

      <Sidebar
        /* Install */
        canInstall={canInstall}
        onInstall={install}

        /* Size & difficulty */
        width={width} height={height} g={g} b={b} tau={tau}
        setWidth={setWidth} setHeight={setHeight} setG={setG} setB={setB} setTau={setTau}

        /* Actions */
        onNew={newMaze}
        onPrint={() => handlePrint(currentSVG)}
        onMaxDifficulty={findMaxDifficulty}

        /* Save/Load */
        saveName={saveName}
        setSaveName={setSaveName}
        saved={saved}
        selectedId={selectedId}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={handleDelete}

        /* UI state */
        isMobile={isMobile}
        controlsOpen={controlsOpen}
        onMinimize={() => setControlsOpen(false)}
        lockSize={lockSize}
        setLockSize={setLockSize}

        /* Markers */
        startIcon={startIcon}
        goalIcon={goalIcon}
        setStartIcon={setStartIcon}
        setGoalIcon={setGoalIcon}

        /* Animation (if Sidebar shows these controls) */
        animateDFS={animateDFS}
        setAnimateDFS={setAnimateDFS}
        dfsSegMs={dfsSegMs}
        setDfsSegMs={setDfsSegMs}
        lingerMs={lingerMs}
        setLingerMs={setLingerMs}
        hideWallsDuringAnim={hideWallsDuringAnim}
        setHideWallsDuringAnim={setHideWallsDuringAnim}

        /* Share */
        onShare={handleShare}
      />


      <Fab
        visible={true}
        showInstall={canInstall}
        onNew={newMaze}
        onPrint={() => handlePrint(currentSVG)}
        onInstall={install}
        showGear={isMobile && !controlsOpen}
        onGear={() => setControlsOpen(true)}
      />

      <PWABanner
        offlineReady={offlineReady} needRefresh={needRefresh}
        onUpdate={() => updateSWRef.current?.(true)}
        onClose={() => { setNeedRefresh(false); setOfflineReady(false); }}
      />
    </div>
  );
}

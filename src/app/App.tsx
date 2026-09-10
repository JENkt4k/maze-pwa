// src/app/App.tsx
import { useEffect, useRef, useState } from "react";
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

import { buildShareURL, parseFromURL, parseSettings, parseSaved, SETTINGS_KEY, STORAGE_KEY, type SavedMaze } from "./state";
import { handlePrint } from "./print";
import { type Stats } from "./maze";
import { useDifficultySearch } from "./hooks/useDifficultySearch";

const DEFAULT_START = "\u{1f680}";
const DEFAULT_GOAL = "\u{1f3c1}";

export default function App() {
  /* PWA */
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => void) | null>(null);
  useEffect(() => {
    if (updateSWRef.current) return;
    const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setNeedRefresh(true), onOfflineReady: () => setOfflineReady(true) });
    updateSWRef.current = updateSW;
  }, []);
  const { canInstall, install } = usePWAInstall();

  /* Load from URL if present (overrides some settings) */
  const [fromURL] = useState(() => parseFromURL(window.location.search));

  /* Persisted params */
  const [storageError, setStorageError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [persisted] = useState(() => { try { return parseSettings(localStorage.getItem(SETTINGS_KEY)); } catch { return {}; } });

  const [seed, setSeed]        = useState(fromURL.seed   ?? persisted?.seed   ?? 42);
  const [width, setWidthRaw]   = useState(fromURL.width  ?? persisted?.width  ?? 19);
  const [height, setHeightRaw] = useState(fromURL.height ?? persisted?.height ?? 19);
  const [g, setG]              = useState(fromURL.g      ?? persisted?.g      ?? 0.3);
  const [b, setB]              = useState(fromURL.b      ?? persisted?.b      ?? 0.15);
  const [tau, setTau]          = useState(fromURL.tau    ?? persisted?.tau    ?? 0.4);
  const [controlsOpen, setControlsOpen] = useState(persisted.controlsOpen ?? !window.matchMedia("(max-width: 840px)").matches);
  const [lockSize, setLockSize]         = useState((persisted.lockSize ?? false) && width === height);

  // Markers/emoji:
  const [startIcon, setStartIcon] = useState<string | null>(fromURL.startIcon !== undefined ? fromURL.startIcon : persisted.startIcon !== undefined ? persisted.startIcon : DEFAULT_START);
  const [goalIcon, setGoalIcon] = useState<string | null>(fromURL.goalIcon !== undefined ? fromURL.goalIcon : persisted.goalIcon !== undefined ? persisted.goalIcon : DEFAULT_GOAL);

  // saved mazes UI state and handlers
  const [saveName, setSaveName] = useState<string>("");
  const [saved, setSaved] = useState<SavedMaze[]>(() => { try { return parseSaved(localStorage.getItem(STORAGE_KEY)); } catch { return []; } });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = () => {
    const name = saveName.trim().slice(0, 200) || `Maze ${saved.length + 1}`;
    const params = { width, height, seed, g, b, tau, startIcon, goalIcon };
    const id = crypto.randomUUID();
    const newMaze: SavedMaze = { id, name, params, createdAt: Date.now() };
    const updated = [...saved, newMaze];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { setStorageError("Could not update saved mazes. Browser storage may be full or unavailable."); return; }
    setStorageError(null);
    setSaved(updated);
    setSelectedId(id);
  };

  const handleLoad = (id: string) => {
    const maze = saved.find(m => m.id === id);
    if (!maze) return;
    setWidthRaw(maze.params.width);
    setHeightRaw(maze.params.height);
    if (maze.params.width !== maze.params.height) setLockSize(false);
    setStartIcon(maze.params.startIcon === undefined ? DEFAULT_START : maze.params.startIcon);
    setGoalIcon(maze.params.goalIcon === undefined ? DEFAULT_GOAL : maze.params.goalIcon);
    setSeed(maze.params.seed);
    setG(maze.params.g);
    setB(maze.params.b);
    setTau(maze.params.tau);
    setSelectedId(id);
  };

  const handleDelete = (id: string) => {
    const updated = saved.filter(m => m.id !== id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { setStorageError("Could not update saved mazes. Browser storage may be full or unavailable."); return; }
    setStorageError(null);
    setSaved(updated);
    if (selectedId === id) setSelectedId(null);
  };

  const handleShare = async () => {
    const url = buildShareURL(window.location.href, { width, height, seed, g, b, tau, startIcon, goalIcon });
    try {
      // Native share on mobile; clipboard elsewhere
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Maze", text: "Check out this maze!", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Share link copied to clipboard!");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Fallback when clipboard or native sharing is unavailable.
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

  // animation prefs
  const [animateDFS, setAnimateDFS] = useState(persisted?.animateDFS ?? true);
  const [dfsSegMs, setDfsSegMs]     = useState(persisted?.dfsSegMs ?? 35);
  const [lingerMs, setLingerMs]     = useState(persisted?.lingerMs ?? 2000);

  // persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(
        {
          seed,
          width,
          height,
          g,
          b,
          tau,
          controlsOpen,
          lockSize,
          animateDFS,
          dfsSegMs,
          lingerMs,
          startIcon,
          goalIcon,
        }));
      setSettingsError(null);
    } catch { setSettingsError("Settings could not be stored. They will reset when this page is closed."); }
  }, [seed,width,height,g,b,tau,controlsOpen,lockSize, animateDFS, dfsSegMs, lingerMs, startIcon, goalIcon]);

  // compute margin/stroke once from cell
  const margin = Math.round(cell/2);
  const stroke = Math.max(2, Math.round(cell/8));

  // print: keep the latest svg string from MazeView
  const [currentSVG, setCurrentSVG] = useState<string>("");

  // stats from MazeView
  const [stats, setStats] = useState<Stats>({ L:0,T:0,J:0,E:0,D:0 });

  // Track the breakpoint without overwriting the user's controls preference.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const apply = () => { setIsMobile(mq.matches); };
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { search: findMaxDifficulty, searching, error: searchError } = useDifficultySearch({ width, height, seed, g, b, tau }, best => {
    setG(best.g); setB(best.b); setTau(best.tau); setSeed(best.seed);
  });
  const newMaze = () => setSeed(s => (s + 1) | 0);
  const mazeKey = `${width}:${height}:${seed}:${g}:${b}:${tau}`;

  return (
    <div className={`shell${controlsOpen ? "" : " controls-closed"}`}>
      <main className="panel main">
        <header className="sticky-top hstack" style={{ justifyContent:"space-between" }}>
          <div className="hstack" style={{ alignItems:"baseline", gap:12 }}>
            <h1 style={{ margin:0, fontSize:22 }}>InfiMaze</h1>
            <div style={{ color:"#6b7280", fontSize:12 }}>seed {seed}</div>
          </div>
          <button className="btn" style={{ padding:"8px 12px" }}
            aria-expanded={controlsOpen} aria-controls="controls-panel"
            onClick={() => setControlsOpen(v=>!v)} title="Show/Hide Controls">
            {controlsOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </header>

        {(storageError || settingsError || searchError) && <div role="alert" style={{ padding: 12, color: "#b91c1c" }}>{storageError || settingsError || searchError}</div>}
        <section className="stack">
          {/* Maze + drawing; MazeView owns animation & emits svg/stats */}
          <div className="draw-wrap">
            <MazeView
              hostRef={svgHostRef}
              params={{ width, height, seed, g, b, tau }}
              render={{ cell, margin, stroke, startIcon, goalIcon, iconScale: 0.7 }}
              animation={{ enabled: animateDFS, segMs: dfsSegMs, lingerMs }}
              onStats={setStats}
              onSVGChange={setCurrentSVG}
            />
            <DrawingCanvas hostRef={svgHostRef} mazeKey={mazeKey} />
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
        searching={searching}

        /* Save/Load */
        saveName={saveName}
        setSaveName={setSaveName}
        saved={saved}
        selectedId={selectedId}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={handleDelete}

        /* UI state */
        controlsOpen={controlsOpen}
        onMinimize={() => setControlsOpen(false)}
        lockSize={lockSize}
        setLockSize={value => { setLockSize(value); if (value) setHeightRaw(width); }}

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

// src/app/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
import { createMaze, type GeneratorId, type MazeTopology } from "./maze";
import { useDifficultySearch } from "./hooks/useDifficultySearch";
import { mazeFingerprint, mazeToGraph } from '../maze/graph';
import { solveMaze, type SolverId } from '../maze/solvers';
import { useSolverPlayback } from './hooks/useSolverPlayback';
import type { AnimationMode } from '../maze/animation';
import type { CustomMask, MaskId } from '../maze/masks';
import { chooseEndpoints, type EndpointStrategy } from '../maze/endpoints';
import type { MazePoint } from './maze';
import type { WallStyle } from '../maze/walls';
import { useMazeGame } from './hooks/useMazeGame';
import { simulateMicromouse, type MousePhase } from '../maze/micromouse';

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
  const [generator, setGenerator] = useState<GeneratorId>(fromURL.generator ?? persisted.generator ?? 'dfs');
  const [topology,setTopology]=useState<MazeTopology>(fromURL.topology??persisted.topology??'grid');
  const [regionDensity,setRegionDensity]=useState(fromURL.regionDensity??persisted.regionDensity??.38);
  const [irregularity,setIrregularity]=useState(fromURL.irregularity??persisted.irregularity??.75);
  const [mask,setMask]=useState<MaskId>(fromURL.mask??persisted.mask??'rectangle');
  const [customMask,setCustomMask]=useState<CustomMask|undefined>(persisted.customMask);
  const [startCell,setStartCell]=useState<MazePoint|undefined>(fromURL.startCell??persisted.startCell);
  const [goalCell,setGoalCell]=useState<MazePoint|undefined>(fromURL.goalCell??persisted.goalCell);
  const [endpointMode,setEndpointMode]=useState<'start'|'goal'|null>(null);
  const [wallStyle,setWallStyle]=useState<WallStyle>(persisted.wallStyle??'classic');
  const [wallThickness,setWallThickness]=useState(persisted.wallThickness??3);
  const [cornerRadius,setCornerRadius]=useState(persisted.cornerRadius??.3);
  const [gameBreadcrumbs,setGameBreadcrumbs]=useState(persisted.gameBreadcrumbs??true);
  const [gameActive,setGameActive]=useState(false);
  const [micromouseActive,setMicromouseActive]=useState(false);
  const [micromouseSpeed,setMicromouseSpeed]=useState(persisted.micromouseSpeed??45);
  const [mouseShowWalls,setMouseShowWalls]=useState(persisted.mouseShowWalls??true);
  const [mouseShowFlood,setMouseShowFlood]=useState(persisted.mouseShowFlood??false);
  const [mouseShowRoute,setMouseShowRoute]=useState(persisted.mouseShowRoute??true);
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
    const params = { width, height, seed, g, b, tau, generator,topology,regionDensity,irregularity, mask, customMask:mask==='custom'?customMask:undefined, startCell, goalCell, wallStyle, wallThickness, cornerRadius, startIcon, goalIcon };
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
    setGenerator(maze.params.generator ?? 'dfs');
    setTopology(maze.params.topology??'grid');
    setRegionDensity(maze.params.regionDensity??.38);
    setIrregularity(maze.params.irregularity??.75);
    setMask(maze.params.mask??'rectangle');
    setCustomMask(maze.params.customMask);
    setStartCell(maze.params.startCell);
    setGoalCell(maze.params.goalCell);
    setWallStyle(maze.params.wallStyle??'classic');
    setWallThickness(maze.params.wallThickness??3);
    setCornerRadius(maze.params.cornerRadius??.3);
    setEndpointMode(null);
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
    const url = buildShareURL(window.location.href, { width, height, seed, g, b, tau, generator,topology,regionDensity,irregularity, mask, customMask:mask==='custom'?customMask:undefined, startCell, goalCell, wallStyle, wallThickness, cornerRadius, startIcon, goalIcon });
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

  // Solver playback preferences. Legacy animation settings provide migration defaults.
  const [solverEnabled, setSolverEnabled] = useState(persisted.solverEnabled ?? persisted.animateDFS ?? true);
  const [solverAlgorithm, setSolverAlgorithm] = useState<SolverId>(persisted.solverAlgorithm ?? 'dfs');
  const [solverStepMs, setSolverStepMs] = useState(persisted.solverStepMs ?? persisted.dfsSegMs ?? 35);
  const [animationMode, setAnimationMode] = useState<AnimationMode>(persisted.animationMode ?? 'build-solve');
  const [generationColor, setGenerationColor] = useState(persisted.generationColor ?? '#14b8a6');
  const [generationOpacity, setGenerationOpacity] = useState(persisted.generationOpacity ?? .35);
  const [solverColor, setSolverColor] = useState(persisted.solverColor ?? '#2563eb');
  const [solverOpacity, setSolverOpacity] = useState(persisted.solverOpacity ?? .65);

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
          solverEnabled,
          solverAlgorithm,
          solverStepMs,
          animationMode,
          generator,
          topology,
          regionDensity,
          irregularity,
          mask,
          customMask,
          startCell,
          goalCell,
          wallStyle,
          wallThickness,
          cornerRadius,
          gameBreadcrumbs,
          micromouseSpeed,
          mouseShowWalls,
          mouseShowFlood,
          mouseShowRoute,
          generationColor,
          generationOpacity,
          solverColor,
          solverOpacity,
          startIcon,
          goalIcon,
        }));
      setSettingsError(null);
    } catch { setSettingsError("Settings could not be stored. They will reset when this page is closed."); }
  }, [seed,width,height,g,b,tau,generator,topology,regionDensity,irregularity,mask,customMask,startCell,goalCell,wallStyle,wallThickness,cornerRadius,gameBreadcrumbs,micromouseSpeed,mouseShowWalls,mouseShowFlood,mouseShowRoute,controlsOpen,lockSize,solverEnabled,solverAlgorithm,solverStepMs,animationMode,generationColor,generationOpacity,solverColor,solverOpacity,startIcon,goalIcon]);

  // compute margin/stroke once from cell
  const margin = Math.round(cell/2);
  const stroke = wallThickness;

  // print: keep the latest svg string from MazeView
  const [currentSVG, setCurrentSVG] = useState<string>("");

  // Track the breakpoint without overwriting the user's controls preference.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const apply = () => { setIsMobile(mq.matches); };
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const mazeParams={width,height,seed,g,b,tau,generator,topology,regionDensity,irregularity,mask,customMask:mask==='custom'?customMask:undefined,startCell,goalCell};
  const { search: findMaxDifficulty, searching, error: searchError } = useDifficultySearch(mazeParams, best => {
    setG(best.g); setB(best.b); setTau(best.tau); setSeed(best.seed);
  });
  const newMaze = () => setSeed(s => (s + 1) | 0);
  const mazeKey = `${topology}:${regionDensity}:${irregularity}:${generator}:${mask}:${customMask?.pixels??''}:${customMask?.threshold??''}:${customMask?.invert??''}:${width}:${height}:${seed}:${g}:${b}:${tau}`;
  const mazeData = useMemo(() => createMaze(mazeParams), [width,height,seed,g,b,tau,generator,topology,regionDensity,irregularity,mask,customMask,startCell,goalCell]);
  const mazeGraph = useMemo(() => mazeToGraph(mazeData), [mazeData]);
  const mazeId=useMemo(()=>mazeFingerprint(mazeGraph),[mazeGraph]);
  const gameKey=`${mazeKey}:${mazeId}`;
  const game=useMazeGame(mazeGraph,gameKey);
  useEffect(()=>setGameActive(false),[gameKey]);
  useEffect(()=>setMicromouseActive(false),[mazeId]);
  const micromouse=useMemo(()=>topology==='grid'?simulateMicromouse(mazeGraph):null,[topology,mazeGraph]);
  const mousePlayback=useSolverPlayback(micromouse?.events.length??0,`mouse:${mazeId}`,micromouseActive,micromouseSpeed);
  const mousePhase:MousePhase|'ready'|'complete'=!micromouseActive||!micromouse?'ready':mousePlayback.state.finished?'complete':([...micromouse.events.slice(0,mousePlayback.state.index)].reverse().find(event=>event.type==='phase')?.phase??'search');
  const solverRun = useMemo(() => solveMaze(mazeGraph, solverAlgorithm), [mazeGraph, solverAlgorithm]);
  const buildEventCount = mazeData.treeSteps.length + mazeData.braidEdits.length;
  const includesBuild = animationMode !== 'solve';
  const includesSolve = animationMode !== 'build';
  const animationEventCount = (includesBuild ? buildEventCount : 0) + (includesSolve ? solverRun.events.length : 0);
  const animationRunKey = `${mazeKey}:${mazeData.start.x},${mazeData.start.y}:${mazeData.goal.x},${mazeData.goal.y}:${solverAlgorithm}:${animationMode}`;
  const playback = useSolverPlayback(animationEventCount, animationRunKey, solverEnabled, solverStepMs);
  const generationEventIndex = includesBuild ? Math.min(playback.state.index, buildEventCount) : 0;
  const solverEventIndex = includesSolve ? Math.max(0, playback.state.index - (includesBuild ? buildEventCount : 0)) : 0;
  const animationPhase = playback.state.finished ? 'Complete' : includesBuild && playback.state.index < buildEventCount ? 'Building' : 'Solving';
  const placeEndpoints=(strategy:EndpointStrategy)=>{
    const selected=chooseEndpoints(mazeData,strategy,seed);
    setStartCell(selected.startCell);setGoalCell(selected.goalCell);setEndpointMode(null);
  };
  const selectEndpoint=(point:MazePoint)=>{
    if(endpointMode==='start'){
      if(point.x===mazeData.goal.x&&point.y===mazeData.goal.y)setGoalCell(mazeData.start);
      setStartCell(point);
    }else if(endpointMode==='goal'){
      if(point.x===mazeData.start.x&&point.y===mazeData.start.y)setStartCell(mazeData.goal);
      setGoalCell(point);
    }
    setEndpointMode(null);
  };

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
          {/* Maze, solver playback, and drawing share one generated maze snapshot. */}
          <div className="draw-wrap">
            <MazeView
              hostRef={svgHostRef}
              data={mazeData}
              graph={mazeGraph}
              solverRun={solverRun}
              solverEnabled={solverEnabled&&!gameActive&&!micromouseActive}
              solverEventIndex={solverEventIndex}
              generationEventIndex={generationEventIndex}
              generationComplete={generationEventIndex >= buildEventCount}
              generationColor={generationColor}
              generationOpacity={generationOpacity}
              solverColor={solverColor}
              solverOpacity={solverOpacity}
              render={{ cell, margin, stroke, wallStyle, cornerRadius, startIcon, goalIcon, iconScale: 0.7 }}
              onSVGChange={setCurrentSVG}
              endpointMode={endpointMode}
              onEndpointSelect={selectEndpoint}
              gameplay={gameActive?{state:game.state,breadcrumbs:gameBreadcrumbs,move:game.move}:null}
              micromouse={micromouseActive&&micromouse?{events:micromouse.events,eventIndex:mousePlayback.state.index,showWalls:mouseShowWalls,showFlood:mouseShowFlood,showRoute:mouseShowRoute}:null}
            />
            <DrawingCanvas hostRef={svgHostRef} mazeKey={mazeKey} disabled={endpointMode!==null||gameActive||micromouseActive} playActive={gameActive}
              onPlay={()=>{setEndpointMode(null);setMicromouseActive(false);mousePlayback.pause();playback.pause();setGameActive(true);game.start();}} onExitPlay={()=>{game.pause();mousePlayback.pause();setGameActive(false);setMicromouseActive(false);}}/>
          </div>

          <StatsCard stats={mazeData.stats} />
        </section>
      </main>

      <Sidebar
        /* Install */
        canInstall={canInstall}
        onInstall={install}

        /* Size & difficulty */
        width={width} height={height} g={g} b={b} tau={tau}
        topology={topology} setTopology={value=>{setTopology(value);setStartCell(undefined);setGoalCell(undefined);setEndpointMode(null);}}
        regionDensity={regionDensity} setRegionDensity={setRegionDensity} irregularity={irregularity} setIrregularity={setIrregularity}
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
        mask={mask} setMask={setMask} customMask={customMask} setCustomMask={setCustomMask}
        setLockSize={value => { setLockSize(value); if (value) setHeightRaw(width); }}
        wallStyle={wallStyle} setWallStyle={setWallStyle} wallThickness={wallThickness} setWallThickness={setWallThickness} cornerRadius={cornerRadius} setCornerRadius={setCornerRadius}

        /* Markers */
        startIcon={startIcon}
        goalIcon={goalIcon}
        setStartIcon={setStartIcon}
        setGoalIcon={setGoalIcon}
        startCell={mazeData.start} goalCell={mazeData.goal} endpointMode={endpointMode}
        setEndpointMode={mode=>{game.pause();mousePlayback.pause();setGameActive(false);setMicromouseActive(false);setEndpointMode(mode);}} onPlaceEndpoints={placeEndpoints}
        gameplay={{active:gameActive,state:game.state,breadcrumbs:gameBreadcrumbs,setBreadcrumbs:setGameBreadcrumbs,
          start:()=>{setEndpointMode(null);setMicromouseActive(false);mousePlayback.pause();playback.pause();setGameActive(true);game.start();},pause:game.pause,restart:()=>{setEndpointMode(null);setMicromouseActive(false);mousePlayback.pause();playback.pause();setGameActive(true);game.restart();}}}
        micromouse={{available:topology==='grid',active:micromouseActive,reason:'Micromouse physics requires grid topology.',failureReason:micromouse?.reason,state:mousePlayback.state,phase:mousePhase,eventCount:micromouse?.events.length??0,speed:micromouseSpeed,setSpeed:setMicromouseSpeed,showWalls:mouseShowWalls,setShowWalls:setMouseShowWalls,showFlood:mouseShowFlood,setShowFlood:setMouseShowFlood,showRoute:mouseShowRoute,setShowRoute:setMouseShowRoute,metrics:micromouse?.metrics,
          start:()=>{game.pause();playback.pause();setGameActive(false);setEndpointMode(null);setMicromouseActive(true);},play:mousePlayback.play,pause:mousePlayback.pause,restart:()=>{game.pause();playback.pause();setGameActive(false);setEndpointMode(null);setMicromouseActive(true);mousePlayback.restart();},step:mousePlayback.step,seek:mousePlayback.seek,
          seekPhase:phase=>{const index=micromouse?.events.findIndex(event=>event.type==='phase'&&event.phase===phase)??-1;if(index>=0){setMicromouseActive(true);mousePlayback.seek(index+1);}},
          competitionPreset:()=>{game.pause();mousePlayback.pause();setGameActive(false);setMicromouseActive(false);setEndpointMode(null);setStartCell({x:0,y:height-1});setGoalCell({x:Math.floor(width/2),y:Math.floor(height/2)});}}}

        animation={{
          mode: animationMode,
          setMode: setAnimationMode,
          generator,
          setGenerator,
          solver: solverAlgorithm,
          setSolver: setSolverAlgorithm,
          enabled: solverEnabled,
          setEnabled: setSolverEnabled,
          speed: solverStepMs,
          setSpeed: setSolverStepMs,
          generationColor,
          setGenerationColor,
          generationOpacity,
          setGenerationOpacity,
          solverColor,
          setSolverColor,
          solverOpacity,
          setSolverOpacity,
          state: playback.state,
          phase: animationPhase,
          eventCount: animationEventCount,
          metrics: solverRun.metrics,
          play: playback.play,
          pause: playback.pause,
          restart: playback.restart,
          step: playback.step,
          seek: playback.seek,
        }}

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

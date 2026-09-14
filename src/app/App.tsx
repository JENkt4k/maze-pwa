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
import DrawingCanvas, { type DrawingMode } from "./components/DrawingCanvas";
import MazeView from "./components/MazeView";
import MazeViewport from "./components/MazeViewport";

import { buildBenchmarkURL, buildChallengeURL, buildShareURL, parseFromURL, parseSettings, parseSaved, SETTINGS_KEY, STORAGE_KEY, type SavedMaze } from "./state";
import { handlePrint, handlePrintPack, type PrintPackOptions } from "./print";
import { createMaze, openMazePassages, toSVG, type BraidMode, type GeneratorId, type MazeTopology } from "./maze";
import { useDifficultySearch } from "./hooks/useDifficultySearch";
import { mazeFingerprint, mazeToGraph, nodeId } from '../maze/graph';
import { solveMaze, type SolverId } from '../maze/solvers';
import { useSolverPlayback } from './hooks/useSolverPlayback';
import type { AnimationMode } from '../maze/animation';
import type { CustomMask, MaskId } from '../maze/masks';
import { chooseEndpoints, type EndpointStrategy } from '../maze/endpoints';
import type { MazePoint } from './maze';
import type { WallStyle } from '../maze/walls';
import { GAME_STORAGE_KEY, useMazeGame, type MazeGameState } from './hooks/useMazeGame';
import { compareMicromouseStrategies, DEFAULT_MOUSE_PHYSICS, DEFAULT_MOUSE_REALISM, simulateMicromouse, type MicromouseComparison, type MicromouseResult, type MousePhase, type MouseRealism, type MouseStrategyId } from '../maze/micromouse';
import { matchingMicromouseFormat, MICROMOUSE_FORMATS, micromouseEndpoints, micromouseGoalCells, micromouseGoalPassages, type MicromouseFormatId } from '../maze/micromouseFormats';
import { MOUSE_PROFILES, type MouseMotion } from '../maze/micromouseProfiles';
import { useMicromouseBatch } from './hooks/useMicromouseBatch';
import { analyzeDifficultyV2 } from '../maze/difficulty';
import { abandonHistoryEntry, createHistoryEntry, HISTORY_LIMIT, HISTORY_STORAGE_KEY, historyGameState, parsePlayHistory, updateHistoryEntry, type HistoryMazeParams, type PlayHistoryEntry } from './history';
import { mergeCollections, normalizeFolder, normalizeTags, parseCollectionBackup } from './mazeCollection';
import { loadVisualPalette, VISUAL_PALETTES, type VisualPaletteId } from './palettes';
import { measure, type MazePerformanceMetrics } from './performance';
import { useNetworkStatus } from './hooks/useNetworkStatus';

const DEFAULT_START = "\u{1f680}";
const DEFAULT_GOAL = "\u{1f3c1}";

export default function App() {
  /* PWA */
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [pwaError,setPwaError]=useState<string|null>(null);
  const updateSWRef = useRef<((reloadPage?: boolean) => void) | null>(null);
  useEffect(() => {
    if (updateSWRef.current) return;
    const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setNeedRefresh(true), onOfflineReady: () => setOfflineReady(true),onRegisterError:()=>setPwaError('Offline support could not start. Online use is still available.') });
    updateSWRef.current = updateSW;
  }, []);
  const { canInstall, install } = usePWAInstall();
  const online=useNetworkStatus();

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
  const [braidMode,setBraidMode]=useState<BraidMode>(fromURL.braidMode??persisted.braidMode??'random');
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
  const [mouseMotion,setMouseMotion]=useState<MouseMotion>({maxSpeedMps:fromURL.mouseMaxSpeedMps??persisted.mouseMaxSpeedMps??MOUSE_PROFILES.balanced.motion.maxSpeedMps,accelerationMps2:fromURL.mouseAccelerationMps2??persisted.mouseAccelerationMps2??MOUSE_PROFILES.balanced.motion.accelerationMps2,turn90Ms:fromURL.mouseTurn90Ms??persisted.mouseTurn90Ms??MOUSE_PROFILES.balanced.motion.turn90Ms});
  const [mouseRealism,setMouseRealism]=useState<MouseRealism>({sensorRangeCells:fromURL.mouseSensorRangeCells??persisted.mouseSensorRangeCells??DEFAULT_MOUSE_REALISM.sensorRangeCells,sensorNoise:fromURL.mouseSensorNoise??persisted.mouseSensorNoise??DEFAULT_MOUSE_REALISM.sensorNoise,correctionMs:fromURL.mouseCorrectionMs??persisted.mouseCorrectionMs??DEFAULT_MOUSE_REALISM.correctionMs,collisionMs:fromURL.mouseCollisionMs??persisted.mouseCollisionMs??DEFAULT_MOUSE_REALISM.collisionMs,diagonalSpeedRuns:fromURL.mouseDiagonalSpeedRuns??persisted.mouseDiagonalSpeedRuns??DEFAULT_MOUSE_REALISM.diagonalSpeedRuns,tractionLimitMps2:fromURL.mouseTractionLimitMps2??persisted.mouseTractionLimitMps2??DEFAULT_MOUSE_REALISM.tractionLimitMps2});
  const [mouseStrategy,setMouseStrategy]=useState<MouseStrategyId>(fromURL.mouseStrategy??persisted.mouseStrategy??'flood-fill');
  const [sizeRevision,setSizeRevision]=useState(0);
  const [controlsOpen, setControlsOpen] = useState(persisted.controlsOpen ?? !window.matchMedia("(max-width: 840px)").matches);
  const [lockSize, setLockSize]         = useState((persisted.lockSize ?? false) && width === height);
  const giantMode=width>41||height>41;
  const [drawingMode,setDrawingMode]=useState<DrawingMode>('draw');

  // Markers/emoji:
  const [startIcon, setStartIcon] = useState<string | null>(fromURL.startIcon !== undefined ? fromURL.startIcon : persisted.startIcon !== undefined ? persisted.startIcon : DEFAULT_START);
  const [goalIcon, setGoalIcon] = useState<string | null>(fromURL.goalIcon !== undefined ? fromURL.goalIcon : persisted.goalIcon !== undefined ? persisted.goalIcon : DEFAULT_GOAL);

  // saved mazes UI state and handlers
  const [saveName, setSaveName] = useState<string>("");
  const [saveFolder,setSaveFolder]=useState('');
  const [saveTags,setSaveTags]=useState('');
  const [saved, setSaved] = useState<SavedMaze[]>(() => { try { return parseSaved(localStorage.getItem(STORAGE_KEY)); } catch { return []; } });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history,setHistory]=useState<PlayHistoryEntry[]>(()=>{try{return parsePlayHistory(localStorage.getItem(HISTORY_STORAGE_KEY));}catch{return[];}});
  const historyRef=useRef(history);historyRef.current=history;
  const activeAttemptId=useRef<string|null>(null);
  const pendingHistoryId=useRef<string|null>(null);
  const storeHistory=(next:PlayHistoryEntry[])=>{
    const capped=[...next].sort((a,b)=>b.startedAt-a.startedAt).slice(0,HISTORY_LIMIT);
    try{localStorage.setItem(HISTORY_STORAGE_KEY,JSON.stringify(capped));}
    catch{setStorageError('Could not update play history. Browser storage may be full or unavailable.');return false;}
    historyRef.current=capped;setHistory(capped);setStorageError(null);return true;
  };

  const handleSave = () => {
    const name = saveName.trim().slice(0, 200) || `Maze ${saved.length + 1}`;
    const params = { width, height, seed, g, b, tau, generator,braidMode,topology,regionDensity,irregularity, mask, customMask:mask==='custom'?customMask:undefined, startCell, goalCell, wallStyle, wallThickness, cornerRadius, startIcon, goalIcon };
    const id = crypto.randomUUID();
    const folder=normalizeFolder(saveFolder),tags=normalizeTags(saveTags);
    const newMaze: SavedMaze = { id, name, params, createdAt: Date.now(), ...(folder?{folder}:{}), ...(tags.length?{tags}:{}) };
    const updated = [...saved, newMaze];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { setStorageError("Could not update saved mazes. Browser storage may be full or unavailable."); return; }
    setStorageError(null);
    setSaved(updated);
    setSelectedId(id);
  };

  const handleImportCollection=(text:string)=>{
    const incoming=parseCollectionBackup(text),updated=mergeCollections(saved,incoming);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(updated));}
    catch{setStorageError('Could not import the collection. Browser storage may be full or unavailable.');throw new Error('The collection could not be stored in this browser.');}
    setSaved(updated);setStorageError(null);return incoming.length;
  };
  const printMazePack=(ids:string[],options:PrintPackOptions)=>{
    const wanted=new Set(ids);
    const items=saved.filter(maze=>wanted.has(maze.id)).map(maze=>{
      const data=createMaze(maze.params);
      return {name:maze.name,svg:toSVG(data,{cell:24,margin:8,stroke:3,showStartGoal:true,startIcon:maze.params.startIcon,goalIcon:maze.params.goalIcon,wallStyle:maze.params.wallStyle,cornerRadius:maze.params.cornerRadius}),details:`${maze.params.width}×${maze.params.height} · seed ${maze.params.seed} · ${maze.params.generator??'dfs'}${maze.tags?.length?` · ${maze.tags.map(tag=>`#${tag}`).join(' ')}`:''}`};
    });
    handlePrintPack(items,options);
  };

  const applyMazeParams=(params:HistoryMazeParams)=>{
    setSizeRevision(value=>value+1);
    setWidthRaw(params.width);setHeightRaw(params.height);
    if(params.width!==params.height)setLockSize(false);
    setStartIcon(params.startIcon===undefined?DEFAULT_START:params.startIcon);setGoalIcon(params.goalIcon===undefined?DEFAULT_GOAL:params.goalIcon);
    setSeed(params.seed);setG(params.g);setB(params.b);setBraidMode(params.braidMode??'random');setTau(params.tau);setGenerator(params.generator??'dfs');
    setTopology(params.topology??'grid');setRegionDensity(params.regionDensity??.38);setIrregularity(params.irregularity??.75);
    setMask(params.mask??'rectangle');setCustomMask(params.customMask);setStartCell(params.startCell);setGoalCell(params.goalCell);
    setWallStyle(params.wallStyle??'classic');setWallThickness(params.wallThickness??3);setCornerRadius(params.cornerRadius??.3);
    setEndpointMode(null);
  };

  const handleLoad = (id: string) => {
    const maze = saved.find(m => m.id === id);if(!maze)return;
    applyMazeParams(maze.params);
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

  const sharedParams={ width, height, seed, g, b, tau, generator,braidMode,topology,regionDensity,irregularity, mask, customMask:mask==='custom'?customMask:undefined, startCell, goalCell, wallStyle, wallThickness, cornerRadius, startIcon, goalIcon };
  const shareURL = async (url:string,title:string,text:string) => {
    try {
      // Native share on mobile; clipboard elsewhere
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title, text, url });
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
  const handleShare=()=>shareURL(buildShareURL(window.location.href,sharedParams),'Maze','Check out this maze!');
  const handleChallengeShare=()=>shareURL(buildChallengeURL(window.location.href,sharedParams),'InfiMaze challenge','Can you beat my InfiMaze score?');
  const handleBenchmarkShare=()=>shareURL(buildBenchmarkURL(window.location.href,sharedParams,{motion:mouseMotion,realism:mouseRealism,strategy:mouseStrategy,count:mouseBatch.count}),'InfiMaze benchmark','Compare Micromouse strategies with this configuration.');

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

  // Manual sizing keeps the existing odd-grid increments; competition presets may use even grids.
  const setWidth  = (w:number) => { const odd = w%2? w : w+1; setWidthRaw(odd); if (lockSize) setHeightRaw(odd); };
  const setHeight = (h:number) => { const odd = h%2? h : h+1; setHeightRaw(odd); if (lockSize) setWidthRaw(odd); };
  const setGiantMode=(giant:boolean)=>{
    const bound=(value:number)=>giant?Math.max(43,value):Math.min(41,value);
    setWidthRaw(bound(width));setHeightRaw(lockSize?bound(width):bound(height));
  };

  // Solver playback preferences. Legacy animation settings provide migration defaults.
  const [solverEnabled, setSolverEnabled] = useState(persisted.solverEnabled ?? persisted.animateDFS ?? true);
  const [solverAlgorithm, setSolverAlgorithm] = useState<SolverId>(persisted.solverAlgorithm ?? 'dfs');
  const [solverStepMs, setSolverStepMs] = useState(persisted.solverStepMs ?? persisted.dfsSegMs ?? 35);
  const [animationMode, setAnimationMode] = useState<AnimationMode>(persisted.animationMode ?? 'build-solve');
  const [generationColor, setGenerationColor] = useState(persisted.generationColor ?? '#14b8a6');
  const [generationOpacity, setGenerationOpacity] = useState(persisted.generationOpacity ?? .35);
  const [solverColor, setSolverColor] = useState(persisted.solverColor ?? '#2563eb');
  const [solverOpacity, setSolverOpacity] = useState(persisted.solverOpacity ?? .65);
  const [visualPalette,setVisualPaletteState]=useState<VisualPaletteId>(loadVisualPalette);
  const setVisualPalette=(palette:VisualPaletteId)=>{
    setVisualPaletteState(palette);
    setGenerationColor(VISUAL_PALETTES[palette].build);
    setSolverColor(VISUAL_PALETTES[palette].solver);
  };
  useEffect(()=>{
    document.documentElement.dataset.palette=visualPalette;
    try{localStorage.setItem('ui:palette:v1',visualPalette);}catch{}
  },[visualPalette]);

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
          generator,braidMode,
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
          mouseMaxSpeedMps:mouseMotion.maxSpeedMps,
          mouseAccelerationMps2:mouseMotion.accelerationMps2,
          mouseTurn90Ms:mouseMotion.turn90Ms,
          mouseSensorRangeCells:mouseRealism.sensorRangeCells,
          mouseSensorNoise:mouseRealism.sensorNoise,
          mouseCorrectionMs:mouseRealism.correctionMs,
          mouseCollisionMs:mouseRealism.collisionMs,
          mouseDiagonalSpeedRuns:mouseRealism.diagonalSpeedRuns,
          mouseTractionLimitMps2:mouseRealism.tractionLimitMps2,
          mouseStrategy,
          generationColor,
          generationOpacity,
          solverColor,
          solverOpacity,
          startIcon,
          goalIcon,
        }));
      setSettingsError(null);
    } catch { setSettingsError("Settings could not be stored. They will reset when this page is closed."); }
  }, [seed,width,height,g,b,tau,generator,braidMode,topology,regionDensity,irregularity,mask,customMask,startCell,goalCell,wallStyle,wallThickness,cornerRadius,gameBreadcrumbs,micromouseSpeed,mouseShowWalls,mouseShowFlood,mouseShowRoute,mouseMotion,mouseRealism,mouseStrategy,controlsOpen,lockSize,solverEnabled,solverAlgorithm,solverStepMs,animationMode,generationColor,generationOpacity,solverColor,solverOpacity,startIcon,goalIcon]);

  // compute margin/stroke once from cell
  const margin = Math.round(cell/2);
  const stroke = wallThickness;

  // print: keep the latest svg string from MazeView
  const [currentSVG, setCurrentSVG] = useState<string>("");
  const [svgRenderMs,setSvgRenderMs]=useState(0);

  // Track the breakpoint without overwriting the user's controls preference.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const apply = () => { setIsMobile(mq.matches); };
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const mazeParams={width,height,seed,g,b,tau,generator,braidMode,topology,regionDensity,irregularity,mask,customMask:mask==='custom'?customMask:undefined,startCell,goalCell};
  const mouseBatch=useMicromouseBatch(mazeParams,mouseMotion,mouseRealism,fromURL.mouseBatchCount??10);
  const { search: runDifficultySearch, cancel:cancelDifficultySearch, searching, error: searchError, budget:difficultyBudget, setBudget:setDifficultyBudget, progress:difficultyProgress } = useDifficultySearch(mazeParams, best => {
    setG(best.g); setB(best.b); setTau(best.tau); setSeed(best.seed);
  });
  const newMaze = () => setSeed(s => (s + 1) | 0);
  const mazeKey = `${topology}:${regionDensity}:${irregularity}:${generator}:${braidMode==='difficulty'?'difficulty:':''}${mask}:${customMask?.pixels??''}:${customMask?.threshold??''}:${customMask?.invert??''}:${width}:${height}:${seed}:${g}:${b}:${tau}`;
  const micromouseFormat=matchingMicromouseFormat(width,height);
  const requestedCompetitionGoal=micromouseFormat&&goalCell&&goalCell.x===micromouseEndpoints(micromouseFormat).goal.x&&goalCell.y===micromouseEndpoints(micromouseFormat).goal.y;
  const mazeBuild = useMemo(() => measure(()=>{const generated=createMaze(mazeParams);return requestedCompetitionGoal&&micromouseFormat?.id==='classic'?openMazePassages(generated,micromouseGoalPassages(micromouseFormat)):generated;}), [width,height,seed,g,b,tau,generator,braidMode,topology,regionDensity,irregularity,mask,customMask,startCell,goalCell,micromouseFormat,requestedCompetitionGoal]);
  const mazeData=mazeBuild.value;
  const graphBuild = useMemo(() => measure(()=>mazeToGraph(mazeData)), [mazeData]);
  const mazeGraph=graphBuild.value;
  const difficultyBuild=useMemo(()=>measure(()=>analyzeDifficultyV2(mazeGraph)),[mazeGraph]);
  const difficultyV2=difficultyBuild.value;
  const identityBuild=useMemo(()=>measure(()=>mazeFingerprint(mazeGraph)),[mazeGraph]);
  const mazeId=identityBuild.value;
  const gameKey=`${mazeKey}:${mazeId}`;
  const game=useMazeGame(mazeGraph,gameKey);
  const gameStateMatchesMaze=game.state.key===gameKey&&mazeGraph.nodes.has(game.state.current)&&game.state.route.every(node=>mazeGraph.nodes.has(node));
  const historyParams:HistoryMazeParams={...mazeParams,startCell:mazeData.start,goalCell:mazeData.goal,wallStyle,wallThickness,cornerRadius,startIcon,goalIcon};
  const replaceHistoryEntry=(entry:PlayHistoryEntry)=>storeHistory(historyRef.current.map(item=>item.id===entry.id?entry:item));
  const abandonActiveAttempt=()=>{const id=activeAttemptId.current;if(!id)return;const entry=historyRef.current.find(item=>item.id===id);if(entry)replaceHistoryEntry(abandonHistoryEntry(entry));activeAttemptId.current=null;};
  const newAttemptState=():MazeGameState=>({key:gameKey,current:mazeGraph.start,route:[mazeGraph.start],moves:0,revisits:0,hints:0,elapsedMs:0,status:'playing'});
  const currentMouseBenchmark=()=>micromouse?{totalTimeMs:micromouse.metrics.totalTimeMs,speedTimeMs:micromouse.metrics.speed.timeMs,speedCells:micromouse.metrics.speed.cells,exploredPercent:micromouse.metrics.exploredPercent,turns:micromouse.metrics.search.turns+micromouse.metrics.return.turns+micromouse.metrics.speed.turns}:undefined;
  const startGameplay=()=>{
    setEndpointMode(null);setMicromouseActive(false);mousePlayback.pause();playback.pause();setGameActive(true);
    const active=historyRef.current.find(entry=>entry.id===activeAttemptId.current&&entry.gameKey===gameKey);
    if(game.state.status==='paused'&&active){game.start();return;}
    abandonActiveAttempt();
    const state=game.state.status==='paused'?{...game.state,status:'playing' as const}:newAttemptState();
    const entry=createHistoryEntry(mazeId,gameKey,historyParams,state,Date.now(),crypto.randomUUID(),currentMouseBenchmark());if(storeHistory([entry,...historyRef.current]))activeAttemptId.current=entry.id;
    game.start();
  };
  const restartGameplay=()=>{
    abandonActiveAttempt();const entry=createHistoryEntry(mazeId,gameKey,historyParams,newAttemptState(),Date.now(),crypto.randomUUID(),currentMouseBenchmark());
    if(storeHistory([entry,...historyRef.current]))activeAttemptId.current=entry.id;
    setEndpointMode(null);setMicromouseActive(false);mousePlayback.pause();playback.pause();setGameActive(true);game.restart();
  };
  const quitGameplay=()=>{game.pause();setGameActive(false);};
  const challengeStarted=useRef(false);
  const openHistory=(id:string)=>{
    const entry=historyRef.current.find(item=>item.id===id);if(!entry)return;
    abandonActiveAttempt();const restored=historyGameState(entry);
    try{localStorage.setItem(GAME_STORAGE_KEY,JSON.stringify(restored));}catch{setStorageError('Could not restore this attempt. Browser storage may be unavailable.');return;}
    activeAttemptId.current=id;pendingHistoryId.current=id;applyMazeParams(entry.params);
    if(entry.gameKey===gameKey){game.restore(restored);pendingHistoryId.current=null;setGameActive(true);}
  };
  const deleteHistory=(id:string)=>{if(storeHistory(historyRef.current.filter(entry=>entry.id!==id))&&activeAttemptId.current===id)activeAttemptId.current=null;};
  const clearHistory=()=>{if(storeHistory([]))activeAttemptId.current=null;};
  useEffect(()=>{
    const active=historyRef.current.find(entry=>entry.id===activeAttemptId.current);
    if(active&&active.gameKey!==gameKey){replaceHistoryEntry(abandonHistoryEntry(active));activeAttemptId.current=null;}
    setGameActive(false);
    const pending=historyRef.current.find(entry=>entry.id===pendingHistoryId.current);
    if(pending?.gameKey===gameKey){activeAttemptId.current=pending.id;pendingHistoryId.current=null;setGameActive(true);}
  },[gameKey]);
  useEffect(()=>{if(!challengeStarted.current&&new URLSearchParams(window.location.search).get('challenge')==='1'){challengeStarted.current=true;restartGameplay();}},[gameKey]);
  useEffect(()=>{if(challengeStarted.current&&game.state.status==='playing'&&gameStateMatchesMaze)setGameActive(true);},[game.state.status,game.state.key,game.state.current,gameKey,gameStateMatchesMaze]);
  const historyElapsedSecond=Math.floor(game.state.elapsedMs/1000);
  const challengePlaying=challengeStarted.current&&game.state.status==='playing';
  useEffect(()=>{
    if(game.state.status==='idle')return;
    const entry=historyRef.current.find(item=>item.id===activeAttemptId.current&&item.gameKey===gameKey);if(!entry)return;
    replaceHistoryEntry(updateHistoryEntry(entry,game.state));
  },[game.state.status,game.state.moves,game.state.revisits,game.state.hints,game.state.route,historyElapsedSecond,gameKey]);
  useEffect(()=>setMicromouseActive(false),[mazeId]);
  const competitionEndpoints=micromouseFormat?micromouseEndpoints(micromouseFormat):undefined;
  const usesCompetitionGoal=competitionEndpoints&&mazeData.goal.x===competitionEndpoints.goal.x&&mazeData.goal.y===competitionEndpoints.goal.y;
  const micromouseGraph=useMemo(()=>usesCompetitionGoal&&micromouseFormat?{...mazeGraph,goals:micromouseGoalCells(micromouseFormat).map(nodeId).filter(id=>mazeGraph.nodes.has(id))}:mazeGraph,[mazeGraph,micromouseFormat,usesCompetitionGoal]);
  const mouseScenarioKey=`${mazeId}:${mouseStrategy}:${mouseMotion.maxSpeedMps}:${mouseMotion.accelerationMps2}:${mouseMotion.turn90Ms}:${mouseRealism.sensorRangeCells}:${mouseRealism.sensorNoise}:${mouseRealism.correctionMs}:${mouseRealism.collisionMs}:${mouseRealism.diagonalSpeedRuns}:${mouseRealism.tractionLimitMps2}`;
  const [mouseRun,setMouseRun]=useState<{key:string;result:MicromouseResult;costMs:number}|null>(null);
  const [comparisonRun,setComparisonRun]=useState<{key:string;rows:readonly MicromouseComparison[];costMs:number;visible:boolean}|null>(null);
  const micromouse=mouseRun?.key===mouseScenarioKey?mouseRun.result:null;
  const mouseComparisons=comparisonRun?.key===mouseScenarioKey&&comparisonRun.visible?comparisonRun.rows:undefined;
  const runMicromouse=()=>{if(topology!=='grid')return;const started=performance.now(),result=simulateMicromouse(micromouseGraph,{...DEFAULT_MOUSE_PHYSICS,...mouseMotion,cellMeters:(micromouseFormat?.cellPitchCm??18)/100},mouseStrategy,mouseRealism,seed);setMouseRun({key:mouseScenarioKey,result,costMs:Math.max(0,Math.round(performance.now()-started))});setMicromouseActive(true);};
  const toggleMouseComparison=()=>{if(comparisonRun?.key===mouseScenarioKey&&comparisonRun.visible){setComparisonRun({...comparisonRun,visible:false});return;}const started=performance.now(),rows=compareMicromouseStrategies(micromouseGraph,{...DEFAULT_MOUSE_PHYSICS,...mouseMotion,cellMeters:(micromouseFormat?.cellPitchCm??18)/100},mouseRealism,seed);setComparisonRun({key:mouseScenarioKey,rows,costMs:Math.max(0,Math.round(performance.now()-started)),visible:true});};
  const mousePlayback=useSolverPlayback(micromouse?.events.length??0,`mouse:${mouseScenarioKey}`,micromouseActive,micromouseSpeed);
  const mousePhase:MousePhase|'ready'|'complete'=!micromouseActive||!micromouse?'ready':mousePlayback.state.finished?'complete':([...micromouse.events.slice(0,mousePlayback.state.index)].reverse().find(event=>event.type==='phase')?.phase??'search');
  const solverBuild = useMemo(() => measure(()=>solveMaze(mazeGraph, solverAlgorithm)), [mazeGraph, solverAlgorithm]);
  const solverRun=solverBuild.value;
  const mazePerformance:MazePerformanceMetrics={cells:mazeGraph.nodes.size,generationMs:mazeBuild.durationMs,graphMs:graphBuild.durationMs,difficultyMs:difficultyBuild.durationMs,identityMs:identityBuild.durationMs,solverMs:solverBuild.durationMs,svgMs:svgRenderMs};
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
            <MazeViewport giant={giantMode} navigationEnabled={drawingMode==='scroll'&&endpointMode===null&&!gameActive&&!micromouseActive}><MazeView
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
              onRenderCost={setSvgRenderMs}
              endpointMode={endpointMode}
              onEndpointSelect={selectEndpoint}
              gameplay={(gameActive&&gameStateMatchesMaze)||challengePlaying?{state:game.state,hintNode:game.hintNode,breadcrumbs:gameBreadcrumbs,move:game.move}:null}
              micromouse={micromouseActive&&micromouse?{events:micromouse.events,eventIndex:mousePlayback.state.index,showWalls:mouseShowWalls,showFlood:mouseShowFlood,showRoute:mouseShowRoute,goals:micromouseGraph.goals}:null}
              goalZone={usesCompetitionGoal&&micromouseFormat?.id==='classic'?micromouseGraph.goals:undefined}
            /></MazeViewport>
            <DrawingCanvas hostRef={svgHostRef} mazeKey={mazeKey} disabled={endpointMode!==null||gameActive||challengePlaying||micromouseActive} playActive={gameActive||challengePlaying}
              onPlay={startGameplay} onModeChange={setDrawingMode} onExitPlay={()=>{game.pause();mousePlayback.pause();setGameActive(false);setMicromouseActive(false);}}/>
          </div>

          <StatsCard stats={mazeData.stats} difficulty={difficultyV2} />
        </section>
      </main>

      <Sidebar
        /* Install */
        canInstall={canInstall}
        onInstall={install}

        /* Size & difficulty */
        width={width} height={height} giantMode={giantMode} setGiantMode={setGiantMode} g={g} b={b} tau={tau} braidMode={braidMode} setBraidMode={setBraidMode}
        topology={topology} setTopology={value=>{setTopology(value);setStartCell(undefined);setGoalCell(undefined);setEndpointMode(null);}}
        regionDensity={regionDensity} setRegionDensity={setRegionDensity} irregularity={irregularity} setIrregularity={setIrregularity}
        setWidth={setWidth} setHeight={setHeight} setG={setG} setB={setB} setTau={setTau}

        /* Actions */
        onNew={newMaze}
        onPrint={() => handlePrint(currentSVG)}
        onMaxDifficulty={runDifficultySearch}
        onCancelDifficulty={cancelDifficultySearch}
        searching={searching}
        difficultyBudget={difficultyBudget}
        setDifficultyBudget={setDifficultyBudget}
        difficultyProgress={difficultyProgress}

        /* Save/Load */
        saveName={saveName}
        setSaveName={setSaveName}
        saveFolder={saveFolder} setSaveFolder={setSaveFolder}
        saveTags={saveTags} setSaveTags={setSaveTags}
        saved={saved}
        selectedId={selectedId}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onImportCollection={handleImportCollection}
        onPrintPack={printMazePack}

        /* UI state */
        controlsOpen={controlsOpen}
        onMinimize={() => setControlsOpen(false)}
        lockSize={lockSize}
        sizeRevision={sizeRevision}
        mask={mask} setMask={setMask} customMask={customMask} setCustomMask={setCustomMask}
        setLockSize={setLockSize}
        wallStyle={wallStyle} setWallStyle={setWallStyle} wallThickness={wallThickness} setWallThickness={setWallThickness} cornerRadius={cornerRadius} setCornerRadius={setCornerRadius}

        /* Markers */
        startIcon={startIcon}
        goalIcon={goalIcon}
        setStartIcon={setStartIcon}
        setGoalIcon={setGoalIcon}
        startCell={mazeData.start} goalCell={mazeData.goal} endpointMode={endpointMode}
        setEndpointMode={mode=>{game.pause();mousePlayback.pause();setGameActive(false);setMicromouseActive(false);setEndpointMode(mode);}} onPlaceEndpoints={placeEndpoints}
        gameplay={{active:gameActive,state:game.state,breadcrumbs:gameBreadcrumbs,setBreadcrumbs:setGameBreadcrumbs,
          quit:quitGameplay,
          start:startGameplay,pause:game.pause,restart:restartGameplay,hint:game.hint,newMaze,difficulty:difficultyV2.score,
          personalBestMs:history.filter(entry=>entry.mazeId===mazeId&&entry.status==='completed'&&(entry.hints??0)===0&&entry.id!==activeAttemptId.current).sort((a,b)=>a.elapsedMs-b.elapsedMs)[0]?.elapsedMs,shareChallenge:handleChallengeShare}}
        micromouse={{available:topology==='grid',active:micromouseActive,reason:'Micromouse physics requires grid topology.',failureReason:micromouse?.reason,state:mousePlayback.state,phase:mousePhase,eventCount:micromouse?.events.length??0,speed:micromouseSpeed,setSpeed:setMicromouseSpeed,showWalls:mouseShowWalls,setShowWalls:setMouseShowWalls,showFlood:mouseShowFlood,setShowFlood:setMouseShowFlood,showRoute:mouseShowRoute,setShowRoute:setMouseShowRoute,metrics:micromouse?.metrics,simulationCostMs:mouseRun?.key===mouseScenarioKey?mouseRun.costMs:undefined,comparisonCostMs:comparisonRun?.key===mouseScenarioKey?comparisonRun.costMs:undefined,format:micromouseFormat,exportContext:{seed,width,height,generator,topology,format:micromouseFormat?.id??'custom',motion:mouseMotion,realism:mouseRealism},motion:mouseMotion,setMotion:setMouseMotion,realism:mouseRealism,setRealism:setMouseRealism,strategy:mouseStrategy,setStrategy:setMouseStrategy,comparisons:mouseComparisons,toggleComparison:toggleMouseComparison,batch:{...mouseBatch,shared:fromURL.benchmarkShared===true,share:handleBenchmarkShare},
          start:()=>{game.pause();playback.pause();setGameActive(false);setEndpointMode(null);runMicromouse();},play:mousePlayback.play,pause:mousePlayback.pause,restart:()=>{game.pause();playback.pause();setGameActive(false);setEndpointMode(null);runMicromouse();},step:mousePlayback.step,seek:mousePlayback.seek,
          seekPhase:phase=>{const index=micromouse?.events.findIndex(event=>event.type==='phase'&&event.phase===phase)??-1;if(index>=0){setMicromouseActive(true);mousePlayback.seek(index+1);}},
          applyFormat:(id:MicromouseFormatId)=>{const format=MICROMOUSE_FORMATS[id],endpoints=micromouseEndpoints(format);game.pause();mousePlayback.pause();playback.pause();setGameActive(false);setMicromouseActive(false);setEndpointMode(null);setTopology('grid');setMask('rectangle');setLockSize(true);setWidthRaw(format.width);setHeightRaw(format.height);setStartCell(endpoints.start);setGoalCell(endpoints.goal);}}}
        history={{entries:history,onOpen:openHistory,onDelete:deleteHistory,onClear:clearHistory}}
        leaderboard={{entries:history,currentMazeId:mazeId,sharedEndpoint:import.meta.env.VITE_SHARED_LEADERBOARD_URL}}

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
          graph: mazeGraph,
          mazeParams,
        }}
        visualPalette={visualPalette}
        setVisualPalette={setVisualPalette}
        performanceMetrics={mazePerformance}

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
        offlineReady={offlineReady} needRefresh={needRefresh} online={online} error={pwaError}
        onUpdate={() => updateSWRef.current?.(true)}
        onClose={() => { setNeedRefresh(false); setOfflineReady(false);setPwaError(null); }}
      />
    </div>
  );
}

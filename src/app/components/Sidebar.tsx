import { useEffect, useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker";

import type { SavedMaze } from "../state";
import { normalizeMarker } from "../maze";
import AnimationControls, { type AnimationControlsProps } from './AnimationControls';
import { MASKS, type MaskId } from '../../maze/masks';
import type { CustomMask } from '../../maze/masks';
import CustomMaskControls from './CustomMaskControls';
import type { EndpointStrategy } from '../../maze/endpoints';
import type { BraidMode, MazePoint, MazeTopology } from '../maze';
import type { WallStyle } from '../../maze/walls';
import GameplayControls from './GameplayControls';
import type { MazeGameState } from '../hooks/useMazeGame';
import MicromouseControls, { type MicromouseControlsProps } from './MicromouseControls';
import PlayHistory, { type PlayHistoryProps } from './PlayHistory';
import Leaderboard, { type LeaderboardProps } from './Leaderboard';
import type { DifficultySearchBudget, DifficultySearchProgress } from '../difficultySearch';
import MazeCollection from './MazeCollection';
import type { PrintPackOptions } from '../print';

type Props = {
  canInstall: boolean;
  onInstall: () => void;
  width: number; height: number; giantMode:boolean;setGiantMode:(value:boolean)=>void;g: number; b: number; tau: number;braidMode:BraidMode;setBraidMode:(mode:BraidMode)=>void;
  topology:MazeTopology;setTopology:(value:MazeTopology)=>void;regionDensity:number;setRegionDensity:(value:number)=>void;irregularity:number;setIrregularity:(value:number)=>void;
  setWidth: (n:number)=>void; setHeight:(n:number)=>void; setG:(n:number)=>void; setB:(n:number)=>void; setTau:(n:number)=>void;
  onNew: () => void; onPrint: () => void;
  saveName: string; setSaveName: (s:string)=>void;saveFolder:string;setSaveFolder:(s:string)=>void;saveTags:string;setSaveTags:(s:string)=>void;
  saved: SavedMaze[]; selectedId: string|null;
  onSave: () => void; onLoad: (id:string)=>void; onDelete: (id:string)=>void;onImportCollection:(text:string)=>number;onPrintPack:(ids:string[],options:PrintPackOptions)=>void;
  controlsOpen: boolean;
  onMinimize: () => void;
  lockSize: boolean;
  sizeRevision:number;
  setLockSize: (v:boolean)=>void;
  mask:MaskId; setMask:(mask:MaskId)=>void; customMask?:CustomMask; setCustomMask:(mask:CustomMask)=>void;
  wallStyle:WallStyle;setWallStyle:(style:WallStyle)=>void;wallThickness:number;setWallThickness:(value:number)=>void;cornerRadius:number;setCornerRadius:(value:number)=>void;
  onMaxDifficulty: () => void;
  onCancelDifficulty:()=>void;
  searching: boolean;
  difficultyBudget:DifficultySearchBudget;setDifficultyBudget:(budget:DifficultySearchBudget)=>void;
  difficultyProgress:DifficultySearchProgress|null;
  startIcon: string | null;
  goalIcon: string | null;
  setStartIcon: (v: string | null) => void;
  setGoalIcon: (v: string | null) => void;
  startCell:MazePoint; goalCell:MazePoint; endpointMode:'start'|'goal'|null;
  setEndpointMode:(mode:'start'|'goal'|null)=>void; onPlaceEndpoints:(strategy:EndpointStrategy)=>void;
  gameplay:{active:boolean;state:MazeGameState;breadcrumbs:boolean;setBreadcrumbs:(value:boolean)=>void;start:()=>void;pause:()=>void;quit:()=>void;restart:()=>void;hint:()=>void;newMaze:()=>void;shareChallenge:()=>void;difficulty:number;personalBestMs?:number};
  micromouse:MicromouseControlsProps;
  history:PlayHistoryProps;
  leaderboard:LeaderboardProps;
  animation: AnimationControlsProps;
  onShare: () => void;
};

export default function Sidebar(props: Props){
  const {
    canInstall, onInstall,
    width, height, g, b, tau,
    setG, setB, setTau,
    onNew, onPrint,
    saveName, setSaveName, saved = [], selectedId, onSave, onLoad, onDelete,
    controlsOpen, onMinimize,
    startIcon, goalIcon, setStartIcon, setGoalIcon,
    onShare,
  } = props;

  const [picker, setPicker] = useState<null | "start" | "goal">(null);
  const [draftWidth,setDraftWidth]=useState(width),[draftHeight,setDraftHeight]=useState(height);
  useEffect(()=>{setDraftWidth(width);setDraftHeight(height);},[width,height,props.sizeRevision]);
  const sizeDirty=draftWidth!==width||draftHeight!==height;
  const normalizeSize=(value:number)=>value%2?value:value+1;
  const applySize=()=>{props.setWidth(draftWidth);if(!props.lockSize)props.setHeight(draftHeight);};
  const resetSize=()=>{setDraftWidth(width);setDraftHeight(height);};
  type ControlPage='build'|'play'|'robot'|'analyze'|'library';
  const [controlPage,setControlPage]=useState<ControlPage>(()=>props.micromouse.batch.shared?'robot':'build');
  const pagePanelIds:Record<ControlPage,string>={build:'build-controls-panel build-secondary-panel',play:'play-controls-panel play-records-panel',robot:'robot-controls-panel',analyze:'analyze-controls-panel',library:'library-controls-panel'};
  const [highContrast,setHighContrast]=useState(()=>{try{return localStorage.getItem('ui:highContrast:v1')==='true';}catch{return false;}});
  const controlsRef=useRef<HTMLElement>(null);
  useEffect(() => { if (!controlsOpen) setPicker(null); }, [controlsOpen]);
  useEffect(()=>{document.documentElement.dataset.contrast=highContrast?'high':'';try{localStorage.setItem('ui:highContrast:v1',String(highContrast));}catch{}},[highContrast]);
  useEffect(()=>{if(props.gameplay.active)setControlPage('play');else if(props.micromouse.active)setControlPage('robot');},[props.gameplay.active,props.micromouse.active]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  async function uploadMarker(file: File | undefined, setMarker: (value: string | null) => void) {
    if (!file) return;
    setUploadError(null);
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadError('Choose a PNG, JPEG, GIF, or WebP image smaller than 5 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setMarker(normalizeMarker(canvas.toDataURL('image/png')));
    } catch { setUploadError('This image could not be opened. Please choose another file.'); }
    finally { URL.revokeObjectURL(url); }
  }
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const goalBtnRef = useRef<HTMLButtonElement>(null);

  const display = controlsOpen ? "flex" : "none";

  return (
    <aside ref={controlsRef} id="controls-panel" className="panel controls" style={{ display, flexDirection:"column", gap:16 }}>
      <div className="sticky-top hstack" style={{ justifyContent:"space-between", paddingBottom:8 }}>
        <h2 style={{ margin:0, fontSize:20 }}>Maze Controls</h2>
        <div className="hstack" style={{ gap:6 }}>
          {/* Minimize button shows when expanded */}
          <button type="button" className="btn btn-sm" title="Minimize controls" onClick={onMinimize}>Minimize</button>
          {canInstall && <button type="button" className="btn btn-sm" onClick={onInstall} title="Install app">Install</button>}
        </div>
      </div>

      <nav className="control-nav" aria-label="Control categories">
        <div role="tablist" aria-label="Maze control pages">{(['build','play','robot','analyze','library'] as const).map((page,index,pages)=><button id={`${page}-controls-tab`} key={page} type="button" role="tab" data-control-tab={page} aria-controls={pagePanelIds[page]} tabIndex={controlPage===page?0:-1} aria-selected={controlPage===page} className={controlPage===page?'active':''} onClick={()=>setControlPage(page)} onKeyDown={event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%pages.length;else if(event.key==='ArrowLeft')next=(index-1+pages.length)%pages.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=pages.length-1;else return;event.preventDefault();const target=pages[next];setControlPage(target);requestAnimationFrame(()=>controlsRef.current?.querySelector<HTMLButtonElement>(`[data-control-tab="${target}"]`)?.focus());}}>{page[0].toUpperCase()+page.slice(1)}</button>)}</div>
        <div className="control-nav-tools"><button type="button" className="btn btn-sm" onClick={()=>controlsRef.current?.querySelectorAll('.control-page:not([hidden]) details[open]').forEach(details=>details.removeAttribute('open'))}>Collapse all</button><label className="contrast-toggle"><input name="high-contrast" type="checkbox" checked={highContrast} onChange={event=>setHighContrast(event.target.checked)}/>High contrast</label></div>
      </nav>

      <div id="build-controls-panel" role="tabpanel" aria-labelledby="build-controls-tab" className="control-page" hidden={controlPage!=='build'} aria-label="Build controls">
      <fieldset>
        <legend>Size</legend>
        <details>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Adjust size</summary>

          <label>Maze shape
            <select name="maze-shape" value={props.mask} onChange={e=>props.setMask(e.target.value as MaskId)}>
              {Object.values(MASKS).map(mask=><option key={mask.id} value={mask.id}>{mask.name}</option>)}
            </select>
          </label>
          <label>Maze size mode
            <select name="maze-size-mode" value={props.giantMode?'giant':'standard'} onChange={e=>props.setGiantMode(e.target.value==='giant')}>
              <option value="standard">Standard (7–41)</option><option value="giant">Giant (43–101)</option>
            </select>
          </label>
          <label>Maze topology
            <select name="maze-topology" value={props.topology} onChange={e=>props.setTopology(e.target.value as MazeTopology)}>
              <option value="grid">Grid cells</option><option value="freeform">Freeform regions</option>
            </select>
          </label>
          {props.topology==='freeform'&&<>
            <label>Region density: {Math.round(props.regionDensity*100)}%
              <input name="region-density" type="range" min="15" max="100" step="5" value={props.regionDensity*100} onChange={e=>props.setRegionDensity(Number(e.target.value)/100)}/>
            </label>
            <label>Irregularity: {Math.round(props.irregularity*100)}%
              <input name="region-irregularity" type="range" min="0" max="100" step="5" value={props.irregularity*100} onChange={e=>props.setIrregularity(Number(e.target.value)/100)}/>
            </label>
          </>}
          {props.mask==='custom'&&<CustomMaskControls value={props.customMask} onChange={props.setCustomMask} width={width} height={height}/>}

          <label>Width: {draftWidth}
            <input
              name="maze-width" type="range" min={props.giantMode?43:7} max={props.giantMode?101:41} step={draftWidth%2===0?1:2}
              value={draftWidth}
              onChange={e=>{const next=normalizeSize(parseInt(e.target.value));setDraftWidth(next);if(props.lockSize)setDraftHeight(next);}}
            />
          </label>

          <label>Height: {draftHeight}
            <input
              name="maze-height" type="range" min={props.giantMode?43:7} max={props.giantMode?101:41} step={draftHeight%2===0?1:2}
              value={draftHeight}
              onChange={e=>setDraftHeight(normalizeSize(parseInt(e.target.value)))}
              disabled={props.lockSize}
            />
          </label>

          <label className="hstack" style={{ alignItems:"center", gap:8 }}>
            <input
              name="lock-maze-size" type="checkbox"
              checked={props.lockSize}
              onChange={(e)=>{props.setLockSize(e.target.checked);if(e.target.checked)setDraftHeight(draftWidth);}}
            />
            <span>Lock width & height (square)</span>
          </label>
          <div className="maze-size-actions" role="group" aria-label="Maze size changes"><button type="button" className="btn btn-primary" disabled={!sizeDirty} onClick={applySize}>Apply size</button><button type="button" className="btn" disabled={!sizeDirty} onClick={resetSize}>Reset size</button>{sizeDirty&&<span role="status">Size change not applied; current maze remains {width}×{height}.</span>}</div>
        </details>
      </fieldset>
      </div>

      <div id="play-controls-panel" role="tabpanel" aria-labelledby="play-controls-tab" className="control-page" hidden={controlPage!=='play'} aria-label="Play controls">
      <fieldset>
        <legend>Gameplay</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Play maze</summary>
          <GameplayControls {...props.gameplay}/>
        </details>
      </fieldset>
      </div>

      <div id="robot-controls-panel" role="tabpanel" aria-labelledby="robot-controls-tab" className="control-page" hidden={controlPage!=='robot'} aria-label="Robot controls">
      <fieldset>
        <legend>Micromouse</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Robot simulation</summary>
          <MicromouseControls {...props.micromouse}/>
        </details>
      </fieldset>
      </div>

      <div id="play-records-panel" className="control-page" hidden={controlPage!=='play'} aria-label="Play records">
      <fieldset>
        <legend>History</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Played mazes</summary>
          <PlayHistory {...props.history}/>
        </details>
      </fieldset>

      <fieldset>
        <legend>Leaderboard</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Local rankings</summary>
          <Leaderboard {...props.leaderboard}/>
        </details>
      </fieldset>
      </div>

      <div id="build-secondary-panel" className="control-page" hidden={controlPage!=='build'} aria-label="Build appearance and markers">
      <fieldset>
        <legend>Appearance</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Wall style</summary>
          <div className="stack" style={{gap:10}}>
            <label>Style
              <select name="wall-style" value={props.wallStyle} onChange={e=>props.setWallStyle(e.target.value as WallStyle)}>
                <option value="classic">Classic</option><option value="rounded">Rounded</option><option value="organic">Organic</option>
              </select>
            </label>
            <label>Wall thickness: {props.wallThickness}px
              <input name="wall-thickness" type="range" min="1" max="8" step="1" value={props.wallThickness} onChange={e=>props.setWallThickness(Number(e.target.value))}/>
            </label>
            <label>Corner radius: {Math.round(props.cornerRadius*100)}%
              <input name="corner-radius" type="range" min="0" max="50" step="5" value={props.cornerRadius*100} disabled={props.wallStyle==='classic'} onChange={e=>props.setCornerRadius(Number(e.target.value)/100)}/>
            </label>
          </div>
        </details>
      </fieldset>

      {/* Markers */}
      <fieldset>
        <legend>Markers</legend>
        {uploadError && <p role="alert">{uploadError}</p>}
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
            Choose Start & Goal
          </summary>

          <div style={{ display:"grid", gap:12 }}>
            <div className="endpoint-controls">
              <div className="grid-3" role="group" aria-label="Endpoint placement tools">
                <button type="button" className={`btn btn-sm${props.endpointMode==='start'?' btn-primary':''}`} aria-pressed={props.endpointMode==='start'} onClick={()=>props.setEndpointMode(props.endpointMode==='start'?null:'start')}>Set start</button>
                <button type="button" className={`btn btn-sm${props.endpointMode==='goal'?' btn-primary':''}`} aria-pressed={props.endpointMode==='goal'} onClick={()=>props.setEndpointMode(props.endpointMode==='goal'?null:'goal')}>Set goal</button>
                <button type="button" className="btn btn-sm" onClick={()=>props.onPlaceEndpoints('opposite')}>Reset</button>
              </div>
              <span>{props.endpointMode?`Select an active maze ${props.topology==='freeform'?'region':'cell'} for the ${props.endpointMode}.`:`Start: ${props.topology==='freeform'?`${props.startCell.x.toFixed(1)},${props.startCell.y.toFixed(1)}`:`${props.startCell.x+1},${props.startCell.y+1}`} · Goal: ${props.topology==='freeform'?`${props.goalCell.x.toFixed(1)},${props.goalCell.y.toFixed(1)}`:`${props.goalCell.x+1},${props.goalCell.y+1}`}`}</span>
              <label>Automatic placement
                <select name="endpoint-strategy" aria-label="Automatic endpoint placement" defaultValue="" onChange={e=>{if(e.target.value){props.onPlaceEndpoints(e.target.value as EndpointStrategy);e.target.value='';}}}>
                  <option value="" disabled>Choose a strategy…</option>
                  <option value="opposite">Opposite edges</option>
                  <option value="farthest">Farthest route</option>
                  <option value="random">Random cells</option>
                </select>
              </label>
            </div>
            <label>
              Start (emoji or empty):
              <div className="hstack" style={{ gap:8 }}>
                <input
                  type="text" name="start-marker"
                  aria-label="Start marker" maxLength={64}
                  value={startIcon?.startsWith("data:") ? "" : startIcon ?? ""}
                  onChange={(e) => setStartIcon(normalizeMarker(e.target.value))}
                  placeholder="🚀"
                  style={{ width:"6em", textAlign:"center" }}
                />
                <button
                  ref={startBtnRef}
                  className="btn btn-sm"
                  type="button"
                  onClick={() => setPicker(p => p === "start" ? null : "start")}
                  aria-expanded={picker==="start"}
                >
                  Pick emoji
                </button>
                <button className="btn btn-sm" type="button" aria-label="Clear start marker" onClick={() => setStartIcon(null)}>Clear</button>
              </div>
            </label>

            <label>
              Goal (emoji or empty):
              <div className="hstack" style={{ gap:8 }}>
                <input
                  type="text" name="goal-marker"
                  aria-label="Goal marker" maxLength={64}
                  value={goalIcon?.startsWith("data:") ? "" : goalIcon ?? ""}
                  onChange={(e) => setGoalIcon(normalizeMarker(e.target.value))}
                  placeholder="🏁"
                  style={{ width:"6em", textAlign:"center" }}
                />
                <button
                  ref={goalBtnRef}
                  className="btn btn-sm"
                  type="button"
                  onClick={() => setPicker(p => p === "goal" ? null : "goal")}
                  aria-expanded={picker==="goal"}
                >
                  Pick emoji
                </button>
                <button className="btn btn-sm" type="button" aria-label="Clear goal marker" onClick={() => setGoalIcon(null)}>Clear</button>
              </div>
            </label>

            <label>
              Or upload custom image (start):
              <input
                name="start-marker-image" type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => { void uploadMarker(e.target.files?.[0], setStartIcon); e.target.value = ""; }}
              />
            </label>

            <label>
              Or upload custom image (goal):
              <input
                name="goal-marker-image" type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => { void uploadMarker(e.target.files?.[0], setGoalIcon); e.target.value = ""; }}
              />
            </label>
          </div>
        </details>

        {/* Popovers (rendered at end of fieldset so z-index is sane) */}
        {picker === "start" && (
          <EmojiPicker
            onSelect={(e) => setStartIcon(e)}
            onClose={() => setPicker(null)}
            anchorRef={startBtnRef}
          />
        )}
        {picker === "goal" && (
          <EmojiPicker
            onSelect={(e) => setGoalIcon(e)}
            onClose={() => setPicker(null)}
            anchorRef={goalBtnRef}
          />
        )}
      </fieldset>
      </div>

      <div id="analyze-controls-panel" role="tabpanel" aria-labelledby="analyze-controls-tab" className="control-page" hidden={controlPage!=='analyze'} aria-label="Analysis controls">
      <fieldset>
        <legend>Animation</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
            Animation Algorithms
          </summary>
          <AnimationControls {...props.animation} />
        </details>
      </fieldset>

      <fieldset>
        <legend>Difficulty</legend>
        <details >
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Adjust difficulty</summary>

          <label>Goal bias g: {g.toFixed(2)}
            <input name="goal-bias" type="range" min={0} max={1} step={0.01} value={g} onChange={e=>setG(parseFloat(e.target.value))}/>
          </label>
          <label>Braid b: {b.toFixed(2)}
            <input name="braid-amount" type="range" min={0} max={0.5} step={0.01} value={b} onChange={e=>setB(parseFloat(e.target.value))}/>
          </label>
          <label>Braid strategy
            <select name="braid-strategy" value={props.braidMode} disabled={b===0} onChange={event=>props.setBraidMode(event.target.value as BraidMode)}>
              <option value="random">Random dead ends</option>
              <option value="difficulty">Difficulty-aware</option>
            </select>
          </label>
          <label>Turn penalty τ: {tau.toFixed(2)}
            <input name="turn-penalty" type="range" min={0} max={1} step={0.01} value={tau} onChange={e=>setTau(parseFloat(e.target.value))}/>
          </label>

          <label>Search budget
            <select name="difficulty-search-budget" value={props.difficultyBudget} disabled={props.searching} onChange={event=>props.setDifficultyBudget(Number(event.target.value) as DifficultySearchBudget)}>
              <option value={250}>Quick — 250 candidates</option>
              <option value={1000}>Standard — 1,000 candidates</option>
              <option value={10000}>Deep — 10,000 candidates</option>
            </select>
          </label>

          <div className="hstack" style={{ gap:8, marginTop:8 }}>
            <button className="btn btn-primary" type="button" onClick={props.searching?props.onCancelDifficulty:props.onMaxDifficulty}>
              {props.searching ? 'Stop search' : 'Max difficulty'}
            </button>
            <span style={{ fontSize:12, color:"#6b7280" }}>
              Deterministic V2 search for the current size, seed, shape, and generator.
            </span>
          </div>
          {props.difficultyProgress&&<div role="status" aria-live="polite" style={{fontSize:12,color:'#586174',marginTop:8}}>
            <div>Best: <strong>{props.difficultyProgress.bestScore}/100 — {props.difficultyProgress.bestLabel}</strong></div>
            <div>{props.searching?'Searching':'Finished'} — {props.difficultyProgress.completed.toLocaleString()} / {props.difficultyProgress.budget.toLocaleString()} candidates</div>
            <progress aria-label="Difficulty search progress" max={props.difficultyProgress.budget} value={props.difficultyProgress.completed} style={{width:'100%'}}/>
          </div>}
        </details>
      </fieldset>
      </div>

      <div className="grid-3">
        <button type="button" className="btn" onClick={onNew}>New Maze</button>
        <button type="button" className="btn" onClick={onPrint}>Print</button>
        <button type="button" className="btn btn-primary" onClick={onShare}>Share</button>
      </div>

      <div id="library-controls-panel" role="tabpanel" aria-labelledby="library-controls-tab" className="control-page" hidden={controlPage!=='library'} aria-label="Library controls"><MazeCollection saveName={saveName} setSaveName={setSaveName} saveFolder={props.saveFolder} setSaveFolder={props.setSaveFolder} saveTags={props.saveTags} setSaveTags={props.setSaveTags} saved={saved} selectedId={selectedId} onSave={onSave} onLoad={onLoad} onDelete={onDelete} onImport={props.onImportCollection} onPrintPack={props.onPrintPack}/></div>
    </aside>
  );
}

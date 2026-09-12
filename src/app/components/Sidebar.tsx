import { useEffect, useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker";

import type { SavedMaze } from "../state";
import { normalizeMarker } from "../maze";
import AnimationControls, { type AnimationControlsProps } from './AnimationControls';
import { MASKS, type MaskId } from '../../maze/masks';
import type { CustomMask } from '../../maze/masks';
import CustomMaskControls from './CustomMaskControls';
import type { EndpointStrategy } from '../../maze/endpoints';
import type { MazePoint, MazeTopology } from '../maze';
import type { WallStyle } from '../../maze/walls';
import GameplayControls from './GameplayControls';
import type { MazeGameState } from '../hooks/useMazeGame';
import MicromouseControls, { type MicromouseControlsProps } from './MicromouseControls';
import PlayHistory, { type PlayHistoryProps } from './PlayHistory';

type Props = {
  canInstall: boolean;
  onInstall: () => void;
  width: number; height: number; g: number; b: number; tau: number;
  topology:MazeTopology;setTopology:(value:MazeTopology)=>void;regionDensity:number;setRegionDensity:(value:number)=>void;irregularity:number;setIrregularity:(value:number)=>void;
  setWidth: (n:number)=>void; setHeight:(n:number)=>void; setG:(n:number)=>void; setB:(n:number)=>void; setTau:(n:number)=>void;
  onNew: () => void; onPrint: () => void;
  saveName: string; setSaveName: (s:string)=>void;
  saved: SavedMaze[]; selectedId: string|null;
  onSave: () => void; onLoad: (id:string)=>void; onDelete: (id:string)=>void;
  controlsOpen: boolean;
  onMinimize: () => void;
  lockSize: boolean;
  setLockSize: (v:boolean)=>void;
  mask:MaskId; setMask:(mask:MaskId)=>void; customMask?:CustomMask; setCustomMask:(mask:CustomMask)=>void;
  wallStyle:WallStyle;setWallStyle:(style:WallStyle)=>void;wallThickness:number;setWallThickness:(value:number)=>void;cornerRadius:number;setCornerRadius:(value:number)=>void;
  onMaxDifficulty: () => void;
  searching: boolean;
  startIcon: string | null;
  goalIcon: string | null;
  setStartIcon: (v: string | null) => void;
  setGoalIcon: (v: string | null) => void;
  startCell:MazePoint; goalCell:MazePoint; endpointMode:'start'|'goal'|null;
  setEndpointMode:(mode:'start'|'goal'|null)=>void; onPlaceEndpoints:(strategy:EndpointStrategy)=>void;
  gameplay:{active:boolean;state:MazeGameState;breadcrumbs:boolean;setBreadcrumbs:(value:boolean)=>void;start:()=>void;pause:()=>void;restart:()=>void};
  micromouse:MicromouseControlsProps;
  history:PlayHistoryProps;
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
  useEffect(() => { if (!controlsOpen) setPicker(null); }, [controlsOpen]);
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

  const hasSaved = saved.length > 0;

  return (
    <aside id="controls-panel" className="panel controls" style={{ display, flexDirection:"column", gap:16 }}>
      <div className="sticky-top hstack" style={{ justifyContent:"space-between", paddingBottom:8 }}>
        <h2 style={{ margin:0, fontSize:20 }}>Maze Controls</h2>
        <div className="hstack" style={{ gap:6 }}>
          {/* Minimize button shows when expanded */}
          <button className="btn btn-sm" title="Minimize controls" onClick={onMinimize}>Minimize</button>
          {canInstall && <button className="btn btn-sm" onClick={onInstall} title="Install app">Install</button>}
        </div>
      </div>

      <fieldset>
        <legend>Size</legend>
        <details>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Adjust size</summary>

          <label>Maze shape
            <select name="maze-shape" value={props.mask} onChange={e=>props.setMask(e.target.value as MaskId)}>
              {Object.values(MASKS).map(mask=><option key={mask.id} value={mask.id}>{mask.name}</option>)}
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

          <label>Width: {width}
            <input
              type="range" min={7} max={41} step={2}
              value={width}
              onChange={e=>props.setWidth(parseInt(e.target.value))}
            />
          </label>

          <label>Height: {height}
            <input
              type="range" min={7} max={41} step={2}
              value={height}
              onChange={e=>props.setHeight(parseInt(e.target.value))}
              disabled={props.lockSize}
            />
          </label>

          <label className="hstack" style={{ alignItems:"center", gap:8 }}>
            <input
              type="checkbox"
              checked={props.lockSize}
              onChange={(e)=>props.setLockSize(e.target.checked)}
            />
            <span>Lock width & height (square)</span>
          </label>
        </details>
      </fieldset>

      <fieldset>
        <legend>Gameplay</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Play maze</summary>
          <GameplayControls {...props.gameplay}/>
        </details>
      </fieldset>

      <fieldset>
        <legend>Micromouse</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Robot simulation</summary>
          <MicromouseControls {...props.micromouse}/>
        </details>
      </fieldset>

      <fieldset>
        <legend>History</legend>
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>Played mazes</summary>
          <PlayHistory {...props.history}/>
        </details>
      </fieldset>

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
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => { void uploadMarker(e.target.files?.[0], setStartIcon); e.target.value = ""; }}
              />
            </label>

            <label>
              Or upload custom image (goal):
              <input
                type="file"
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
            <input type="range" min={0} max={1} step={0.01} value={g} onChange={e=>setG(parseFloat(e.target.value))}/>
          </label>
          <label>Braid b: {b.toFixed(2)}
            <input type="range" min={0} max={0.5} step={0.01} value={b} onChange={e=>setB(parseFloat(e.target.value))}/>
          </label>
          <label>Turn penalty τ: {tau.toFixed(2)}
            <input type="range" min={0} max={1} step={0.01} value={tau} onChange={e=>setTau(parseFloat(e.target.value))}/>
          </label>

          <div className="hstack" style={{ gap:8, marginTop:8 }}>
            <button className="btn btn-primary" type="button" disabled={props.searching} onClick={props.onMaxDifficulty}>
              {props.searching ? 'Searching…' : 'Max difficulty'}
            </button>
            <span style={{ fontSize:12, color:"#6b7280" }}>
              (coarse sweep over g/b/τ for current size & seed)
            </span>
          </div>
        </details>
      </fieldset>

      <div className="grid-3">
        <button className="btn" onClick={onNew}>New Maze</button>
        <button className="btn" onClick={onPrint}>Print</button>
        <button className="btn btn-primary" onClick={onShare}>Share</button>
      </div>

      <fieldset>
        <legend>Save / Load</legend>
        <div className="stack">
          <input className="input" name="maze-name" aria-label="Maze name" maxLength={200} placeholder="Name this maze…" value={saveName} onChange={e=>setSaveName(e.target.value)}/>
          <button className="btn btn-primary" onClick={onSave}>Save current</button>
        </div>

        {hasSaved ? (
          <div style={{ marginTop:12, display:"grid", gap:6, maxHeight:220, overflow:"auto" }}>
            { saved.map(sv => (
              <div key={sv.id} className="hstack" style={{ border:"1px solid #e6e9ef", borderRadius:10, padding:8, justifyContent:"space-between", background: sv.id===selectedId ? "#f0f6ff" : "#fafbff" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{sv.name}</div>
                  <div style={{ fontSize:12, color:"#586174" }}>
                    {sv.params.width}×{sv.params.height}, seed {sv.params.seed}, g {sv.params.g.toFixed(2)}, b {sv.params.b.toFixed(2)}, τ {sv.params.tau.toFixed(2)}
                  </div>
                </div>
                <div className="hstack" style={{ gap:6 }}>
                  <button className="btn btn-sm" onClick={()=>onLoad(sv.id)}>Load</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>onDelete(sv.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize:12, color:"#7a879b" }}>No saved mazes yet.</div>}
      </fieldset>
    </aside>
  );
}

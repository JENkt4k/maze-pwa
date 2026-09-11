import { useEffect, useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker";

import type { SavedMaze } from "../state";
import { normalizeMarker } from "../maze";
import AnimationControls, { type AnimationControlsProps } from './AnimationControls';

type Props = {
  canInstall: boolean;
  onInstall: () => void;
  width: number; height: number; g: number; b: number; tau: number;
  setWidth: (n:number)=>void; setHeight:(n:number)=>void; setG:(n:number)=>void; setB:(n:number)=>void; setTau:(n:number)=>void;
  onNew: () => void; onPrint: () => void;
  saveName: string; setSaveName: (s:string)=>void;
  saved: SavedMaze[]; selectedId: string|null;
  onSave: () => void; onLoad: (id:string)=>void; onDelete: (id:string)=>void;
  controlsOpen: boolean;
  onMinimize: () => void;
  lockSize: boolean;
  setLockSize: (v:boolean)=>void;
  onMaxDifficulty: () => void;
  searching: boolean;
  startIcon: string | null;
  goalIcon: string | null;
  setStartIcon: (v: string | null) => void;
  setGoalIcon: (v: string | null) => void;
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

      {/* Markers */}
      <fieldset>
        <legend>Markers</legend>
        {uploadError && <p role="alert">{uploadError}</p>}
        <details open>
          <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
            Choose Start & Goal
          </summary>

          <div style={{ display:"grid", gap:12 }}>
            <label>
              Start (emoji or empty):
              <div className="hstack" style={{ gap:8 }}>
                <input
                  type="text"
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
                  type="text"
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
          <input className="input" aria-label="Maze name" maxLength={200} placeholder="Name this maze…" value={saveName} onChange={e=>setSaveName(e.target.value)}/>
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

import React, { useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker"; 

type SavedMaze = {
  id: string;
  name: string;
  params: { width:number;height:number;seed:number;g:number;b:number;tau:number };
  createdAt: number;
};

type Props = {
  canInstall: boolean;
  onInstall: () => void;
  width: number; height: number; g: number; b: number; tau: number;
  setWidth: (n:number)=>void; setHeight:(n:number)=>void; setG:(n:number)=>void; setB:(n:number)=>void; setTau:(n:number)=>void;
  onNew: () => void; onPrint: () => void;
  saveName: string; setSaveName: (s:string)=>void;
  saved: SavedMaze[]; selectedId: string|null;
  onSave: () => void; onLoad: (id:string)=>void; onDelete: (id:string)=>void;
  isMobile: boolean;
  controlsOpen: boolean;
  onMinimize: () => void;     // << minimize button
  lockSize: boolean;                 // ← NEW
  setLockSize: (v:boolean)=>void;    // ← NEW
  onMaxDifficulty: () => void;       // ← NEW
  startIcon: string | null;
  goalIcon: string | null;
  setStartIcon: (v: string | null) => void;
  setGoalIcon: (v: string | null) => void;
  animateDFS: boolean;
  setAnimateDFS: (v:boolean)=>void;
  dfsSegMs: number;
  setDfsSegMs: (n:number)=>void;
};

export default function Sidebar(props: Props){
  const {
    canInstall, onInstall,
    width, height, g, b, tau,
    setWidth, setHeight, setG, setB, setTau,
    onNew, onPrint,
    saveName, setSaveName, saved = [], selectedId, onSave, onLoad, onDelete,
    isMobile, controlsOpen, onMinimize,
    startIcon, goalIcon, setStartIcon, setGoalIcon,
    animateDFS, setAnimateDFS,
    dfsSegMs, setDfsSegMs,
  } = props;

  const [picker, setPicker] = useState<null | "start" | "goal">(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const goalBtnRef  = useRef<HTMLButtonElement | null>(null);

  const display = props.isMobile ? (props.controlsOpen ? "flex" : "none") : "flex";

  const hasSaved = saved.length > 0;

  // const display = isMobile ? (controlsOpen ? "flex" : "none") : "flex";

  return (
    <aside className="panel controls" style={{ display, flexDirection:"column", gap:16 }}>
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
                  value={startIcon ?? ""}
                  onChange={(e) => setStartIcon(e.target.value || null)}
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
              </div>
            </label>

            <label>
              Goal (emoji or empty):
              <div className="hstack" style={{ gap:8 }}>
                <input
                  type="text"
                  value={goalIcon ?? ""}
                  onChange={(e) => setGoalIcon(e.target.value || null)}
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
              </div>
            </label>

            <label>
              Or upload custom image (start):
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setStartIcon(reader.result as string); // data URL
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            <label>
              Or upload custom image (goal):
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setGoalIcon(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        </details>
        
        <fieldset>
          <legend>Animation</legend>
          <details open>
            <summary style={{ cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
              Classic DFS build
            </summary>

            <label className="hstack" style={{ alignItems:"center", gap:8 }}>
              <input
                type="checkbox"
                checked={animateDFS}
                onChange={(e)=>setAnimateDFS(e.target.checked)}
              />
              <span>Animate build (DFS carve order)</span>
            </label>

            <label>
              Segment speed: {dfsSegMs} ms / edge
              <input
                type="range" min={10} max={150} step={5}
                value={dfsSegMs}
                onChange={(e)=>setDfsSegMs(parseInt(e.target.value))}
                disabled={!animateDFS}
              />
            </label>
          </details>
        </fieldset>


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
        <legend>Difficulty</legend>
        <details open>
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
            <button className="btn btn-primary" type="button" onClick={props.onMaxDifficulty}>
              Max difficulty
            </button>
            <span style={{ fontSize:12, color:"#6b7280" }}>
              (coarse sweep over g/b/τ for current size & seed)
            </span>
          </div>
        </details>
      </fieldset>


      <div className="grid-2">
        <button className="btn" onClick={onNew}>New Maze</button>
        <button className="btn" onClick={onPrint}>Print</button>
      </div>

      <fieldset>
        <legend>Save / Load</legend>
        <div className="stack">
          <input className="input" placeholder="Name this maze…" value={saveName} onChange={e=>setSaveName(e.target.value)}/>
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

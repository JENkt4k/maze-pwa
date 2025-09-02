import React, { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { createMaze, toSVG } from "./maze";

/* ─────────────────────────── Types & Storage ─────────────────────────── */

type SavedMaze = {
  id: string;
  name: string;
  params: { width: number; height: number; seed: number; g: number; b: number; tau: number };
  createdAt: number;
};

const STORAGE_KEY = "savedMazes:v1";

function loadSaved(): SavedMaze[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedMaze[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveAll(list: SavedMaze[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ───────────────────────────── Utilities ─────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [rect, setRect] = useState<DOMRectReadOnly | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setRect(entry.contentRect));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, rect };
}

function usePWAInstall() {
  const [deferred, setDeferred] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const onBip = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);
  async function install() {
    if (!deferred) return;
    setCanInstall(false);
    await deferred.prompt();
    setDeferred(null);
  }
  return { canInstall, install };
}

/* ───────────────────────────── Components ────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#3c4557" }}>{children}</label>;
}
function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}
const fs: React.CSSProperties = { border: "1px solid #e6e9ef", borderRadius: 12, padding: 12 };
const lg: React.CSSProperties = { fontSize: 12, color: "#3c4557", padding: "0 6px" };
const btn: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #d1d7e0",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  minHeight: 44,
};
const btnPrimary: React.CSSProperties = { ...btn, background: "linear-gradient(180deg,#4f9cff,#357cf6)", color: "#fff", border: "none" };
const btnSm: React.CSSProperties = { ...btn, padding: "8px 10px", fontSize: 12 };
const btnDangerSm: React.CSSProperties = { ...btnSm, background: "linear-gradient(180deg,#ff6b6b,#e35151)", color: "#fff", border: "none" };
const inp: React.CSSProperties = { border: "1px solid #d1d7e0", borderRadius: 10, padding: "10px 12px", fontSize: 14, minHeight: 44 };

function PWABanner({
  offlineReady,
  needRefresh,
  onUpdate,
  onClose,
}: {
  offlineReady: boolean;
  needRefresh: boolean;
  onUpdate: () => void;
  onClose: () => void;
}) {
  if (!offlineReady && !needRefresh) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        background: "#111827",
        color: "#fff",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 12px 30px rgba(0,0,0,.25)",
      }}
    >
      <span>{offlineReady ? "App is ready to work offline." : "A new version is available."}</span>
      <div style={{ display: "flex", gap: 8 }}>
        {needRefresh && (
          <button onClick={onUpdate} style={{ ...btn, border: "none", background: "#34d399", color: "#111" }}>
            Update
          </button>
        )}
        <button onClick={onClose} style={{ ...btn, border: "1px solid #374151", background: "transparent", color: "#fff" }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────── App ───────────────────────────────── */

export default function App() {
  /* PWA (no React hook wrapper to avoid extra React copies) */
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

  /* Maze parameters */
  const [seed, setSeed] = useState(42);
  const [width, setWidth] = useState(19);
  const [height, setHeight] = useState(19);
  const [g, setG] = useState(0.3);
  const [b, setB] = useState(0.15);
  const [tau, setTau] = useState(0.4);

  /* Saved mazes */
  const [saved, setSaved] = useState<SavedMaze[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  useEffect(() => setSaved(loadSaved()), []);

  /* Responsive cell size based on available width (with fallback) */
  const { ref: svgHostRef, rect: hostRect } = useResizeObserver<HTMLDivElement>();
  const [cell, setCell] = useState(24);
  useEffect(() => {
    const hostW = hostRect?.width ?? 0;
    const basis = hostW > 0 ? hostW : Math.min(window.innerWidth || 360, 480);
    const targetInner = basis - 32;
    const px = Math.floor(targetInner / width);
    setCell(clamp(px, 18, 36));
  }, [hostRect, width]);

  /* Generate maze + SVG + stats */
  const { svg, stats, currentParams } = useMemo(() => {
    const params = { width, height, seed, g, b, tau };
    const { maze, stats } = createMaze(params);
    const svg = toSVG(maze, {
      cell,
      stroke: Math.max(2, Math.round(cell / 8)),
      margin: Math.round(cell / 2),
      showStartGoal: true,
      startIcon: "🚀",
      goalIcon: "🏁",
      iconScale: 0.7,
    });
    return { svg, stats, currentParams: params };
  }, [width, height, seed, g, b, tau, cell]);

  /* Controls panel: responsive placement + collapsed on mobile */
  const [isMobile, setIsMobile] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const set = () => {
      setIsMobile(mq.matches);
      setControlsOpen(!mq.matches); // open on desktop, collapsed on mobile
    };
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  function newMaze() {
    setSeed((s) => s + 1);
  }
  function handleSave() {
    const name = saveName.trim() || `Maze ${saved.length + 1}`;
    const entry: SavedMaze = { id: uid(), name, params: { ...currentParams }, createdAt: Date.now() };
    const next = [entry, ...saved];
    setSaved(next);
    saveAll(next);
    setSaveName("");
    setSelectedId(entry.id);
  }
  function handleLoad(id: string) {
    const item = saved.find((s) => s.id === id);
    if (!item) return;
    const p = item.params;
    setWidth(p.width);
    setHeight(p.height);
    setSeed(p.seed);
    setG(p.g);
    setB(p.b);
    setTau(p.tau);
    setSelectedId(id);
  }
  function handleDelete(id: string) {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    saveAll(next);
    if (selectedId === id) setSelectedId(null);
  }
  function handlePrint() {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Maze Print</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  .wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
  svg { width: 95vw; height: auto; max-height: 95vh; }
  @page { margin: 10mm; }
  @media print { .wrap { padding: 0; } }
</style>
</head>
<body>
  <div class="wrap">${svg}</div>
  <script>
    window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 0); });
    window.addEventListener('afterprint', () => { window.close(); });
  </script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!win) return;
    const cleanup = () => URL.revokeObjectURL(url);
    win.addEventListener?.("load", cleanup);
    setTimeout(cleanup, 10000);
  }

  return (
    <div
      className="shell"
      style={{
        minHeight: "100vh",
        display: "grid",
        gap: 12,
        padding: "12px 12px calc(12px + var(--safe-bottom, 0px))",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background: "linear-gradient(180deg,#f6f7fb,#eef1f6)",
      }}
    >
      <style>
        {`
        /* Desktop: main | controls (right) */
        .shell { grid-template-columns: 1fr minmax(0, 360px); }
        .main { order: 1; }
        .controls { order: 2; }

        /* Mobile: single column; controls below main, collapsed by default */
        @media (max-width: 840px) {
          .shell { grid-template-columns: 1fr; }
          .main { order: 1; }
          .controls { order: 2; }
        }

        button { min-height: 44px; }
        input[type="range"] { width: 100%; touch-action: none; height: 28px; }
        #print-maze-only svg { max-width: 100%; height: auto; display: block; }
        .sticky-top { position: sticky; top: calc(8px + var(--safe-top, 0px)); z-index: 10; background: #fff; }
      `}
      </style>

      {/* MAIN (first on all sizes) */}
      <main
        className="main"
        style={{
          minWidth: 0,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          padding: 16,
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: 12,
        }}
      >
        <header
          className="sticky-top"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Kid-Friendly Maze</h1>
            <div style={{ color: "#6b7280", fontSize: 12 }}>seed {seed}</div>
          </div>

          {/* Controls toggle (visible on mobile; harmless on desktop) */}
          <button
            onClick={() => setControlsOpen((v) => !v)}
            style={{ ...btn, padding: "8px 12px" }}
            aria-expanded={controlsOpen}
            aria-controls="controls-panel"
            title="Show/Hide Controls"
          >
            {controlsOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 16 }}>
          <div
            ref={svgHostRef as any}
            id="print-maze-only"
            style={{ width: "100%" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div style={{ border: "1px solid #e6e9ef", borderRadius: 12, padding: 12, minWidth: 220, background: "#f9fbff" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Stats</div>
            <Stat label="Length L" value={stats.L} />
            <Stat label="Turn rate T" value={stats.T.toFixed(2)} />
            <Stat label="Junctions J" value={stats.J} />
            <Stat label="Dead ends E" value={stats.E} />
            <div style={{ height: 1, background: "#e6e9ef", margin: "8px 0" }} />
            <Stat label="Difficulty D" value={stats.D.toFixed(3)} strong />
          </div>
        </section>
      </main>

      {/* CONTROLS (right on desktop, below on mobile) */}
      <aside
        id="controls-panel"
        className="controls"
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          padding: 16,
          display: isMobile ? (controlsOpen ? "flex" : "none") : "flex", // collapse only on mobile
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="sticky-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Maze Controls</h2>
          {canInstall && (
            <button style={btnSm} onClick={install} title="Install app">
              Install
            </button>
          )}
        </div>

        <fieldset style={fs}>
          <legend style={lg}>Size</legend>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600, padding: "6px 0" }}>Adjust size</summary>
            <Label>
              Width: {width}
              <input type="range" min={7} max={41} step={2} value={width} onChange={(e) => setWidth(parseInt(e.target.value))} />
            </Label>
            <Label>
              Height: {height}
              <input type="range" min={7} max={41} step={2} value={height} onChange={(e) => setHeight(parseInt(e.target.value))} />
            </Label>
          </details>
        </fieldset>

        <fieldset style={fs}>
          <legend style={lg}>Difficulty</legend>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600, padding: "6px 0" }}>Adjust difficulty</summary>
            <Label>
              Goal bias g: {g.toFixed(2)}
              <input type="range" min={0} max={1} step={0.01} value={g} onChange={(e) => setG(parseFloat(e.target.value))} />
            </Label>
            <Label>
              Braid b: {b.toFixed(2)}
              <input type="range" min={0} max={0.5} step={0.01} value={b} onChange={(e) => setB(parseFloat(e.target.value))} />
            </Label>
            <Label>
              Turn penalty τ: {tau.toFixed(2)}
              <input type="range" min={0} max={1} step={0.01} value={tau} onChange={(e) => setTau(parseFloat(e.target.value))} />
            </Label>
          </details>
        </fieldset>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button style={btn} onClick={newMaze}>New Maze</button>
          <button style={btn} onClick={handlePrint}>Print</button>
        </div>

        <fieldset style={fs}>
          <legend style={lg}>Save / Load</legend>
          <div style={{ display: "grid", gap: 8 }}>
            <input placeholder="Name this maze…" value={saveName} onChange={(e) => setSaveName(e.target.value)} style={inp} />
            <button style={btnPrimary} onClick={handleSave}>Save current</button>
          </div>
          {saved.length > 0 ? (
            <div style={{ marginTop: 12, display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {saved.map((sv) => (
                <div
                  key={sv.id}
                  style={{
                    border: "1px solid #e6e9ef",
                    borderRadius: 10,
                    padding: 8,
                    background: sv.id === selectedId ? "#f0f6ff" : "#fafbff",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{sv.name}</div>
                    <div style={{ fontSize: 12, color: "#586174" }}>
                      {sv.params.width}×{sv.params.height}, seed {sv.params.seed}, g {sv.params.g.toFixed(2)}, b {sv.params.b.toFixed(2)}, τ {sv.params.tau.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={btnSm} onClick={() => handleLoad(sv.id)}>Load</button>
                    <button style={btnDangerSm} onClick={() => handleDelete(sv.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#7a879b" }}>No saved mazes yet.</div>
          )}
        </fieldset>
      </aside>

      {/* Mobile gear FAB to open controls quickly */}
      {isMobile && !controlsOpen && (
        <button
          aria-label="Show controls"
          onClick={() => setControlsOpen(true)}
          style={{
            position: "fixed",
            right: 16,
            bottom: `calc(16px + var(--safe-bottom, 0px))`,
            zIndex: 60,
            borderRadius: 999,
            padding: "12px 14px",
            ...btnPrimary,
          }}
          title="Show Controls"
        >
          ⚙️
        </button>
      )}

      {/* Update/Offline banner */}
      <PWABanner
        offlineReady={offlineReady}
        needRefresh={needRefresh}
        onUpdate={() => updateSWRef.current?.(true)}
        onClose={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      />
    </div>
  );
}

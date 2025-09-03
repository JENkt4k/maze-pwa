import React, { useEffect, useRef, useState, useLayoutEffect } from "react";

type Props = { hostRef: React.RefObject<HTMLDivElement | null> };
type Mode = "draw" | "erase";


export default function DrawingCanvas({ hostRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pen, setPen] = useState<number>(5);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Size canvas to host (and DPR)
  useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver(() => {
      const rect = hostRef.current!.getBoundingClientRect();
      setSize({ w: Math.max(1, rect.width | 0), h: Math.max(1, rect.height | 0) });
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [hostRef]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    cv.style.width = `${size.w}px`;
    cv.style.height = `${size.h}px`;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [size]);

  // In DrawingCanvas.tsx
  const barRef = useRef<HTMLDivElement|null>(null);
  useLayoutEffect(() => {
    const el = hostRef.current?.parentElement; // .draw-wrap
    const bar = barRef.current;
    if (!el || !bar) return;
    const h = Math.ceil(bar.getBoundingClientRect().height) + 12; // +top gap
    el.style.paddingTop = `${h}px`;
  }, []);

  const getPt = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getPt(e);
    stroke(e);
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    stroke(e);
  }
  function pointerUp() {
    drawing.current = false;
    last.current = null;
  }

  function stroke(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPt(e);
    const prev = last.current ?? p;

    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ef4444";
    }

    ctx.lineWidth = pen;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    last.current = p;
  }

  function clearAll() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
  }

  return (
    <>
      {/* Absolute canvas overlay (interactive) */}
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
      {/* Toolbar as a separate absolutely positioned sibling (clickable) */}
      <div ref={barRef} className="draw-toolbar">
        <button type="button"
          className={`btn btn-sm ${mode === "draw" ? "btn-primary" : ""}`}
          onClick={() => setMode("draw")}
          aria-pressed={mode === "draw"}
          aria-label="Draw mode"
          title="Draw"
        >
          ✍️
        </button>
        <button type="button"
          className={`btn btn-sm ${mode === "erase" ? "btn-primary" : ""}`}
          onClick={() => setMode("erase")}
          aria-pressed={mode === "erase"}
          aria-label="Erase mode"
          title="Erase"
        >
          🧽
        </button>
        <label className="hstack" style={{ gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Pen</span>
          <input type="range" min={2} max={24} step={1} value={pen}
                 onChange={(e) => setPen(parseInt(e.target.value))} />
        </label>
        <button type="button" className="btn btn-sm" onClick={clearAll} aria-label="Clear path">Clear</button>
      </div>
    </>
  );
}

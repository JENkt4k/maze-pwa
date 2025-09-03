import React, { useEffect, useRef, useState } from "react";

type Props = {
  /** The container that holds your SVG (we will size the canvas to this) */
  hostRef: React.RefObject<HTMLDivElement | null>;
};

type Mode = "draw" | "erase";

export default function DrawingCanvas({ hostRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pen, setPen] = useState<number>(5); // stroke width in CSS px
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Size the canvas to match host size (and DPR)
  useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver(() => {
      const el = hostRef.current!;
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) });
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [hostRef]);

  // Apply pixel ratio scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [size.w, size.h]);

  // Map pointer to canvas-local coordinates
  function getPt(e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getPt(e);
    stroke(e); // dot
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    stroke(e);
  }
  function pointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    last.current = null;
  }

  function stroke(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPt(e);
    const prev = last.current ?? p;

    // Set composite op based on mode
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ef4444"; // red path; tweak if you want
    }

    ctx.lineWidth = pen;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    last.current = p;
  }

  function clearAll() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  return (
    <div className="draw-overlay">
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
      {/* Small toolbar over the maze, non-printing */}
      <div className="draw-toolbar">
        <button type="button"
          className={`btn btn-sm ${mode === "draw" ? "btn-primary" : ""}`}
          onClick={() => setMode("draw")}
          aria-pressed={mode === "draw"}
        >
          ✍️ Draw
        </button>
        <button type="button"
          className={`btn btn-sm ${mode === "erase" ? "btn-primary" : ""}`}
          onClick={() => setMode("erase")}
          aria-pressed={mode === "erase"}
        >
          🧽 Erase
        </button>
        <label className="hstack" style={{ gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Pen</span>
          <input
            type="range" min={2} max={24} step={1}
            value={pen}
            onChange={(e) => setPen(parseInt(e.target.value))}
          />
        </label>
        <button type="button" className="btn btn-sm" onClick={clearAll}>Clear</button>
      </div>
    </div>
  );
}

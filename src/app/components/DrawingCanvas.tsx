import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";

type Point = { x: number; y: number };
type Stroke = { mode: "draw" | "erase"; width: number; points: Point[] };
type Props = { hostRef: RefObject<HTMLDivElement>; mazeKey: string; disabled?:boolean;playActive?:boolean;onPlay?:()=>void;onExitPlay?:()=>void };

export default function DrawingCanvas({ hostRef, mazeKey, disabled=false,playActive=false,onPlay,onExitPlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"draw" | "erase" | "scroll">("draw");
  const [pen, setPen] = useState(5);
  const strokes = useRef<Stroke[]>([]);
  const activePointer = useRef<number | null>(null);
  const size = useRef({ width: 1, height: 1 });

  function repaint() {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const { width, height } = size.current;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes.current) {
      ctx.globalCompositeOperation = stroke.mode === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = ctx.fillStyle = "#ef4444";
      ctx.lineWidth = stroke.width * width;
      const first = stroke.points[0];
      ctx.beginPath();
      if (stroke.points.length === 1) {
        ctx.arc(first.x * width, first.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(first.x * width, first.y * height);
        for (const point of stroke.points.slice(1)) ctx.lineTo(point.x * width, point.y * height);
        ctx.stroke();
      }
    }
  }

  useLayoutEffect(() => { setHost(hostRef.current); }, [hostRef]);
  useLayoutEffect(() => {
    if (!host) return;
    const resize = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      const rect = host.getBoundingClientRect();
      size.current = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      cv.width = Math.round(size.current.width * dpr);
      cv.height = Math.round(size.current.height * dpr);
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      repaint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("resize", resize);
    resize();
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [host]);

  useLayoutEffect(() => {
    strokes.current = [];
    activePointer.current = null;
    repaint();
  }, [mazeKey]);

  const point = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  function down(event: PointerEvent<HTMLCanvasElement>) {
    if (mode === "scroll" || activePointer.current !== null || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    strokes.current.push({ mode, width: pen / size.current.width, points: [point(event)] });
    repaint();
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    strokes.current[strokes.current.length - 1]?.points.push(point(event));
    repaint();
  }
  function up(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current === event.pointerId) activePointer.current = null;
  }

  return <>
    {host && createPortal(<canvas ref={canvasRef} className="draw-canvas" aria-label="Draw a path on the maze"
      style={{ pointerEvents: disabled||mode === "scroll" ? "none" : "auto" }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} />, host)}
    <div className="draw-toolbar" role="group" aria-label="Drawing tools">
      <button type="button" className={`btn btn-sm${playActive?' btn-primary':''}`} aria-pressed={playActive} onClick={onPlay}>Play</button>
      {(["draw", "erase", "scroll"] as const).map(value => <button key={value} type="button"
        className={`btn btn-sm${!playActive&&mode === value ? " btn-primary" : ""}`} aria-pressed={!playActive&&mode === value}
        onClick={() => { activePointer.current = null;onExitPlay?.();setMode(value); }}>{value === "draw" ? "Draw" : value === "erase" ? "Erase" : "Scroll"}</button>)}
      <label className="hstack">Pen<input type="range" min={2} max={24} step={1} value={pen}
        onChange={event => setPen(Number(event.target.value))} /></label>
      <button type="button" className="btn btn-sm" onClick={() => { strokes.current = []; activePointer.current = null; repaint(); }}>Clear</button>
    </div>
  </>;
}

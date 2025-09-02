import { useEffect, useRef, useState } from "react";

export function useResizeObserver<T extends HTMLElement>() {
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

import React, { useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";

const LazyPicker = React.lazy(async () => {
  const [component, data] = await Promise.all([import("@emoji-mart/react"), import("@emoji-mart/data")]);
  const Picker = (props: { onEmojiSelect: (emoji: { native?: string }) => void }) =>
    <component.default data={data.default} {...props} theme="light" previewPosition="none" skinTonePosition="search" />;
  return { default: Picker };
});

type Props = { onSelect: (emoji: string) => void; onClose: () => void; anchorRef: React.RefObject<HTMLElement> };

export default function EmojiPicker({ onSelect, onClose, anchorRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const position = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const bounds = root.getBoundingClientRect();
      const left = Math.max(8, Math.min(anchor?.left ?? 8, window.innerWidth - bounds.width - 8));
      const below = (anchor?.bottom ?? 8) + 6;
      const top = Math.max(8, Math.min(below + bounds.height <= window.innerHeight - 8 ? below : (anchor?.top ?? below) - bounds.height - 6, window.innerHeight - bounds.height - 8));
      root.style.left = `${left}px`;
      root.style.top = `${top}px`;
    };
    const observer = new ResizeObserver(position);
    observer.observe(root);
    position();
    root.focus();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [anchorRef]);

  useEffect(() => {
    const anchor = anchorRef.current;
    function outside(event: globalThis.PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !anchor?.contains(target)) onClose();
    }
    function key(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); onClose(); anchor?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [onClose, anchorRef]);

  return createPortal(<div ref={rootRef} className="emoji-popover" role="dialog" aria-label="Emoji picker" tabIndex={-1}>
    <button className="btn btn-sm" type="button" onClick={() => { onClose(); anchorRef.current?.focus(); }}>Close emoji picker</button>
    <Suspense fallback={<div role="status">Loading emojis…</div>}>
      <LazyPicker onEmojiSelect={emoji => { onSelect(emoji.native ?? ""); onClose(); anchorRef.current?.focus(); }} />
    </Suspense>
  </div>, document.body);
}

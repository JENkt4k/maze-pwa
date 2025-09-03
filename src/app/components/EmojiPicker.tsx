// src/app/components/EmojiPicker.tsx
import React, { useEffect, useRef, useState, Suspense } from "react";

// Lazy import to keep initial bundle small
const LazyPicker = React.lazy(async () => {
  const [modReact, data] = await Promise.all([
    import("@emoji-mart/react"),
    import("@emoji-mart/data"),
  ]);
  // Re-export as a default component that already has data bound
  const Picker = (props: any) => <modReact.default data={data.default} {...props} />;
  return { default: Picker };
});

type Props = {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export default function EmojiPicker({ onSelect, onClose, anchorRef }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Position near anchor
  useEffect(() => {
    setMounted(true);
    const root = rootRef.current;
    const anchor = anchorRef?.current;
    if (!root) return;
    const r = anchor?.getBoundingClientRect();
    if (r) {
      const top = Math.max(8, r.bottom + 6 + window.scrollY);
      const left = Math.max(8, r.left + window.scrollX);
      root.style.top = `${top}px`;
      root.style.left = `${left}px`;
    } else {
      root.style.top = `80px`;
      root.style.left = `16px`;
    }
  }, [anchorRef]);

  // Close on outside click / ESC
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onClose?.();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [onClose]);

  if (!mounted) return null;

  return (
    <div ref={rootRef} className="emoji-popover" role="dialog" aria-label="Emoji picker">
      <Suspense fallback={<div style={{ padding: 12 }}>Loading emojis…</div>}>
        <LazyPicker
          onEmojiSelect={(e: any) => { onSelect(e?.native ?? ""); onClose?.(); }}
          theme="light"
          dynamicWidth
          previewPosition="none"
          skinTonePosition="search"
        />
      </Suspense>
    </div>
  );
}

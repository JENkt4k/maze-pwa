import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

const EMOJI_SETS: Record<string, string[]> = {
  Popular: ["🚀","🏁","⭐","🔥","🎯","💎","🧩","🧭","🗺️","🟢","🔴","🟦","⬜","⬛","🐭","🦊","🐱","🐶","🐸","🐢"],
  Arrows:  ["⬆️","➡️","⬇️","⬅️","↗️","↘️","↙️","↖️","🔁","🔄","🔃"],
  Symbols:["⭕","❌","✅","⚠️","⭐","🌟","✨","❇️","💠","🔶","🔷","🔺","🔻"],
  Flags:   ["🏁","🚩","🎌","🏳️","🏴","🏳️‍🌈"],
};

const FLAT = Object.values(EMOJI_SETS).flat();

export default function EmojiPicker({ onSelect, onClose, anchorRef }: Props) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  // position near anchor (fallback to top-left)
  useEffect(() => {
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

  // outside click to close
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
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return FLAT;
    // naive filter: if query is emoji or short text, include all (fallback)
    // You can expand to a real name-index if you wish.
    return FLAT.filter(e => e.includes(q));
  }, [query]);

  return (
    <div ref={rootRef} className="emoji-popover" role="dialog" aria-label="Emoji picker">
      <div className="emoji-row">
        <input
          className="input"
          placeholder="Search emoji…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button className="btn" onClick={onClose} type="button">Close</button>
      </div>

      <div className="emoji-grid" role="listbox" aria-label="Emoji results">
        {results.map((e, i) => (
          <button
            key={i}
            type="button"
            className="emoji-cell"
            onClick={() => { onSelect(e); onClose?.(); }}
            aria-label={`Choose ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Quick groups */}
      <div className="emoji-groups">
        {Object.keys(EMOJI_SETS).map((k) => (
          <button key={k} className="btn btn-sm" type="button" onClick={() => setQuery("")}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

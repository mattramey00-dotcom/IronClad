// ============================================================
//  IRONCLAD — a one-line "how this works" hint
// ============================================================
//  A quiet, dismissable tip that teaches a screen the first time you land on
//  it. Tapping the × remembers the dismissal for good (per hint id), so it
//  guides a newcomer once and never nags the person who already knows.
// ============================================================

import React, { useState } from "react";
import { ACCENT } from "../data/program.js";
import Icon from "./Icon.jsx";

const key = (id) => `ironclad:hint:${id}`;

export default function Hint({ id, children }) {
  const [gone, setGone] = useState(() => {
    try { return localStorage.getItem(key(id)) === "1"; } catch { return false; }
  });
  if (gone) return null;

  const dismiss = () => {
    try { localStorage.setItem(key(id), "1"); } catch { /* private mode — just hide for the session */ }
    setGone(true);
  };

  return (
    <div style={ST.hint}>
      <span style={ST.icon}><Icon name="sparkle" size={13} /></span>
      <div style={ST.text}>{children}</div>
      <button style={ST.x} onClick={dismiss} aria-label="Got it, hide this tip">
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}

const ST = {
  hint: {
    display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px",
    background: "rgba(129,140,248,.08)", border: "1px solid rgba(129,140,248,.22)",
    borderRadius: 12, marginBottom: 14, animation: "fade .3s ease",
  },
  icon: { color: ACCENT, flex: "0 0 auto", marginTop: 1, display: "grid", placeItems: "center" },
  text: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)" },
  x: {
    flex: "0 0 auto", background: "transparent", border: "none", color: "var(--text-dim)",
    cursor: "pointer", padding: 2, display: "grid", placeItems: "center", fontFamily: "inherit",
  },
};

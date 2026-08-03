// ============================================================
//  IRONCLAD — "update available" banner
// ============================================================
//  Appears at the top of the app when a newer build has finished installing in
//  the background. Tapping Reload swaps to the new version in one step instead of
//  leaving the user on a stale, cached copy. Dismiss hides it for this session;
//  the next launch picks up the new build regardless.
// ============================================================

import React, { useEffect, useState } from "react";
import { ACCENT } from "../data/program.js";
import Icon from "./Icon.jsx";
import { onUpdateReady, applyUpdate } from "../lib/swUpdate.js";

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => onUpdateReady(() => setReady(true)), []);

  if (!ready || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
        display: "flex", alignItems: "center", gap: 10,
        padding: "calc(10px + env(safe-area-inset-top)) 14px 10px",
        background: "rgba(129,140,248,.16)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        borderBottom: `1px solid ${ACCENT}`, boxShadow: "0 8px 24px -12px rgba(0,0,0,.6)",
        animation: "fade .2s ease",
      }}
    >
      <span style={{ color: ACCENT, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <Icon name="download" size={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.35 }}>
        A new version of IRONCLAD is ready.
      </span>
      <button
        onClick={() => { setReloading(true); applyUpdate(); }}
        style={{
          flex: "0 0 auto", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
          background: ACCENT, color: "#0B1020", border: "none", borderRadius: 9, padding: "8px 14px",
          opacity: reloading ? 0.7 : 1,
        }}
      >
        {reloading ? "Reloading…" : "Reload"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ flex: "0 0 auto", width: 32, height: 32, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "grid", placeItems: "center" }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

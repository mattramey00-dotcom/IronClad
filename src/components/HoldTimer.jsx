// ============================================================
//  IRONCLAD — the hold stopwatch (planks & isometrics)
// ============================================================
//  A rep counts itself; a hold doesn't. For a plank or an isometric the honest
//  unit is seconds, so these exercises get a stopwatch instead of a weight×reps
//  box. It counts up (hold as long as you can), blips and buzzes the moment you
//  cross the prescribed time so you don't have to watch the number, and stopping
//  it checks the set off. Beating last week's time is the progression here.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { ACCENT } from "../data/program.js";
import Icon from "./Icon.jsx";

function blip(freq = 1320) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.start(t);
    o.stop(t + 0.5);
  } catch (e) {
    /* audio blocked — the vibrate and the colour change still fire */
  }
}

export default function HoldTimer({ targetLo, targetHi, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const signalled = useRef(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Fire once when the prescribed time is reached — the "you've hit it" cue.
  useEffect(() => {
    if (running && targetLo && elapsed >= targetLo && !signalled.current) {
      signalled.current = true;
      blip();
      try { navigator.vibrate?.([90, 40, 90]); } catch (e) { /* unsupported */ }
    }
  }, [elapsed, running, targetLo]);

  const start = () => { setElapsed(0); signalled.current = false; setRunning(true); };
  const stop = () => { setRunning(false); signalled.current = false; onStop?.(elapsed); setElapsed(0); };

  const hit = targetLo && elapsed >= targetLo;
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");
  const range = targetHi && targetHi !== targetLo ? `${targetLo}–${targetHi}` : `${targetLo}`;

  return (
    <div style={ST.wrap}>
      <div style={{ ...ST.time, color: hit ? "#7ec98f" : "var(--text)" }}>
        {mm}:{ss}
      </div>
      <div style={ST.label}>
        {running
          ? hit
            ? "target reached — hold as long as you can"
            : `hold for ${range} sec`
          : `target ${range} sec`}
      </div>
      <button
        style={{ ...ST.btn, ...(running ? ST.btnStop : ST.btnStart) }}
        onClick={running ? stop : start}
      >
        <Icon name="timer" size={15} /> {running ? "Stop — check off set" : "Start hold"}
      </button>
    </div>
  );
}

const ST = {
  wrap: { display: "grid", placeItems: "center", gap: 9, padding: "6px 0 12px" },
  time: {
    fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 46,
    letterSpacing: -1.5, fontVariantNumeric: "tabular-nums", lineHeight: 1,
    transition: "color .2s ease",
  },
  label: { fontSize: 12, color: "var(--text-mute)" },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 7, border: "none",
    borderRadius: 12, padding: "11px 22px", fontFamily: "inherit",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  btnStart: { background: ACCENT, color: "#0B1020" },
  btnStop: { background: "#e08a6a", color: "#1a0d08" },
};

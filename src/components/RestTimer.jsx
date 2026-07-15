// ============================================================
//  IRONCLAD — between-sets rest timer
// ============================================================
//  A sticky bar that lives just above the tab bar. It starts the moment you log
//  a set, and it stays put while you scroll, collapse the panel, or glance at
//  another tab — because rest is when you're least likely to be looking at the
//  exact row you just logged. At zero it beeps and buzzes so you can start the
//  next set without watching the clock.
//
//  Mounted with a fresh key on every logged set, so each new set restarts it
//  cleanly rather than trying to reconcile a running countdown.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // two quick rising blips — reads as "go", not as an alarm
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t);
      o.stop(t + 0.24);
    });
  } catch (e) {
    /* audio blocked — the vibrate and the visual flip still fire */
  }
}

export default function RestTimer({ seconds, label, onClose }) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const doneRef = useRef(false);

  // countdown
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // fire once when it lands on zero
  useEffect(() => {
    if (remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      setRunning(false);
      chime();
      try { navigator.vibrate?.([120, 60, 120]); } catch (e) { /* unsupported */ }
      const t = setTimeout(onClose, 4000); // clear itself shortly after
      return () => clearTimeout(t);
    }
    return undefined;
  }, [remaining, onClose]);

  const bump = (delta) => {
    doneRef.current = false;
    setRunning(true);
    setRemaining((r) => Math.max(5, r + delta));
    setTotal((t) => Math.max(5, Math.max(remaining, 0) + delta, t));
  };

  const done = remaining === 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = total ? (remaining / total) * 100 : 0;

  return (
    <div style={{ ...S.restBar, ...(done ? S.restBarDone : {}) }}>
      <div style={S.restProgTrack}>
        <div style={{ ...S.restProgFill, width: `${pct}%`, background: done ? ACCENT : ACCENT }} />
      </div>
      <div style={S.restRow}>
        {done ? (
          <>
            <span style={S.restGo}>GO</span>
            <span style={S.restLabel}>Next set · {label}</span>
            <button style={S.restSkip} onClick={onClose}>Dismiss</button>
          </>
        ) : (
          <>
            <span style={S.restKicker}>Rest</span>
            <span style={S.restTime}>{mm}:{ss}</span>
            <span style={S.restLabel}>{label}</span>
            <div style={S.restControls}>
              <button style={S.restBtn} onClick={() => bump(-15)} aria-label="15 seconds less">−15</button>
              <button style={S.restBtn} onClick={() => bump(15)} aria-label="15 seconds more">+15</button>
              <button style={S.restSkip} onClick={onClose}>Skip</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

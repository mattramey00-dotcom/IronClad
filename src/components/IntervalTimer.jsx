// ============================================================
//  IRONCLAD — interval timer (the draining meter)
// ============================================================
//  One or more timed stages run back to back: a Sprint/Walk round, a Fast run /
//  Easy walk round, or a single 10-minute incline walk. Each stage's meter drains
//  to zero and the next starts on its own; the whole thing completes itself when
//  the last stage ends. Cancel resets to idle.
//
//  Time is kept against the wall clock (an end timestamp), not by counting ticks,
//  so a locked phone or a backgrounded app doesn't pause the run — on return it
//  catches up, skipping past any stages that ended while you weren't looking.
//  The running state is saved under `persistKey`, so switching tabs, closing the
//  exercise sheet or even reloading the app picks the run back up mid-stage.
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { ACCENT, DEMOS } from "../data/program.js";
import { S } from "../styles.js";
import Demo from "./Demo.jsx";
import ExerciseGif from "./ExerciseGif.jsx";
import { advanceRun } from "../lib/intervals.js";

const STORE = "ironclad-interval:";
// The card and the exercise sheet can show the same run at once; this event keeps
// them in step (the `storage` event only fires in OTHER tabs).
const SYNC = "ironclad-interval";
const same = (a, b) => (a && b ? a.stageIdx === b.stageIdx && a.endAt === b.endAt : a === b);

// Saved runs are keyed by date first ("2026-10-13::Finisher::…"). Drop any from
// before today once per app load so they don't pile up day after day.
(function pruneOldRuns() {
  try {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const stale = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORE) && k.slice(STORE.length, STORE.length + 10) < today) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* storage blocked — nothing to prune */
  }
})();

function loadRun(key) {
  if (!key) return null;
  try {
    const v = JSON.parse(localStorage.getItem(STORE + key) || "null");
    return v && Number.isInteger(v.stageIdx) && Number.isFinite(v.endAt) ? v : null;
  } catch (e) {
    return null;
  }
}

function saveRun(key, run) {
  if (!key) return;
  window.dispatchEvent(new CustomEvent(SYNC, { detail: { key, run } }));
  try {
    if (run) localStorage.setItem(STORE + key, JSON.stringify(run));
    else localStorage.removeItem(STORE + key);
  } catch (e) {
    /* storage blocked — the run still works, it just won't survive a reload */
  }
}

const fmt = (secs) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function IntervalTimer({ stations, persistKey, startLabel = "Start", onOpenEx, onComplete, onSkip = onComplete }) {
  const durOf = (i) => stations[i]?.ex.timer || 0;
  // { stageIdx, endAt } while running; null = idle.
  const [run, setRun] = useState(() => loadRun(persistKey));
  const [now, setNow] = useState(() => Date.now());
  const finishedRef = useRef(false); // guards against double-firing onComplete

  useEffect(() => { saveRun(persistKey, run); }, [persistKey, run]);
  useEffect(() => {
    if (!persistKey) return undefined;
    const onSync = (e) => {
      if (e.detail.key !== persistKey) return;
      setRun((cur) => (same(cur, e.detail.run) ? cur : e.detail.run));
    };
    window.addEventListener(SYNC, onSync);
    return () => window.removeEventListener(SYNC, onSync);
  }, [persistKey]);

  // Tick a few times a second while running; also catch up the instant the app
  // comes back to the foreground rather than waiting for the next tick.
  useEffect(() => {
    if (!run) return undefined;
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [run]);

  // Advance past every stage that has run out (more than one if the phone was
  // locked through a whole stage), then finish when the last one ends.
  useEffect(() => {
    const step = advanceRun(run, now, stations.map((s, i) => durOf(i)));
    if (!step.advanced && !step.finished) return;
    if (step.finished) {
      beep(true);
      // Clear the saved run now, not in the save effect: completing usually
      // unmounts this card before that effect would run, and a leftover expired
      // run would re-complete the moment the exercise was un-checked.
      saveRun(persistKey, null);
      setRun(null);
      if (!finishedRef.current) { finishedRef.current = true; onComplete(); }
    } else {
      beep(false);
      setRun(step.run);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, run]);

  const start = () => {
    finishedRef.current = false;
    const t = Date.now();
    setNow(t);
    setRun({ stageIdx: 0, endAt: t + durOf(0) * 1000 });
  };
  const skip = () => {
    saveRun(persistKey, null);
    setRun(null);
    if (!finishedRef.current) { finishedRef.current = true; onSkip(); }
  };

  const idle = !run;
  const idx = idle ? 0 : run.stageIdx;
  const stage = stations[idx];
  const next = stations[idx + 1] || null;
  const dur = durOf(idx);
  const remaining = idle ? dur : Math.max(0, (run.endAt - now) / 1000);
  const pct = idle ? 100 : dur ? (remaining / dur) * 100 : 0;
  if (!stage) return null;

  return (
    <div style={ST.wrap}>
      <button style={ST.stage} onClick={() => onOpenEx?.(stage.ex)} title="View the movement">
        <div style={ST.thumb}>
          <ExerciseGif
            name={stage.ex.n}
            size={44}
            cacheOnly
            fallback={<Demo kind={DEMOS[stage.ex.d]?.kind || "core"} name={stage.ex.n} size={44} />}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={ST.name}>{stage.ex.n}</div>
          <div style={ST.reps}>{stage.ex.s}</div>
        </div>
        <div style={ST.clock}>{fmt(remaining)}</div>
      </button>

      <div style={ST.barTrack}>
        <div style={{ ...ST.barFill, width: `${pct}%` }} />
      </div>

      {next && <div style={ST.next}>Then: {next.ex.n} — {next.ex.s}</div>}

      {idle ? (
        <button style={{ ...S.btnAccent, width: "100%", padding: 10, marginTop: 8 }} onClick={start}>
          {startLabel}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={{ ...S.btnGhost, flex: 1, padding: 9 }} onClick={() => setRun(null)}>Reset</button>
          <button style={{ ...S.btnGhost, flex: 1, padding: 9 }} onClick={skip}>Skip to done</button>
        </div>
      )}
    </div>
  );
}

// Two quick rising blips between stages ("go"), a slightly brighter pair when
// the whole thing finishes — enough to tell the two apart without looking.
function beep(final) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tones = final ? [880, 1320] : [660];
    tones.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t);
      o.stop(t + 0.24);
    });
  } catch (e) {
    /* audio blocked — the visual countdown still finishes */
  }
}

const ST = {
  wrap: { borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border-hi)", padding: 10, marginBottom: 6 },
  stage: {
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
    background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
  },
  thumb: {
    width: 44, height: 44, flex: "0 0 auto", borderRadius: 9, overflow: "hidden",
    background: "var(--sunken)", display: "grid", placeItems: "center",
  },
  name: { fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  reps: { fontSize: 12, color: "var(--text-mute)", marginTop: 1 },
  clock: { fontSize: 20, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums", flex: "0 0 auto" },
  barTrack: { height: 6, borderRadius: 999, background: "var(--sunken)", overflow: "hidden", marginTop: 10 },
  barFill: { height: "100%", background: ACCENT, transition: "width .25s linear" },
  next: { fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 },
};

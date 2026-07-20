// ============================================================
//  IRONCLAD — between-sets rest timer
// ============================================================
//  A sticky bar that lives just above the tab bar. It starts the moment you log
//  a set, and it stays put while you scroll, collapse the panel, or glance at
//  another tab. At zero it beeps and buzzes so you can start the next set
//  without watching the clock.
//
//  It runs on wall-clock time (a real end-timestamp), not a tick counter, so
//  leaving the app and coming back shows the correct remaining time — and if
//  rest already finished while you were away, it flips straight to GO the moment
//  you return. A phone browser suspends JS timers in the background, so a live
//  countdown *over other apps* isn't possible on the web (that's a native-only
//  feature); what this does instead is stay accurate across a switch-away, hold
//  the screen awake while you're resting, and — if you allow it — buzz you with
//  a notification when the rest is up.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import { loadNotify, saveNotify } from "../lib/storage.js";

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

function notifyRestUp(label) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const body = label ? `Next set — ${label}` : "Time for your next set.";
  try {
    navigator.serviceWorker?.ready
      ?.then((reg) => reg.showNotification("Rest's up", {
        body, tag: "ironclad-rest", renotify: true,
        icon: "./icon-192.png", badge: "./icon-192.png",
      }))
      .catch(() => { try { new Notification("Rest's up", { body }); } catch (e) { /* ignore */ } });
  } catch (e) {
    /* notifications unavailable */
  }
}

export default function RestTimer({ seconds, label, onClose, onSetDuration, embedded = false }) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const [notifyOn, setNotifyOn] = useState(() => loadNotify());
  const endRef = useRef(Date.now() + seconds * 1000); // wall-clock target
  const doneRef = useRef(false);
  const wakeRef = useRef(null);

  // Remaining is always derived from the end-timestamp, so a suspended tab (you
  // switched apps) doesn't drift — on return it recomputes to the truth.
  const recompute = useCallback(() => {
    const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
    setRemaining(rem);
    return rem;
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(recompute, 250);
    return () => clearInterval(id);
  }, [running, recompute]);

  // Coming back from another app / a locked screen: reconcile immediately rather
  // than waiting for the next tick, and re-grab the wake lock (it's dropped when
  // the page is hidden).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      recompute();
      requestWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [recompute]);

  // Keep the screen on while resting, so if you set the phone down (without
  // switching apps) the countdown stays lit until GO. Best-effort — released on
  // unmount and auto-dropped by the OS when the tab hides.
  const requestWake = useCallback(async () => {
    try {
      if (running && !doneRef.current && navigator.wakeLock && document.visibilityState === "visible") {
        wakeRef.current = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      /* denied or unsupported — the timer still works */
    }
  }, [running]);

  useEffect(() => {
    requestWake();
    return () => { try { wakeRef.current?.release?.(); } catch (e) { /* ignore */ } wakeRef.current = null; };
  }, [requestWake]);

  // Fire once when it lands on zero — whether that's on a live tick or the
  // instant you return to a rest that finished while you were away.
  useEffect(() => {
    if (remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      setRunning(false);
      try { wakeRef.current?.release?.(); } catch (e) { /* ignore */ }
      wakeRef.current = null;
      chime();
      try { navigator.vibrate?.([120, 60, 120]); } catch (e) { /* unsupported */ }
      if (notifyOn) notifyRestUp(label);
      const t = setTimeout(onClose, 6000); // clear itself shortly after
      return () => clearTimeout(t);
    }
    return undefined;
  }, [remaining, onClose, notifyOn, label]);

  const bump = (delta) => {
    doneRef.current = false;
    setRunning(true);
    endRef.current = Math.max(Date.now() + 5000, endRef.current + delta * 1000);
    setTotal((t) => Math.max(5, t + delta));
    requestWake();
    recompute();
  };

  // Jump straight to a common rest length when the set didn't want the
  // prescribed one — a heavier single, a superset, a day you're just cruising.
  const setTo = (secs) => {
    doneRef.current = false;
    setRunning(true);
    endRef.current = Date.now() + secs * 1000;
    setTotal(secs);
    requestWake();
    recompute();
    // Remember this choice so the next set's rest starts here, not back at 45s.
    onSetDuration?.(secs);
  };

  // Tap to allow notifications (the permission prompt must be in a user gesture,
  // so it can only happen here, not automatically).
  const toggleNotify = async () => {
    if (notifyOn) { setNotifyOn(false); saveNotify(false); return; }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      } catch (e) {
        return;
      }
    }
    setNotifyOn(true);
    saveNotify(true);
  };

  const done = remaining === 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

  const QUICK = embedded ? [60, 90] : [45, 60, 90, 120];
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const wrapStyle = embedded
    ? {
        ...S.restBar,
        position: "static", left: "auto", right: "auto", bottom: "auto",
        zIndex: "auto", maxWidth: "none", margin: "0 0 12px", borderRadius: 14,
        border: "1px solid #2c2e3d", boxShadow: "none", overflow: "hidden",
        ...(done ? S.restBarDone : {}),
      }
    : { ...S.restBar, ...(done ? S.restBarDone : {}) };

  const bellBtn = (
    <button
      style={{ ...S.restBtn, color: notifyOn ? ACCENT : undefined, display: "inline-grid", placeItems: "center" }}
      onClick={toggleNotify}
      aria-label={notifyOn ? "Rest notifications on" : "Notify me when rest ends"}
      title={notifyOn ? "Notifications on" : "Notify me when rest ends"}
    >
      <Icon name={notifyOn ? "bell" : "bellOff"} size={15} />
    </button>
  );

  return (
    <div style={wrapStyle}>
      <div style={S.restProgTrack}>
        <div style={{ ...S.restProgFill, width: `${pct}%`, background: ACCENT }} />
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
            {!embedded && <span style={S.restLabel}>{label}</span>}
            <div style={{ ...S.restControls, ...(embedded ? { marginLeft: "auto" } : {}) }}>
              {bellBtn}
              <button style={S.restBtn} onClick={() => bump(-15)} aria-label="15 seconds less">−15</button>
              <button style={S.restBtn} onClick={() => bump(15)} aria-label="15 seconds more">+15</button>
              <button style={S.restSkip} onClick={onClose}>Skip</button>
            </div>
          </>
        )}
      </div>
      {!done && (
        <div style={{ ...S.restChips, ...(embedded ? { padding: "0 12px 9px" } : {}) }}>
          <span style={S.restChipsLabel}>Set to</span>
          {QUICK.map((s) => (
            <button
              key={s}
              style={{ ...S.restChip, ...(total === s ? S.restChipActive : {}) }}
              onClick={() => setTo(s)}
            >
              {clock(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

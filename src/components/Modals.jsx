import React, { useState, useEffect, useRef } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";

// ============================================================
//  Video demo modal — streams a hand-picked YouTube form tutorial
// ============================================================
export function VideoModal({ video, name, onClose }) {
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 480, padding: 14, textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#8a8a9e" }}>Demo · {video.by} · via YouTube</div>
          </div>
          <button style={{ ...S.btnGhost, padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`}
            title={`${name} demo`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#667", marginTop: 8 }}>
          Requires internet · animation stays available offline
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Timer modal
// ============================================================
export function TimerModal({ seconds, label, onClose }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            o.start();
            o.stop(ctx.currentTime + 0.6);
          } catch (e) {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = (remaining / seconds) * 100;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "#888" }}>{label}</div>
        <div style={{ position: "relative", width: 200, height: 200, margin: "18px auto" }}>
          <svg viewBox="0 0 120 120" style={{ width: 200, height: 200, transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#222" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 46, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {mm}:{ss}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={S.btnGhost} onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : remaining === 0 ? "Done" : "Resume"}
          </button>
          <button style={S.btnGhost} onClick={() => { setRemaining(seconds); setRunning(true); }}>Reset</button>
          <button style={S.btnAccent} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

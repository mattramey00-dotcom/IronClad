// ============================================================
//  IRONCLAD — circuit block
// ============================================================
//  A circuit is not straight sets: you run every station once (a round), rest,
//  then repeat for N rounds. So this block tracks the round you're on — checking
//  a station marks it done for THIS round only — and drops a rest timer in the
//  moment a full round is finished, before advancing to the next.
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { ACCENT, DEMOS } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import Demo from "./Demo.jsx";
import ExerciseGif from "./ExerciseGif.jsx";
import RestTimer from "./RestTimer.jsx";

export default function CircuitBlock({
  rounds, restSecs, auto, stations,
  isStationDone, onToggleStation, onCompleteRound, onOpenEx, onStartTimer,
}) {
  const roundComplete = (r) => stations.length > 0 && stations.every((s) => isStationDone(s.ex.n, r));

  let completedRounds = 0;
  for (let r = 1; r <= rounds; r++) if (roundComplete(r)) completedRounds++;
  const allComplete = completedRounds === rounds;

  // The round you're working = the first one not yet fully done (rounds+1 = done).
  let currentRound = rounds + 1;
  for (let r = 1; r <= rounds; r++) { if (!roundComplete(r)) { currentRound = r; break; } }
  const activeRound = allComplete ? rounds : currentRound;
  const doneThisRound = stations.filter((s) => isStationDone(s.ex.n, activeRound)).length;

  // Finishing a round (that isn't the last) drops a rest timer before the next —
  // unless the stations already alternate work/recovery (e.g. Sprint + Walk),
  // where the last station IS the rest and a second countdown would double it.
  const [resting, setResting] = useState(null);
  const prevRoundRef = useRef(currentRound);
  useEffect(() => {
    const prev = prevRoundRef.current;
    if (restSecs && currentRound > prev && currentRound <= rounds) setResting({ round: prev });
    prevRoundRef.current = currentRound;
  }, [currentRound, rounds, restSecs]);

  return (
    <div>
      <div style={ST.head}>
        <div style={{ ...ST.roundLabel, color: allComplete ? "#6f9c82" : "var(--text)" }}>
          {allComplete ? "Circuit complete" : `Round ${currentRound} of ${rounds}`}
        </div>
        <div style={ST.pips}>
          {Array.from({ length: rounds }, (_, i) => {
            const r = i + 1;
            const doneR = roundComplete(r);
            const isCur = !allComplete && r === currentRound;
            return (
              <span key={r} style={{ ...ST.pip, ...(doneR ? ST.pipDone : {}), ...(isCur ? ST.pipCur : {}) }}>
                {doneR ? "✓" : r}
              </span>
            );
          })}
        </div>
      </div>
      <div style={ST.sub}>
        {allComplete
          ? `All ${rounds} rounds done — nice work.`
          : restSecs
            ? `${doneThisRound} of ${stations.length} stations this round · ${restSecs}s rest between rounds`
            : `${doneThisRound} of ${stations.length} this round`}
      </div>

      {resting && (
        <div style={{ marginTop: 8, marginBottom: 2 }}>
          <RestTimer
            key={`rest-${resting.round}`}
            embedded
            seconds={restSecs}
            label={`Round ${resting.round} done`}
            onClose={() => setResting(null)}
          />
        </div>
      )}

      {/* An all-timed round (e.g. Sprint 30s / Walk 90s) chains itself: starting the
          first station auto-starts the next the moment its timer ends, and the round
          is marked done the instant the last one finishes — nothing to tap mid-round.
          Only while the round is in progress; once every round is done the plain
          checklist below takes over so a mistaken auto-completion is still undoable. */}
      {auto && !allComplete && stations.length > 0 && stations.every((s) => s.ex.timer) ? (
        <AutoRound
          key={activeRound}
          stations={stations}
          onOpenEx={onOpenEx}
          onComplete={() => onCompleteRound(stations.map((s) => s.ex.n), activeRound)}
        />
      ) : stations.map((s, i) => {
        const { ex } = s;
        const done = isStationDone(ex.n, activeRound);
        return (
          <div key={i} style={{ ...ST.row, ...(done ? ST.rowDone : {}) }}>
            <button style={ST.rowMain} onClick={() => onOpenEx(ex)} title="View the movement">
              <div style={ST.thumb}>
                <ExerciseGif
                  name={ex.n}
                  size={44}
                  cacheOnly
                  fallback={<Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={44} />}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...ST.name, ...(done ? { color: "#6f9c82" } : {}) }}>{ex.n}</div>
                <div style={ST.reps}>{ex.s}</div>
              </div>
            </button>
            {ex.timer && !done && (
              <button style={ST.timerBtn} onClick={() => onStartTimer(ex.timer, ex.n)} title={`Start ${ex.timer}s timer`} aria-label={`Start ${ex.timer} second timer`}>
                <Icon name="timer" size={15} />
              </button>
            )}
            <button
              style={{ ...ST.check, ...(done ? ST.checkDone : {}) }}
              onClick={() => onToggleStation(ex.n, activeRound)}
              aria-label={done ? `${ex.n} done this round — tap to undo` : `Mark ${ex.n} done this round`}
              title={done ? "Done this round — tap to undo" : "Tap when you finish this station"}
            >
              {done ? <span style={{ animation: "pop .3s ease" }}>✓</span> : ""}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// One station's countdown running out auto-starts the next — so a Sprint/Walk
// round is "tap Start, then just move" instead of a timer per station plus a
// checkbox per station. The round completes itself the moment the last station's
// clock hits zero. Keyed by round in the parent, so a fresh round always mounts
// idle rather than resuming mid-sequence from the last one.
function AutoRound({ stations, onOpenEx, onComplete }) {
  const [stageIdx, setStageIdx] = useState(null); // null = not started yet
  const [remaining, setRemaining] = useState(0);
  const finishedRef = useRef(false); // guards against double-firing onComplete
  const tickRef = useRef(null);

  useEffect(() => {
    if (stageIdx === null) return undefined;
    const dur = stations[stageIdx]?.ex.timer || 0;
    setRemaining(dur);
    if (!dur) return undefined;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        clearInterval(tickRef.current);
        const next = stageIdx + 1;
        if (next < stations.length) {
          beep(false);
          setStageIdx(next);
        } else {
          beep(true);
          if (!finishedRef.current) { finishedRef.current = true; onComplete(); }
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIdx]);

  const idle = stageIdx === null;
  const stage = stations[idle ? 0 : stageIdx];
  const next = stations[(idle ? 0 : stageIdx) + 1] || null;
  const dur = stage?.ex.timer || 0;
  const pct = idle ? 100 : dur ? (remaining / dur) * 100 : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div style={ST.autoWrap}>
      <button style={ST.autoStage} onClick={() => onOpenEx(stage.ex)} title="View the movement">
        <div style={ST.thumb}>
          <ExerciseGif
            name={stage.ex.n}
            size={44}
            cacheOnly
            fallback={<Demo kind={DEMOS[stage.ex.d]?.kind || "core"} name={stage.ex.n} size={44} />}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={ST.name}>{stage.ex.n}</div>
          <div style={ST.reps}>{idle ? `${dur}s` : `${mm}:${ss}`}</div>
        </div>
      </button>

      <div style={ST.autoBarTrack}>
        <div style={{ ...ST.autoBarFill, width: `${pct}%` }} />
      </div>

      {next && <div style={ST.autoNext}>Then: {next.ex.n} — {next.ex.s}</div>}

      {idle ? (
        <button style={{ ...S.btnAccent, width: "100%", padding: 10, marginTop: 8 }} onClick={() => setStageIdx(0)}>
          Start round
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={{ ...S.btnGhost, flex: 1, padding: 9 }} onClick={() => setStageIdx(null)}>Cancel</button>
          <button
            style={{ ...S.btnGhost, flex: 1, padding: 9 }}
            onClick={() => { if (!finishedRef.current) { finishedRef.current = true; onComplete(); } }}
          >
            Skip to done
          </button>
        </div>
      )}
    </div>
  );
}

// Two quick rising blips between stations ("go"), a slightly brighter pair when
// the whole round finishes — enough to tell the two apart without looking.
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
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2, marginBottom: 4 },
  roundLabel: { fontSize: 15, fontWeight: 800, letterSpacing: -0.2 },
  pips: { display: "flex", gap: 5 },
  pip: {
    width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center",
    fontSize: 11, fontWeight: 800, color: "var(--text-dim)", background: "var(--surface-2)",
    border: "1px solid var(--border-hi)", fontVariantNumeric: "tabular-nums",
  },
  pipDone: { background: ACCENT, borderColor: ACCENT, color: "#0B1020" },
  pipCur: { borderColor: ACCENT, color: ACCENT, boxShadow: `0 0 0 1px ${ACCENT} inset` },
  sub: { fontSize: 11.5, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.4 },
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", marginBottom: 6,
    borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border-hi)",
  },
  rowDone: { background: "rgba(84,179,126,.08)", border: "1px solid rgba(84,179,126,.35)" },
  rowMain: {
    display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0,
    background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
  },
  thumb: {
    width: 44, height: 44, flex: "0 0 auto", borderRadius: 9, overflow: "hidden",
    background: "var(--sunken)", display: "grid", placeItems: "center",
  },
  name: { fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  reps: { fontSize: 12, color: "var(--text-mute)", marginTop: 1 },
  timerBtn: {
    flex: "0 0 auto", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
    display: "grid", placeItems: "center", background: "transparent",
    border: "1px solid var(--border-hi)", color: "var(--text-2)",
  },
  check: {
    flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", cursor: "pointer", fontFamily: "inherit",
    display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800,
    background: "transparent", border: "2px solid var(--border-hi)", color: "#0B1020",
  },
  checkDone: { background: "#54b37e", border: "2px solid #54b37e", color: "#0B1020" },
  autoWrap: {
    borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border-hi)", padding: 10,
  },
  autoStage: {
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
    background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
  },
  autoBarTrack: {
    height: 6, borderRadius: 999, background: "var(--sunken)", overflow: "hidden", marginTop: 10,
  },
  autoBarFill: { height: "100%", background: ACCENT, transition: "width 1s linear" },
  autoNext: { fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 },
};

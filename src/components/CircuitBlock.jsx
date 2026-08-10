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
  rounds, restSecs, stations,
  isStationDone, onToggleStation, onOpenEx, onStartTimer,
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

      {stations.map((s, i) => {
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
};

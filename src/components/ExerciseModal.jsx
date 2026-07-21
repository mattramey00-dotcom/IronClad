// ============================================================
//  IRONCLAD — the exercise modal
// ============================================================
//  Tapping an exercise opens this focused view: a large look at the movement, a
//  full-size map of the muscles it works, and a set-by-set checklist. You tick
//  each set as you finish it; the last tick applies the exercise's master check,
//  closes the modal, and drops you onto the next exercise — so a workout is a
//  sequence of "open, do the sets, next" rather than hunting a tiny checkbox.
//
//  Weight × reps is optional: fill it and each ticked set is logged to history
//  (and starts the rest clock, exactly as logging did before); leave it blank
//  and the tick is a pure "done".
// ============================================================

import React, { useState, useEffect, useMemo } from "react";
import { ACCENT, DEMOS, MUSCLE_LABELS, prescription, swapSuggestions, programScheme } from "../data/program.js";
import { S } from "../styles.js";
import Demo from "./Demo.jsx";
import ExerciseGif from "./ExerciseGif.jsx";
import MuscleMap from "./MuscleMap.jsx";
import Icon from "./Icon.jsx";
import RestTimer from "./RestTimer.jsx";
import HoldTimer from "./HoldTimer.jsx";

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function ExerciseModal({
  ex, blockName, isDone, todaySession, lastSession, pr, origName, subbed, onSwap, muscles = [], video,
  rest, restPref, onSetRestPref, onCloseRest, wxKey,
  onLogSet, onStartRest, onStartTimer, onOpenVideo, onMarkDone, onCelebrate, onComplete, onClose,
}) {
  const [swapping, setSwapping] = useState(false);
  const [swapName, setSwapName] = useState("");
  const [swapScheme, setSwapScheme] = useState(ex.s || "");
  // Schedule-aware swap options, and the program's original scheme so a
  // same-muscle swap keeps the day's volume identical.
  const suggest = useMemo(() => swapSuggestions(origName), [origName]);
  const baseScheme = programScheme(origName) || ex.s;
  // A rest belongs to this modal only when the running clock is for this
  // exercise — a stale rest from a set you logged elsewhere shouldn't surface.
  const restHere = rest && rest.label === ex.n ? rest : null;
  const rx = prescription(ex.s); // { sets, lowReps, restSecs } | null
  const nSets = rx?.sets || 0;
  // The rest length to use: whatever you last set it to this session, else the
  // prescribed default — so picking 1:30 on set one carries to the sets after it.
  const effRest = restPref ?? rx?.restSecs;

  // A hold, not reps: "3 × 45–60 sec". These get a stopwatch instead of the
  // weight×reps box, and each set is a timed hold rather than a logged lift.
  const timed = nSets > 0 && /\bsec/i.test(ex.s || "");
  const holdLo = rx?.lowReps || ex.timer || 30;
  const holdHi = Number((ex.s?.match(/[–-]\s*(\d+)/) || [])[1]) || null;

  // Seed the ticks from what's already logged today — or all of them if the
  // exercise is already checked off — so reopening reflects reality.
  const loggedCount = todaySession?.sets?.length || 0;
  const seededDone = isDone && nSets ? nSets : Math.min(loggedCount, nSets);
  const [checked, setChecked] = useState(() =>
    Array.from({ length: nSets }, (_, i) => i < seededDone),
  );
  const initiallyComplete = nSets ? seededDone === nSets : isDone;
  const [finishing, setFinishing] = useState(false);

  // Prefill weight/reps from the most recent numbers, so you're adjusting a
  // sensible starting point, not typing from scratch every set.
  const priorSets = (todaySession?.sets?.length ? todaySession.sets : lastSession?.sets) || [];
  const lastSet = priorSets[priorSets.length - 1];
  const [w, setW] = useState(lastSet ? String(lastSet.w) : "");
  const [r, setR] = useState(lastSet ? String(lastSet.r) : rx?.lowReps ? String(rx.lowReps) : "");

  const doneCount = checked.filter(Boolean).length;
  const allSetsDone = nSets > 0 && doneCount === nSets;

  // The last tick finishes the exercise: mark it done now (so the row turns
  // green and survives a close), but leave the modal open on its Complete button
  // so you move on when you're ready, not on a timer. The confetti waits for the
  // whole day to be done — fired from the day card, not per exercise.
  useEffect(() => {
    if (initiallyComplete || !allSetsDone) return;
    setFinishing(true);
    onMarkDone?.(blockName, ex.n);
  }, [allSetsDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticks are one-way (you finished the set) so a mis-log can't double-post.
  const tickSet = (i) => {
    if (checked[i]) return;
    setChecked((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    const isLast = i === nSets - 1;
    // A hold has no weight×reps to log — just check it off and rest.
    if (timed) {
      if (!isLast && effRest) onStartRest(ex.n, effRest);
      return;
    }
    const wv = parseFloat(w);
    const rv = parseFloat(r);
    if (Number.isFinite(wv) && Number.isFinite(rv)) {
      // logSet already starts the rest clock for non-final sets logged today
      onLogSet(ex.n, wv, rv, isLast ? 0 : effRest);
    } else if (!isLast && effRest) {
      onStartRest(ex.n, effRest);
    }
  };

  // Stopping the stopwatch checks off the next unfinished hold.
  const tickNextHold = () => {
    const i = checked.findIndex((c) => !c);
    if (i >= 0) tickSet(i);
  };

  const stop = (e) => e.stopPropagation();
  const targetsFull = muscles.includes("fullbody");

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={ST.card} onClick={stop}>
        {/* header */}
        <div style={ST.head}>
          <div style={{ minWidth: 0 }}>
            <div style={ST.title}>
              {ex.n}
              {pr && <span style={S.prBadge}><Icon name="star" size={11} /> New best</span>}
            </div>
            <div style={ST.sub}>
              {ex.s}
              {blockName ? <span style={{ color: "var(--text-faint)" }}> · {blockName}</span> : null}
            </div>
          </div>
          <button style={ST.close} onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* the movement — the real animated demo when we have it, otherwise the
            photo/SVG. Only the modal fetches gifs; the rows stay cheap. */}
        <div style={ST.demoWrap}>
          <ExerciseGif
            name={ex.n}
            size={108}
            apiKey={wxKey}
            fallback={<Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={108} />}
          />
        </div>
        {video && (
          <button style={ST.videoBtn} onClick={() => onOpenVideo(ex)}>
            <Icon name="play" size={12} /> Watch form video
          </button>
        )}

        {/* the muscles */}
        <div style={ST.muscleBox}>
          <MuscleMap muscles={muscles} height={104} />
          <div style={{ minWidth: 0 }}>
            <div style={S.muscleLabel}>Targets</div>
            <div style={{ ...S.muscleList, fontSize: 14 }}>
              {targetsFull
                ? "Full body"
                : muscles.map((m, i) => (
                    <span key={m} style={i === 0 ? S.musclePrimary : undefined}>
                      {MUSCLE_LABELS[m]}
                      {i < muscles.length - 1 ? " · " : ""}
                    </span>
                  ))}
            </div>
          </div>
        </div>

        {/* the sets */}
        {nSets > 0 ? (
          <>
            <div style={ST.setsHead}>
              <span style={S.label}>Sets</span>
              <span style={{ ...ST.count, color: allSetsDone ? ACCENT : "var(--text-mute)" }}>
                {doneCount}/{nSets}
              </span>
            </div>

            {timed ? (
              <HoldTimer targetLo={holdLo} targetHi={holdHi} onStop={tickNextHold} />
            ) : (
              <div style={ST.logRow}>
                <div style={ST.inputWrap}>
                  <input
                    type="number" inputMode="decimal" placeholder="—" value={w}
                    onChange={(e) => setW(e.target.value)} style={ST.numInput}
                  />
                  <span style={ST.unit}>lb</span>
                </div>
                <span style={{ color: "var(--text-faint)" }}>×</span>
                <div style={ST.inputWrap}>
                  <input
                    type="number" inputMode="numeric" placeholder="—" value={r}
                    onChange={(e) => setR(e.target.value)} style={ST.numInput}
                  />
                  <span style={ST.unit}>reps</span>
                </div>
                <span style={ST.optional}>optional · logs to history</span>
              </div>
            )}

            <div style={ST.setRow}>
              {checked.map((c, i) => (
                <button
                  key={i}
                  onClick={() => tickSet(i)}
                  style={{ ...ST.setCircle, ...(c ? ST.setCircleDone : {}) }}
                  aria-label={`Set ${i + 1}${c ? " done" : ""}`}
                >
                  {c ? <span style={{ animation: "pop .3s ease" }}><Icon name="check" size={20} strokeWidth={2.6} /></span> : i + 1}
                </button>
              ))}
            </div>

            {allSetsDone ? (
              <button
                style={{ ...S.btnAccent, width: "100%", marginTop: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                onClick={() => onComplete(blockName, ex.n)}
              >
                <Icon name="check" size={16} strokeWidth={2.6} /> Complete → next exercise
              </button>
            ) : (
              <div style={ST.hint}>
                {timed
                  ? "Start the stopwatch for each hold — it buzzes when you hit the target. Stopping it checks the set off; the last one finishes the exercise."
                  : "Tap each set as you finish it. The last one checks off the exercise."}
              </div>
            )}
          </>
        ) : (
          <>
            {ex.timer && (
              <button style={{ ...S.timerBtn, width: "100%", justifyContent: "center", padding: "12px", fontSize: 14, marginBottom: 8 }} onClick={() => onStartTimer(ex.timer, ex.n)}>
                <Icon name="timer" size={15} /> Start {clock(ex.timer)} timer
              </button>
            )}
            <button style={{ ...S.btnAccent, width: "100%", marginTop: 4 }} onClick={() => onComplete(blockName, ex.n)}>
              Mark complete
            </button>
          </>
        )}

        {/* Swap this movement for one you can actually do — a personal override
            on this phone, never a change to the shared plan. */}
        {onSwap && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--surface-2)", paddingTop: 10 }}>
            {!swapping ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  style={{ ...S.btnGhost, flex: 1, fontSize: 12.5, padding: "8px 10px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => { setSwapName(""); setSwapScheme(ex.s || ""); setSwapping(true); }}
                >
                  <Icon name="refresh" size={14} /> {subbed ? "Swap again" : "Swap this exercise"}
                </button>
                {subbed && (
                  <button style={{ ...S.btnGhost, fontSize: 12.5, padding: "8px 12px" }} onClick={() => onSwap(null)}>
                    Restore original
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 9, lineHeight: 1.5 }}>
                  Replace “{subbed ? origName : ex.n}”. This phone only — it won't touch the plan or
                  your partner's week, and it logs under its own name.
                </div>

                {suggest.keep.length > 0 && (
                  <>
                    <div style={ST.swapLabel}>
                      <span style={{ color: "#54b37e" }}>●</span> Keeps your plan on track
                    </div>
                    <div style={ST.chipWrap}>
                      {suggest.keep.map((c) => (
                        <button key={c.n} style={ST.swapChip} onClick={() => onSwap({ n: c.n, s: baseScheme, d: c.d })}>
                          {c.n}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {suggest.shift.length > 0 && (
                  <>
                    <div style={{ ...ST.swapLabel, marginTop: 10 }}>
                      <span style={{ color: "#E0B44A" }}>●</span> Changes what this day trains
                    </div>
                    <div style={ST.chipWrap}>
                      {suggest.shift.map((c) => (
                        <button key={c.n} style={{ ...ST.swapChip, ...ST.swapChipShift }} onClick={() => onSwap({ n: c.n, s: baseScheme, d: c.d })}>
                          {c.n}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ ...ST.swapLabel, marginTop: 10 }}>Or your own</div>
                <input
                  style={{ ...S.textInput, marginBottom: 6 }}
                  placeholder="Replacement, e.g. Landmine Press"
                  value={swapName} onChange={(e) => setSwapName(e.target.value)}
                />
                <input
                  style={{ ...S.textInput, marginBottom: 8 }}
                  placeholder="Sets, e.g. 3 × 8–10"
                  value={swapScheme} onChange={(e) => setSwapScheme(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{ ...S.btnAccent, flex: 1, padding: "9px", opacity: swapName.trim() ? 1 : 0.5 }}
                    disabled={!swapName.trim()}
                    onClick={() => onSwap({ n: swapName.trim(), s: swapScheme.trim() || baseScheme, d: ex.d, timer: ex.timer })}
                  >
                    Use this instead
                  </button>
                  <button style={{ ...S.btnGhost, padding: "9px 14px" }} onClick={() => setSwapping(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* The between-sets clock, right here under the sets rather than behind
            the modal — starts when you tick a set, override or skip in place. */}
        {restHere && (
          <div style={{ marginTop: 10 }}>
            <RestTimer key={restHere.id} embedded seconds={restHere.secs} label={restHere.label} onSetDuration={onSetRestPref} onClose={onCloseRest} />
          </div>
        )}
      </div>
    </div>
  );
}

// Local styles — this modal is wider and more spacious than the small confirm
// dialogs, so it carries its own layout rather than bending the shared tokens.
const ST = {
  card: {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22,
    padding: 16, textAlign: "left", width: "100%", maxWidth: 440,
    maxHeight: "92vh", overflowY: "auto", animation: "fade .2s ease",
  },
  head: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  title: { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.4, lineHeight: 1.15 },
  sub: { fontSize: 13, color: "var(--text-mute)", marginTop: 2 },
  close: {
    marginLeft: "auto", flex: "0 0 auto", width: 32, height: 32, borderRadius: "50%",
    background: "var(--surface-2)", border: "1px solid var(--border-hi)", color: "var(--text-2)",
    cursor: "pointer", display: "grid", placeItems: "center", fontFamily: "inherit",
  },
  demoWrap: {
    display: "grid", placeItems: "center", background: "var(--sunken)",
    border: "1px solid var(--surface-2)", borderRadius: 16, padding: 10, marginBottom: 8,
  },
  videoBtn: {
    ...S.demoBtn, width: "100%", justifyContent: "center", padding: "8px", fontSize: 13, marginBottom: 10,
  },
  muscleBox: {
    display: "flex", alignItems: "center", gap: 14, padding: "8px 12px",
    background: "var(--sunken)", border: "1px solid var(--surface-2)", borderRadius: 12, marginBottom: 12,
  },
  setsHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 },
  count: { fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  logRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center", width: 92 },
  numInput: {
    width: "100%", background: "var(--sunken)", border: "1px solid var(--border)", borderRadius: 9,
    color: "var(--text)", fontSize: 16, padding: "9px 30px 9px 10px", fontFamily: "inherit", outline: "none",
  },
  unit: { position: "absolute", right: 9, fontSize: 11, color: "var(--text-dim)" },
  optional: { fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" },
  setRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 },
  setCircle: {
    width: 46, height: 46, borderRadius: "50%", border: "2px solid var(--border-hi)",
    background: "transparent", color: "var(--text-mute)", fontSize: 16, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit", display: "grid", placeItems: "center",
    fontVariantNumeric: "tabular-nums", transition: "all .18s ease",
  },
  setCircleDone: { background: ACCENT, border: `2px solid ${ACCENT}`, color: "#0B1020" },
  hint: { fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 },
  swapLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--text-mute)", marginBottom: 6 },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  swapChip: {
    background: "var(--surface-2)", border: "1px solid var(--border-hi)", color: "var(--text-2)",
    borderRadius: 999, padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
  },
  swapChipShift: { border: "1px solid rgba(224,180,74,.4)", color: "#e6cf9a", background: "rgba(224,180,74,.06)" },
};

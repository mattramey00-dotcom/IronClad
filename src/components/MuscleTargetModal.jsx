// ============================================================
//  IRONCLAD — target a muscle
// ============================================================
//  A blown-up version of the x-ray figure, but interactive: tap a muscle on the
//  front or back and the app lists the program's movements that train it. Pick
//  one and it opens like any exercise — full demo, set logging, rest timer — so
//  you can bolt targeted accessory work onto the day without leaving the app.
//  The same vendored body polygons the small map uses, just larger and tappable.
// ============================================================

import React, { useState } from "react";
import { ACCENT, MUSCLE_LABELS, DEMOS, exercisesForMuscle } from "../data/program.js";
import { bodyFront, bodyBack, OUTLINE_FRONT, OUTLINE_BACK } from "../data/bodyParts.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import ExerciseGif from "./ExerciseGif.jsx";
import Demo from "./Demo.jsx";

// Anatomical polygon slug → the app's muscle token (the reverse of the small
// map's token→slug tables). Cosmetic parts are skipped so only real muscles
// are tappable.
const SLUG_TOKEN = {
  chest: "chest", deltoids: "shoulders", biceps: "biceps", triceps: "triceps",
  forearm: "forearms", abs: "abs", obliques: "obliques", trapezius: "traps",
  quadriceps: "quads", calves: "calves", "upper-back": "lats",
  "lower-back": "lowerback", gluteal: "glutes", hamstring: "hamstrings",
};
const SKIP = new Set(["head", "hair", "hands", "feet", "ankles", "knees", "neck"]);

const BODY_FILL = "#1d2030";
const BODY_STROKE = "#3d4059";
const MUSCLE_IDLE = "#343953";

function Figure({ viewBox, outline, parts, selected, onPick, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <svg viewBox={viewBox} style={{ height: "min(44vh, 360px)", maxWidth: "44vw", display: "block" }} role="img" aria-label={`${label} — tap a muscle to train it`}>
        <path d={outline} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {parts
          .filter((p) => !SKIP.has(p.slug))
          .map((p) => {
            const token = SLUG_TOKEN[p.slug];
            const on = token && selected === token;
            const ds = [...(p.path.common || []), ...(p.path.left || []), ...(p.path.right || [])];
            return (
              <g
                key={p.slug}
                fill={on ? ACCENT : MUSCLE_IDLE}
                opacity={on ? 0.95 : 1}
                onClick={token ? () => onPick(token) : undefined}
                style={token ? { cursor: "pointer" } : undefined}
                aria-label={token ? MUSCLE_LABELS[token] : undefined}
              >
                {ds.map((d, i) => <path key={i} d={d} />)}
              </g>
            );
          })}
      </svg>
      <span style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-faint)" }}>{label}</span>
    </div>
  );
}

export default function MuscleTargetModal({ onPickExercise, onClose }) {
  const [muscle, setMuscle] = useState(null);
  const exs = muscle ? exercisesForMuscle(muscle) : [];

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 520, textAlign: "left", padding: 0, height: "min(92vh, 860px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="stretch" size={18} style={{ color: ACCENT }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>Target a muscle</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Adds to today, on top of your plan</div>
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Figure viewBox="0 140 724 1240" outline={OUTLINE_FRONT} parts={bodyFront} selected={muscle} onPick={setMuscle} label="Front" />
            <Figure viewBox="724 140 724 1240" outline={OUTLINE_BACK} parts={bodyBack} selected={muscle} onPick={setMuscle} label="Back" />
          </div>

          {!muscle ? (
            <div style={{ color: "var(--text-mute)", fontSize: 13.5, lineHeight: 1.6, padding: "16px 6px 4px", textAlign: "center" }}>
              Tap any muscle above and the moves that train it appear here. Whatever you pick is
              <b> added to today's workout</b>, on top of your prescribed plan — so your Train screen
              shows everything you did — and it opens right away with its demo, set logging and rest timer.
            </div>
          ) : (
            <>
              <label style={{ ...S.label, marginTop: 18 }}>
                {MUSCLE_LABELS[muscle]} · {exs.length} move{exs.length === 1 ? "" : "s"} · adds to today
              </label>
              {exs.length === 0 ? (
                <div style={{ color: "var(--text-mute)", fontSize: 13, padding: "8px 4px" }}>
                  Nothing in the program targets that one directly.
                </div>
              ) : (
                exs.map((ex) => (
                  <button
                    key={ex.n}
                    onClick={() => onPickExercise(ex)}
                    style={{ ...S.exRow, width: "100%", textAlign: "left", cursor: "pointer", gap: 12 }}
                  >
                    <div style={S.demoWrap}>
                      {/* cacheOnly: shows the real animation if it's already been
                          fetched (many share ids with the program), otherwise the
                          photo/line demo — the modal fetches it on open. */}
                      <ExerciseGif
                        name={ex.n}
                        size={46}
                        cacheOnly
                        fallback={<Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={46} />}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.exName}>{ex.n}</div>
                      <div style={S.exSets}>{ex.s}</div>
                    </div>
                    <span style={{ color: ACCENT, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                      <Icon name="plus" size={18} />
                    </span>
                  </button>
                ))
              )}
            </>
          )}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
          <button style={{ ...S.btnGhost, width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

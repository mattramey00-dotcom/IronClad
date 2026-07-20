// ============================================================
//  IRONCLAD — target-muscle map
// ============================================================
//  A front-and-back anatomical figure with the worked muscles lit in the accent
//  colour. The muscle polygons are vendored (inline, no network — works in the
//  garage with no signal) from react-native-body-highlighter (MIT). The app's
//  own muscle tokens from musclesFor() are translated to that library's slugs
//  here, so an exercise lights the correct real muscle shapes.
//
//  Only the view that has something to show is rendered — a biceps curl shows
//  the front alone (so the figure is bigger), a deadlift the back, a squat both.
//  Front paths live in x 0–724, back paths in x 724–1448 (pre-shifted); each
//  view crops the empty head-room and foot-room to fill the row.
// ============================================================

import React from "react";
import { ACCENT } from "../data/program.js";
import { bodyFront, bodyBack, OUTLINE_FRONT, OUTLINE_BACK } from "../data/bodyParts.js";

// app token → the anatomical slug(s) it lights, per view. `shoulders` is both
// deltoid heads; `traps`/`triceps`/`calves` read on both sides; `lats` maps to
// the library's upper-back region. `forearms` is front-only, so an arm-flexor
// move (curl) stays a single front figure rather than dragging in the back.
const FRONT_FOR = {
  chest: ["chest"], shoulders: ["deltoids"], biceps: ["biceps"], triceps: ["triceps"],
  forearms: ["forearm"], abs: ["abs"], obliques: ["obliques"], traps: ["trapezius"],
  quads: ["quadriceps"], calves: ["calves"],
};
const BACK_FOR = {
  shoulders: ["deltoids"], triceps: ["triceps"], lats: ["upper-back"], traps: ["trapezius"],
  lowerback: ["lower-back"], glutes: ["gluteal"], hamstrings: ["hamstring"], calves: ["calves"],
};

// Cosmetic parts we don't treat as muscles — the outline already carries the
// body shape, so a tiny face/hands/feet would only add noise.
const SKIP = new Set(["head", "hair", "hands", "feet", "ankles", "knees", "neck"]);

const BODY_FILL = "#1d2030";
const BODY_STROKE = "#3d4059";
const MUSCLE_IDLE = "#343953"; // lighter than the body, so the musculature reads

function activeSlugs(muscles, table) {
  const all = muscles.includes("fullbody");
  const out = new Set();
  Object.keys(table).forEach((tok) => {
    if (all || muscles.includes(tok)) table[tok].forEach((s) => out.add(s));
  });
  return out;
}

function View({ parts, active }) {
  return parts
    .filter((p) => !SKIP.has(p.slug))
    .map((p) => {
      const on = active.has(p.slug);
      const ds = [...(p.path.common || []), ...(p.path.left || []), ...(p.path.right || [])];
      return (
        <g key={p.slug} fill={on ? ACCENT : MUSCLE_IDLE} opacity={on ? 0.95 : 1}>
          {ds.map((d, i) => <path key={i} d={d} />)}
        </g>
      );
    });
}

function Figure({ viewBox, outline, parts, active, height, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg viewBox={viewBox} height={height} style={{ display: "block" }} role="img" aria-label={`${label} muscles`}>
        <path
          d={outline}
          fill={BODY_FILL}
          stroke={BODY_STROKE}
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <View parts={parts} active={active} />
      </svg>
      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-faint)" }}>{label}</span>
    </div>
  );
}

export default function MuscleMap({ muscles = [], height = 92 }) {
  const frontActive = activeSlugs(muscles, FRONT_FOR);
  const backActive = activeSlugs(muscles, BACK_FOR);

  // Render only the side that has something lit; if somehow neither does, show
  // both so the row never collapses to nothing.
  let showFront = frontActive.size > 0;
  let showBack = backActive.size > 0;
  if (!showFront && !showBack) { showFront = true; showBack = true; }

  return (
    <div style={{ display: "flex", gap: 12, flex: "0 0 auto", alignItems: "flex-start" }}>
      {showFront && (
        <Figure viewBox="0 140 724 1240" outline={OUTLINE_FRONT} parts={bodyFront} active={frontActive} height={height} label="Front" />
      )}
      {showBack && (
        <Figure viewBox="724 140 724 1240" outline={OUTLINE_BACK} parts={bodyBack} active={backActive} height={height} label="Back" />
      )}
    </div>
  );
}

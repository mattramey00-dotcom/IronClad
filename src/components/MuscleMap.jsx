// ============================================================
//  IRONCLAD — target-muscle map
// ============================================================
//  A small front-and-back mannequin with the worked muscles lit in the accent
//  colour. Inline SVG, so it costs no network and works in the garage with no
//  signal — the same reason the movement demos are SVG. It's a stylized heat
//  map, not an anatomy chart: enough to answer "what does this hit?" at a glance,
//  matching the honesty of the demos (movement cues, not form tutorials).
//
//  Muscle → zone tokens come from musclesFor() in data/program.js.
// ============================================================

import React from "react";
import { ACCENT } from "../data/program.js";

// Zones as [type, ...coords]. "e" = ellipse [cx,cy,rx,ry]; "r" = rect [x,y,w,h,r].
// Front figure is centred on x=36, the back figure on x=118 (a +82 shift).
const FRONT = [
  { m: "shoulders", s: [["e", 23, 25, 5, 4], ["e", 49, 25, 5, 4]] },
  { m: "chest", s: [["e", 30, 31, 5.5, 4.5], ["e", 42, 31, 5.5, 4.5]] },
  { m: "biceps", s: [["e", 17, 35, 3.5, 6], ["e", 55, 35, 3.5, 6]] },
  { m: "forearms", s: [["e", 15, 47, 3, 6], ["e", 57, 47, 3, 6]] },
  { m: "abs", s: [["r", 31, 38, 10, 15, 3]] },
  { m: "obliques", s: [["e", 28, 46, 2.4, 6], ["e", 44, 46, 2.4, 6]] },
  { m: "quads", s: [["e", 30, 68, 4, 9], ["e", 42, 68, 4, 9]] },
  { m: "calves", s: [["e", 30, 86, 3, 7], ["e", 42, 86, 3, 7]] },
];

const BACK = [
  { m: "traps", s: [["e", 118, 25, 8, 5]] },
  { m: "shoulders", s: [["e", 105, 25, 5, 4], ["e", 131, 25, 5, 4]] },
  { m: "lats", s: [["e", 112, 37, 4.5, 7], ["e", 124, 37, 4.5, 7]] },
  { m: "triceps", s: [["e", 99, 35, 3.5, 6], ["e", 137, 35, 3.5, 6]] },
  { m: "lowerback", s: [["r", 113, 44, 10, 10, 3]] },
  { m: "glutes", s: [["e", 113, 59, 5, 5], ["e", 123, 59, 5, 5]] },
  { m: "hamstrings", s: [["e", 112, 70, 4, 8], ["e", 124, 70, 4, 8]] },
  { m: "calves", s: [["e", 112, 86, 3, 7], ["e", 124, 86, 3, 7]] },
];

function paint(s, i, fill, opacity) {
  if (s[0] === "e")
    return <ellipse key={i} cx={s[1]} cy={s[2]} rx={s[3]} ry={s[4]} fill={fill} opacity={opacity} />;
  return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5] || 3} fill={fill} opacity={opacity} />;
}

// One grey body outline, shifted by dx so we can reuse it for front and back.
function Silhouette({ dx }) {
  const pts = (arr) => arr.map(([x, y]) => `${x + dx},${y}`).join(" ");
  return (
    <g fill="#1b241b" stroke="#31402f" strokeWidth="1" strokeLinejoin="round">
      <circle cx={36 + dx} cy={11} r={7} />
      <polygon points={pts([[22, 22], [50, 22], [46, 40], [44, 55], [28, 55], [26, 40]])} />
      <polygon points={pts([[14, 23], [22, 25], [20, 52], [12, 50]])} />
      <polygon points={pts([[50, 25], [58, 23], [60, 50], [52, 52]])} />
      <polygon points={pts([[27, 55], [35, 55], [34, 95], [28, 95]])} />
      <polygon points={pts([[37, 55], [45, 55], [44, 95], [38, 95]])} />
    </g>
  );
}

export default function MuscleMap({ muscles = [], height = 46 }) {
  const set = new Set(muscles);
  const all = set.has("fullbody");
  const on = (m) => all || set.has(m);

  const zones = (list) =>
    list.map((z) => (
      <g key={z.m}>
        {z.s.map((s, i) => paint(s, i, on(z.m) ? ACCENT : "#28342a", on(z.m) ? 0.92 : 1))}
      </g>
    ));

  return (
    <svg viewBox="0 0 154 110" height={height} style={{ display: "block", flex: "0 0 auto" }} role="img" aria-label="Targeted muscles">
      <Silhouette dx={0} />
      <Silhouette dx={82} />
      {zones(FRONT)}
      {zones(BACK)}
      <text x="36" y="108" textAnchor="middle" fontSize="7" fill="#5a6a5a" fontFamily="system-ui" letterSpacing="1">FRONT</text>
      <text x="118" y="108" textAnchor="middle" fontSize="7" fill="#5a6a5a" fontFamily="system-ui" letterSpacing="1">BACK</text>
    </svg>
  );
}

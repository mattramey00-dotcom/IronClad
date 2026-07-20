// ============================================================
//  IRONCLAD — Fuel section motifs
// ============================================================
//  Faint, purely decorative artwork that sits *behind* a Fuel section to give it
//  a sense of place: drifting waves under Water, a slow-drifting amino-acid chain
//  under the protein/targets block, and a plate of food under Meals. They are
//  ornament, not information — aria-hidden, non-interactive, low-opacity, tinted
//  to each section's own colour. Motion is gentle and honours
//  prefers-reduced-motion (the .fa-* classes disable themselves there).
//
//  Layering contract: the parent gives itself `position: relative` (and usually
//  `overflow: hidden`), drops one of these in as the FIRST child, then wraps its
//  real content in a `position: relative; zIndex: 1` div so the numbers always
//  sit on top of the art.
// ============================================================

import React from "react";

const WATER = "86,182,217";  // matches WATER_COLOR
const LEAF = "122,176,138";  // soft fresh green
const EGG = "224,180,74";    // matches the amber protein colour

// ---- Water: two drifting wave fills + a crisp surface line ----
function Waves() {
  const layer = (alpha, dur, bottom) => (
    <svg
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      className="fa-wave"
      style={{ position: "absolute", left: 0, bottom, width: "200%", height: "100%", animationDuration: dur }}
      aria-hidden="true"
    >
      <path d="M0 20 q 30 -13 60 0 t 60 0 t 60 0 t 60 0 V40 H0 Z" fill={`rgba(${WATER},${alpha})`} />
    </svg>
  );
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 54, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {layer(0.06, "11s", 0)}
      {layer(0.11, "7s", -3)}
      <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="fa-wave"
        style={{ position: "absolute", left: 0, bottom: -3, width: "200%", height: "100%", animationDuration: "7s" }} aria-hidden="true">
        <path d="M0 20 q 30 -13 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke={`rgba(${WATER},.3)`} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---- Protein: a slow-drifting amino-acid chain (peptide) ----
//  Built from a repeating zig-zag of linked nodes. The viewBox is 480 wide with
//  the pattern repeating every 240 units, so translating the 200%-wide layer by
//  -50% lands on an identical phase — a seamless, endless drift, same trick as
//  the waves.
function Molecule() {
  const STEP = 24, N = 20, hi = 78, lo = 93; // 20 nodes across 0..480, period 240 (10 nodes); rides the very bottom edge, well clear of the bars
  const nodes = Array.from({ length: N + 1 }, (_, i) => ({ x: i * STEP, y: i % 2 ? lo : hi }));
  const backbone = nodes.map((n, i) => `${i ? "L" : "M"}${n.x} ${n.y}`).join(" ");
  // a side group hanging off every 2nd node, alternating sides — repeats every
  // 2 nodes (48u), a divisor of the 240 period, so the drift stays seamless.
  const branches = nodes.filter((_, i) => i % 2 === 1).map((n) => ({ x: n.x, y: n.y, ex: n.x + 8, ey: n.y > 85 ? n.y - 11 : n.y + 11 }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <svg viewBox="0 0 480 100" preserveAspectRatio="none" className="fa-wave"
        style={{ position: "absolute", left: 0, top: 0, width: "200%", height: "100%", animationDuration: "26s" }} aria-hidden="true">
        <path d={backbone} fill="none" stroke={`rgba(${EGG},.11)`} strokeWidth="1.4" strokeLinejoin="round" />
        {branches.map((b, i) => (
          <line key={`b${i}`} x1={b.x} y1={b.y} x2={b.ex} y2={b.ey} stroke={`rgba(${EGG},.11)`} strokeWidth="1.4" strokeLinecap="round" />
        ))}
        {branches.map((b, i) => (
          <circle key={`bc${i}`} cx={b.ex} cy={b.ey} r="1.7" fill={`rgba(${EGG},.13)`} />
        ))}
        {nodes.map((n, i) => (
          <circle key={`n${i}`} cx={n.x} cy={n.y} r="2.7" fill={`rgba(${EGG},.15)`} stroke={`rgba(${EGG},.2)`} strokeWidth="0.9" />
        ))}
      </svg>
    </div>
  );
}

// ---- Meals: a plain plate of food, line-art ----
function Plate() {
  return (
    <svg viewBox="0 0 100 100" className="fa-bob" aria-hidden="true"
      style={{
        position: "absolute", top: -8, right: -6, width: 96, height: 96,
        pointerEvents: "none", zIndex: 0, fill: "none", stroke: `rgba(${LEAF},.4)`, strokeWidth: 2,
        strokeLinecap: "round", strokeLinejoin: "round",
      }}>
      {/* plate: outer rim + inner well */}
      <circle cx="50" cy="52" r="30" />
      <circle cx="50" cy="52" r="23" />
      {/* food on the plate: a protein mound + two sides */}
      <path d="M38 54c0-5 4-9 9-9s9 4 9 9" />
      <circle cx="44" cy="58" r="4" />
      <circle cx="56" cy="58" r="4" />
      {/* fork (left) and knife (right) framing the plate */}
      <path d="M12 34v10c0 2 1 3 3 3s3-1 3-3V34M15 47v19" />
      <path d="M88 34c-3 1-4 6-4 10s2 5 4 5M86 49v17" />
    </svg>
  );
}

export default function FuelArt({ kind }) {
  if (kind === "waves") return <Waves />;
  if (kind === "food") return <Plate />;
  if (kind === "protein") return <Molecule />;
  return null;
}

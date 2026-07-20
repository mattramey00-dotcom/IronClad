// ============================================================
//  IRONCLAD — Fuel section motifs
// ============================================================
//  Faint, purely decorative artwork that sits *behind* a Fuel section to give it
//  a sense of place: drifting waves under Water, a leaf behind Meals, eggs behind
//  the protein/targets block. They are ornament, not information — aria-hidden,
//  non-interactive, low-opacity, and tinted to each section's own colour so they
//  read as texture rather than clip-art. Motion is gentle and honours
//  prefers-reduced-motion (the .fa-* classes disable themselves there).
//
//  Layering contract: the parent gives itself `position: relative` (and usually
//  `overflow: hidden`), drops one of these in as the FIRST child, then wraps its
//  real content in a `position: relative; zIndex: 1` div so the numbers always
//  sit on top of the art.
// ============================================================

import React from "react";

const WATER = "86,182,217"; // matches WATER_COLOR
const LEAF = "122,176,138"; // soft fresh green
const EGG = "224,180,74";   // matches the amber protein colour

// A corner watermark — one big glyph bleeding off the top-right, clipped by the
// parent's rounded box so it reads as texture tucked under the edge.
const corner = {
  position: "absolute", top: -14, right: -12, width: 118, height: 118,
  pointerEvents: "none", zIndex: 0, fill: "none",
  strokeLinecap: "round", strokeLinejoin: "round",
};

function Waves() {
  const layer = (alpha, cls, dur, bottom) => (
    <svg
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      className={cls}
      style={{ position: "absolute", left: 0, bottom, width: "200%", height: "100%", animationDuration: dur }}
      aria-hidden="true"
    >
      <path d="M0 20 q 30 -13 60 0 t 60 0 t 60 0 t 60 0 V40 H0 Z" fill={`rgba(${WATER},${alpha})`} />
    </svg>
  );
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 54, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {layer(0.06, "fa-wave", "11s", 0)}
      {layer(0.11, "fa-wave", "7s", -3)}
      {/* crisp water line riding the front wave */}
      <svg
        viewBox="0 0 240 40"
        preserveAspectRatio="none"
        className="fa-wave"
        style={{ position: "absolute", left: 0, bottom: -3, width: "200%", height: "100%", animationDuration: "7s" }}
        aria-hidden="true"
      >
        <path d="M0 20 q 30 -13 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke={`rgba(${WATER},.3)`} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Food() {
  return (
    <svg viewBox="0 0 100 100" className="fa-bob" aria-hidden="true"
      style={{ ...corner, stroke: `rgba(${LEAF},.36)`, strokeWidth: 2.1 }}>
      {/* a single leaf across the corner, with a midrib and a few veins */}
      <path d="M16 84 C 16 46 44 18 84 18 C 84 56 56 84 16 84 Z" />
      <path d="M24 78 C 44 56 62 42 78 26" />
      <path d="M39 66 l 9 -11 M52 56 l 11 -10 M31 72 l 8 -9" />
    </svg>
  );
}

function Protein() {
  // A classic egg ovoid, drawn twice (with a whisper of fill so they read as
  // objects, not rings) — the plainest visual read of "protein".
  const egg = "M0 -16 C 8 -16 12 -6 12 1 C 12 10 7 16 0 16 C -7 16 -12 10 -12 1 C -12 -6 -8 -16 0 -16 Z";
  return (
    <svg viewBox="0 0 100 100" className="fa-bob" aria-hidden="true"
      style={{ ...corner, top: -22, right: -14, width: 98, height: 98, stroke: `rgba(${EGG},.26)`, strokeWidth: 2.1, fill: `rgba(${EGG},.05)` }}>
      <g transform="translate(58 38) rotate(-15)"><path d={egg} /></g>
      <g transform="translate(80 64) rotate(15) scale(.72)"><path d={egg} /></g>
    </svg>
  );
}

export default function FuelArt({ kind }) {
  if (kind === "waves") return <Waves />;
  if (kind === "food") return <Food />;
  if (kind === "protein") return <Protein />;
  return null;
}

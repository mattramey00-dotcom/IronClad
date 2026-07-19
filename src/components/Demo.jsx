// ============================================================
//  IRONCLAD — the movement picture
// ============================================================
//  Three tiers, best first:
//    1. the real animated demo   (components/ExerciseGif.jsx, when we have it)
//    2. a real photo flipbook    (here — two frames cross-faded into a rep)
//    3. a quiet icon             (here — when there's neither)
//
//  Tier 3 used to be a hand-drawn animated stick figure per movement pattern.
//  It was the weakest thing in the app: a crude drawing reads as amateur no
//  matter how much detail you pile on, and piling on detail only made it worse.
//  A restrained icon is honest about being a placeholder instead of pretending
//  to be an illustration — so nothing here tries to draw a human body.
// ============================================================

import React, { useState } from "react";
import { ACCENT, EX_IMG, exImg } from "../data/program.js";
import Icon from "./Icon.jsx";

// Cross-fades two real photos (start -> end position) into a looping rep.
function Flipbook({ slug, size = 64, onError }) {
  const imgStyle = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: 10, overflow: "hidden", background: "#0a0d0a" }}>
      <img src={exImg(slug, 0)} alt="" loading="lazy" decoding="async" onError={onError} style={imgStyle} />
      <img src={exImg(slug, 1)} alt="" loading="lazy" decoding="async" onError={onError} style={{ ...imgStyle, animation: "flip 1.8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 1px ${ACCENT}33`, borderRadius: 10, pointerEvents: "none" }} />
    </div>
  );
}

// Movement pattern -> the glyph that stands in for it. Deliberately coarse:
// this is a placeholder, and pretending otherwise is what looked cheap before.
const ICON_FOR = {
  cardio: "run",
  core: "stretch",
};

export default function Demo({ kind, name, size = 64 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const slug = name && EX_IMG[name];

  if (slug && !imgFailed) {
    return <Flipbook slug={slug} size={size} onError={() => setImgFailed(true)} />;
  }

  const glyph = ICON_FOR[kind] || "dumbbell";
  return (
    <div
      style={{
        display: "grid", placeItems: "center", width: size, height: size,
        borderRadius: 10, background: "#0f1017",
        boxShadow: `inset 0 0 0 1px ${ACCENT}22`, color: `${ACCENT}66`,
      }}
      aria-hidden
    >
      <Icon name={glyph} size={Math.round(size * 0.42)} strokeWidth={1.5} />
    </div>
  );
}

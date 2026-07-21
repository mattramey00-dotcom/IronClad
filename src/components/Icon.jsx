// ============================================================
//  IRONCLAD — line-icon set
// ============================================================
//  A small stroked-SVG icon set that replaces the emoji the app used to lean
//  on. Every glyph inherits `currentColor` and a common stroke treatment, so an
//  icon takes the color of whatever text or chip it sits in and stays visually
//  consistent — the opposite of emoji, which each carry their own palette and
//  weight and are what made the UI read as "cheesy".
//
//  Usage: <Icon name="dumbbell" size={16} />

import React from "react";

// The path/shape content for each glyph, drawn on a 24×24 grid.
const PATHS = {
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
    </>
  ),
  utensils: (
    <>
      <path d="M5 3v7a2 2 0 0 0 4 0V3M7 10v11M17 3c-1.5 0-2.5 1.8-2.5 4.5S15.5 12 17 12v9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c1 3-2 4-2 7a2 2 0 1 0 4 0c0-.7-.2-1.2-.4-1.7 1.6.9 2.9 2.7 2.9 5.2a4.5 4.5 0 1 1-9 0C7.5 8.5 11 7 12 3Z" />
    </>
  ),
  run: (
    <>
      <circle cx="15" cy="4.5" r="1.6" />
      <path d="M13 8l-3 2 1 4-3 5M13 8l3 1 3-1M11 14l3 1 1 5" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17l4-6h5M9.5 7h3M15 11l-2.5-4M15 11l1.5 6" />
    </>
  ),
  plane: (
    <>
      <path d="M10.5 3.5a1.4 1.4 0 0 1 3 0V10l7 4v2l-7-2v4l2 1.5v1.5L12 20l-3.5 1.5V20L10.5 18v-4l-7 2v-2l7-4Z" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V8.5M9.5 2h5M18.5 6.5l1.5-1.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 10h6M9 14h6M9 17h4" />
    </>
  ),
  play: (
    <>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </>
  ),
  moon: (
    <>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </>
  ),
  stretch: (
    <>
      <circle cx="12" cy="4.5" r="1.6" />
      <path d="M12 7v6M12 13l-4 8M12 13l4 8M6 10l6 1 6-1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-.6 4M20 5v6h-6" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3ZM14.5 7.5l3 3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  scale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5a3.5 3.5 0 0 1 7 0M8.5 8.5h7" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8L12 3.2Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.7-4.7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  barcode: (
    <>
      <path d="M4 6.5v11M7 6.5v11M9.5 6.5v11M13 6.5v11M15.5 6.5v11M17 6.5v11M20 6.5v11" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2.5" />
      <path d="M4 9.5h16M8 3v4M16 3v4" />
    </>
  ),
  chevron: (
    <>
      <path d="M6 9.5l6 6 6-6" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3.4c3.6 4.6 5.6 7.2 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-2.9 2-5.5 5.6-10.1Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.8 5.8 1.8 5.8H4.2S6 13.5 6 9Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M8.5 5.2A6 6 0 0 1 18 9c0 4.5 1.8 5.8 1.8 5.8h-8" />
      <path d="M6.3 7.9A6 6 0 0 0 6 9c0 4.5-1.8 5.8-1.8 5.8h9" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
      <path d="M4 4l16 16" />
    </>
  ),
};

// Glyphs that are line drawings (stroked) vs. solid shapes (filled). Filled
// glyphs read better small and where a "played/active" feel is wanted.
const FILLED = new Set(["play", "sparkle", "plane"]);

export default function Icon({ name, size = 16, style, strokeWidth = 1.75 }) {
  const content = PATHS[name];
  if (!content) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto", display: "block", ...style }}
    >
      {content}
    </svg>
  );
}

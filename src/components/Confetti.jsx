// ============================================================
//  IRONCLAD — a quick confetti burst
// ============================================================
//  A short, cheap celebration when an exercise is finished. A full-screen canvas
//  that sits above everything (pointer-events off, so it never blocks a tap),
//  fires a burst each time `trigger` changes, and clears itself. No library.
// ============================================================

import React, { useEffect, useRef } from "react";

const COLORS = ["#818cf8", "#54b37e", "#E0B44A", "#e08a6a", "#eaeaf0"];

export default function Confetti({ trigger }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!trigger) return undefined; // 0 = never fired yet
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    // Two small fountains from the lower third, so it reads as a burst rather
    // than rain — quick, then gone.
    const parts = Array.from({ length: 110 }, () => {
      const fromLeft = Math.random() < 0.5;
      return {
        x: W * (fromLeft ? 0.28 : 0.72),
        y: H * 0.62,
        vx: (Math.random() * 2 - 1) * 5 + (fromLeft ? 1.5 : -1.5),
        vy: -(7 + Math.random() * 7),
        g: 0.22 + Math.random() * 0.08,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() * 2 - 1) * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const DURATION = 1500;
    let raf;
    let start;
    const tick = (t) => {
      if (start == null) start = t;
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);
      const alpha = Math.max(0, 1 - elapsed / DURATION);
      parts.forEach((p) => {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (elapsed < DURATION) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 400 }}
    />
  );
}

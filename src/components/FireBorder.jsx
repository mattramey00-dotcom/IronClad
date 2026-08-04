// ============================================================
//  IRONCLAD — the PR fire
// ============================================================
//  When a set beats your best-ever estimated 1RM, the screen edges catch fire.
//  A full-screen canvas (pointer-events off, so it never blocks a tap) emits
//  soft, warm particles along the four borders and lets buoyancy carry them
//  inward and up — additive blending turns the overlap into a convincing flame.
//  It fires each time `trigger` changes, burns for a few seconds, then clears
//  itself. No library, and it honours reduced-motion with a short, calm glow.
// ============================================================

import React, { useEffect, useRef } from "react";

// A soft radial blob, pre-rendered once per flame temperature. Drawing a cached
// sprite is far cheaper than building a gradient per particle per frame, and
// overlapping them with "lighter" blending is what reads as fire.
function sprite(rgb) {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${rgb},0.85)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.30)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  g.fill();
  return c;
}

export default function FireBorder({ trigger }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!trigger) return undefined; // 0 = never fired yet
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // temperature ramp: white-hot core → amber → orange → dying red, plus a
    // brighter spark for the embers.
    const flame = [sprite("255,244,214"), sprite("255,170,66"), sprite("236,84,30"), sprite("150,28,14")];
    const ember = sprite("255,216,150");

    const DURATION = reduce ? 1200 : 3600;
    const EMIT_UNTIL = DURATION - 900; // stop feeding it, let the last flames die
    const parts = [];
    const embers = [];

    // Spawn a flame just outside one edge, aimed inward, with buoyancy pulling it
    // up — the bottom carries the tallest flames, the top only smoulders.
    const spawnFlame = () => {
      const r = Math.random();
      let x, y, nx, ny, horizontal;
      if (r < 0.42) { x = Math.random() * W; y = H + 6; nx = 0; ny = -1; horizontal = false; }      // bottom
      else if (r < 0.67) { x = -6; y = Math.random() * H; nx = 1; ny = 0; horizontal = true; }        // left
      else if (r < 0.92) { x = W + 6; y = Math.random() * H; nx = -1; ny = 0; horizontal = true; }    // right
      else { x = Math.random() * W; y = -6; nx = 0; ny = 1; horizontal = false; }                     // top
      const inward = 30 + Math.random() * 50;
      const buoy = 70 + Math.random() * 70;
      parts.push({
        x, y,
        vx: nx * inward + (horizontal ? 0 : (Math.random() * 2 - 1) * 26),
        vy: ny * inward - buoy,
        life: 0,
        ttl: 0.7 + Math.random() * 0.5,
        size: 30 + Math.random() * 44,
        seed: Math.random() * Math.PI * 2,
      });
    };

    const spawnEmber = () => {
      const fromSide = Math.random() < 0.5;
      embers.push({
        x: fromSide ? (Math.random() < 0.5 ? 4 : W - 4) : Math.random() * W,
        y: fromSide ? Math.random() * H : H - 4,
        vx: (Math.random() * 2 - 1) * 34,
        vy: -(150 + Math.random() * 170),
        life: 0,
        ttl: 0.8 + Math.random() * 0.8,
        size: 2 + Math.random() * 2.5,
        seed: Math.random() * Math.PI * 2,
      });
    };

    let raf, start = null, last = null;
    const tick = (t) => {
      if (start == null) { start = t; last = t; }
      const elapsed = t - start;
      let dt = (t - last) / 1000;
      last = t;
      if (dt > 0.05) dt = 0.05; // clamp after a tab-switch stall

      // envelope: ramp in fast, hold, ease out over the final stretch
      const env = Math.min(1, elapsed / 300) * Math.max(0, Math.min(1, (DURATION - elapsed) / 900));

      if (elapsed < EMIT_UNTIL) {
        const n = Math.round((reduce ? 4 : 9) * env);
        for (let i = 0; i < n; i++) spawnFlame();
        if (!reduce && Math.random() < 0.6 * env) spawnEmber();
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        const lr = p.life / p.ttl;
        if (lr >= 1) { parts.splice(i, 1); continue; }
        p.vx += Math.sin(p.life * 9 + p.seed) * 16 * dt; // lateral flicker
        p.vy -= 26 * dt;                                  // accelerate upward as it burns
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const sp = lr < 0.25 ? flame[0] : lr < 0.5 ? flame[1] : lr < 0.78 ? flame[2] : flame[3];
        const sz = p.size * (1 - lr * 0.35);
        ctx.globalAlpha = env * (1 - lr) * 0.9;
        ctx.drawImage(sp, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        const lr = e.life / e.ttl;
        if (lr >= 1) { embers.splice(i, 1); continue; }
        e.vy += 30 * dt; // embers slow and settle
        e.x += (e.vx + Math.sin(e.life * 12 + e.seed) * 18) * dt;
        e.y += e.vy * dt;
        const sz = e.size * 6;
        ctx.globalAlpha = env * (1 - lr);
        ctx.drawImage(ember, e.x - sz / 2, e.y - sz / 2, sz, sz);
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      if (elapsed < DURATION) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, W, H);
    };
  }, [trigger]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 390 }}
    />
  );
}

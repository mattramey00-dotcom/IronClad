import React, { useState, useRef } from "react";
import { ACCENT, ACCENT_DIM, EX_IMG, exImg } from "../data/program.js";

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

export default function Demo({ kind, name, size = 64 }) {
  const [imgFailed, setImgFailed] = useState(false);
  // Stable unique id so multiple demos on screen don't share gradient defs.
  // Must be declared before any early return so the hook order stays constant
  // across renders (otherwise switching the photo/SVG branch crashes React).
  const uid = useRef("d" + Math.random().toString(36).slice(2, 8)).current;
  const slug = name && EX_IMG[name];
  // Prefer the real-photo flipbook; fall back to the animated SVG if the
  // mapping is missing or an image can't load (e.g. fully offline first run).
  if (slug && !imgFailed) {
    return <Flipbook slug={slug} size={size} onError={() => setImgFailed(true)} />;
  }
  const stroke = ACCENT;
  const base = { width: size, height: size, display: "block" };

  // Limb/segment style: rounded "bone" look
  const bone = { stroke, strokeWidth: 5.2, strokeLinecap: "round", fill: "none" };
  const boneThin = { stroke, strokeWidth: 4, strokeLinecap: "round", fill: "none" };
  const head = (cx, cy, r = 6.2) => <circle cx={cx} cy={cy} r={r} fill={stroke} />;

  return (
    <svg viewBox="0 0 100 100" style={base} aria-hidden>
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
          <stop offset="70%" stopColor={stroke} stopOpacity="0.04" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ACCENT_DIM} />
          <stop offset="50%" stopColor={stroke} />
          <stop offset="100%" stopColor={ACCENT_DIM} />
        </linearGradient>
        <style>{`
          @keyframes ${uid}-press   {0%,100%{transform:translateY(7px)}45%{transform:translateY(-9px)}}
          @keyframes ${uid}-foreF   {0%,100%{transform:rotate(38deg)}45%{transform:rotate(-2deg)}}
          @keyframes ${uid}-foreB   {0%,100%{transform:rotate(-38deg)}45%{transform:rotate(2deg)}}
          @keyframes ${uid}-row     {0%,100%{transform:translateX(11px) rotate(8deg)}50%{transform:translateX(-4px) rotate(-6deg)}}
          @keyframes ${uid}-rowarm  {0%,100%{transform:rotate(20deg)}50%{transform:rotate(-26deg)}}
          @keyframes ${uid}-squat   {0%,100%{transform:translateY(0)}50%{transform:translateY(14px)}}
          @keyframes ${uid}-thigh   {0%,100%{transform:rotate(0deg)}50%{transform:rotate(34deg)}}
          @keyframes ${uid}-shin    {0%,100%{transform:rotate(0deg)}50%{transform:rotate(-40deg)}}
          @keyframes ${uid}-hinge   {0%,100%{transform:rotate(0deg)}50%{transform:rotate(-46deg)}}
          @keyframes ${uid}-hingeA  {0%,100%{transform:rotate(0deg)}50%{transform:rotate(40deg)}}
          @keyframes ${uid}-curlF   {0%,100%{transform:rotate(2deg)}50%{transform:rotate(-118deg)}}
          @keyframes ${uid}-raise   {0%,100%{transform:rotate(8deg)}50%{transform:rotate(-78deg)}}
          @keyframes ${uid}-plank   {0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
          @keyframes ${uid}-pulse   {0%,100%{opacity:.35}50%{opacity:.9}}
          @keyframes ${uid}-bob     {0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
          @keyframes ${uid}-legF    {0%,100%{transform:rotate(26deg)}50%{transform:rotate(-30deg)}}
          @keyframes ${uid}-legB    {0%,100%{transform:rotate(-30deg)}50%{transform:rotate(26deg)}}
          @keyframes ${uid}-armF    {0%,100%{transform:rotate(-32deg)}50%{transform:rotate(34deg)}}
          @keyframes ${uid}-armB    {0%,100%{transform:rotate(34deg)}50%{transform:rotate(-32deg)}}
          @keyframes ${uid}-lungeD  {0%,100%{transform:translateY(0)}50%{transform:translateY(11px)}}
          @keyframes ${uid}-glowP   {0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
          @keyframes ${uid}-spin    {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        `}</style>
      </defs>

      {/* ambient glow + ring + ground */}
      <circle cx="50" cy="50" r="48" fill={`url(#${uid}-glow)`} style={{ transformOrigin: "50px 50px", animation: `${uid}-glowP 3.4s ease-in-out infinite` }} />
      <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeOpacity=".16" strokeWidth="2" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 200" style={{ transformOrigin: "50px 50px", animation: `${uid}-spin 6s linear infinite` }} />

      {/* ---------- PRESS (overhead/bench press pattern) ---------- */}
      {kind === "vertical" && (
        <g>
          <line x1="22" y1="82" x2="78" y2="82" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          {head(50, 34)}
          <path d="M50 40 L50 64" style={bone} />
          <path d="M50 63 L40 80 M50 63 L60 80" style={bone} />
          {/* arms + bar driven up and down */}
          <g style={{ transformOrigin: "50px 50px", animation: `${uid}-press 1.5s ease-in-out infinite` }}>
            <path d="M50 44 L34 36 M50 44 L66 36" style={bone} />
            <rect x="24" y="31" width="52" height="5" rx="2.5" fill={`url(#${uid}-bar)`} />
            <circle cx="26" cy="33.5" r="5" fill={stroke} />
            <circle cx="74" cy="33.5" r="5" fill={stroke} />
          </g>
        </g>
      )}

      {/* ---------- ROW (bent-over row) ---------- */}
      {kind === "horizontal" && (
        <g>
          <line x1="18" y1="80" x2="82" y2="80" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          <g transform="rotate(-22 50 52)">
            {head(34, 40)}
            <path d="M38 44 L66 56" style={bone} />
            <path d="M64 55 L70 78 M60 56 L52 78" style={boneThin} strokeOpacity="0.85" />
            {/* pulling arm + dumbbell */}
            <g style={{ transformOrigin: "44px 48px", animation: `${uid}-rowarm 1.4s ease-in-out infinite` }}>
              <path d="M44 48 L48 66" style={bone} />
              <rect x="43" y="64" width="10" height="9" rx="2.5" fill={`url(#${uid}-bar)`} />
            </g>
          </g>
        </g>
      )}

      {/* ---------- SQUAT ---------- */}
      {kind === "squat" && (
        <g>
          <line x1="20" y1="84" x2="80" y2="84" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          <g style={{ transformOrigin: "50px 50px", animation: `${uid}-squat 1.8s ease-in-out infinite` }}>
            {head(50, 22)}
            {/* bar on back */}
            <rect x="30" y="26" width="40" height="4.5" rx="2.25" fill={`url(#${uid}-bar)`} />
            <circle cx="32" cy="28" r="4.5" fill={stroke} />
            <circle cx="68" cy="28" r="4.5" fill={stroke} />
            <path d="M50 28 L50 48" style={bone} />
          </g>
          {/* legs: hip stays, thigh + shin articulate */}
          <g style={{ transformOrigin: "50px 48px" }}>
            <g style={{ transformOrigin: "50px 48px", animation: `${uid}-thigh 1.8s ease-in-out infinite` }}>
              <path d="M50 48 L42 64" style={bone} />
              <g style={{ transformOrigin: "42px 64px", animation: `${uid}-shin 1.8s ease-in-out infinite` }}>
                <path d="M42 64 L42 84" style={bone} />
              </g>
            </g>
            <g style={{ transformOrigin: "50px 48px", animation: `${uid}-thigh 1.8s ease-in-out infinite` }}>
              <path d="M50 48 L58 64" style={bone} />
              <g style={{ transformOrigin: "58px 64px", animation: `${uid}-shin 1.8s ease-in-out infinite` }}>
                <path d="M58 64 L58 84" style={bone} />
              </g>
            </g>
          </g>
        </g>
      )}

      {/* ---------- HINGE (Romanian deadlift) ---------- */}
      {kind === "hinge" && (
        <g>
          <line x1="22" y1="84" x2="78" y2="84" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          {/* legs fixed */}
          <path d="M50 58 L44 84 M50 58 L56 84" style={bone} />
          {/* torso hinges at hip */}
          <g style={{ transformOrigin: "50px 58px", animation: `${uid}-hinge 1.9s ease-in-out infinite` }}>
            {head(50, 30)}
            <path d="M50 36 L50 58" style={bone} />
            {/* arms hang, bar tracks */}
            <g style={{ transformOrigin: "50px 42px", animation: `${uid}-hingeA 1.9s ease-in-out infinite` }}>
              <path d="M50 42 L50 62" style={boneThin} />
              <rect x="40" y="60" width="20" height="4.5" rx="2.25" fill={`url(#${uid}-bar)`} />
              <circle cx="42" cy="62" r="4.5" fill={stroke} />
              <circle cx="58" cy="62" r="4.5" fill={stroke} />
            </g>
          </g>
        </g>
      )}

      {/* ---------- CURL ---------- */}
      {kind === "curl" && (
        <g>
          {head(50, 26)}
          <path d="M50 32 L50 64" style={bone} />
          <path d="M50 63 L42 82 M50 63 L58 82" style={boneThin} strokeOpacity="0.85" />
          {/* upper arm fixed, forearm curls with dumbbell */}
          <path d="M50 40 L42 56" style={bone} />
          <g style={{ transformOrigin: "42px 56px", animation: `${uid}-curlF 1.5s ease-in-out infinite` }}>
            <path d="M42 56 L42 72" style={bone} />
            <rect x="37" y="70" width="10" height="9" rx="2.5" fill={`url(#${uid}-bar)`} />
          </g>
        </g>
      )}

      {/* ---------- RAISE (lateral raise) ---------- */}
      {kind === "raise" && (
        <g>
          {head(50, 28)}
          <path d="M50 34 L50 66" style={bone} />
          <path d="M50 65 L43 82 M50 65 L57 82" style={boneThin} strokeOpacity="0.85" />
          {/* both arms sweep up from the sides */}
          <g style={{ transformOrigin: "50px 42px", animation: `${uid}-raise 1.6s ease-in-out infinite` }}>
            <path d="M50 42 L66 50" style={bone} />
            <rect x="63" y="47" width="9" height="7" rx="2" fill={`url(#${uid}-bar)`} />
          </g>
          <g style={{ transformOrigin: "50px 42px", animation: `${uid}-raise 1.6s ease-in-out infinite`, scale: "-1 1" }}>
            <path d="M50 42 L66 50" style={bone} />
            <rect x="63" y="47" width="9" height="7" rx="2" fill={`url(#${uid}-bar)`} />
          </g>
        </g>
      )}

      {/* ---------- CORE (plank) ---------- */}
      {kind === "core" && (
        <g style={{ transformOrigin: "50px 50px", animation: `${uid}-plank 2.2s ease-in-out infinite` }}>
          <line x1="16" y1="76" x2="84" y2="76" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          {head(26, 46)}
          {/* straight body line */}
          <path d="M31 49 L72 60" style={{ ...bone, strokeWidth: 6 }} />
          {/* forearm down + leg */}
          <path d="M33 50 L30 74 M30 74 L42 74" style={boneThin} />
          <path d="M70 59 L78 74" style={bone} />
          {/* tension pulse along the spine */}
          <path d="M31 49 L72 60" style={{ stroke: "#fff", strokeWidth: 1.4, strokeLinecap: "round", opacity: 0.6, animation: `${uid}-pulse 1.3s ease-in-out infinite` }} />
        </g>
      )}

      {/* ---------- CARDIO (running) ---------- */}
      {kind === "cardio" && (
        <g style={{ transformOrigin: "50px 50px", animation: `${uid}-bob .5s ease-in-out infinite` }}>
          <line x1="18" y1="82" x2="82" y2="82" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          {/* motion trail */}
          <path d="M20 50 L30 50 M22 60 L34 60" style={{ stroke, strokeOpacity: 0.3, strokeWidth: 3, strokeLinecap: "round", animation: `${uid}-pulse 0.5s linear infinite` }} />
          {head(52, 30)}
          <path d="M52 36 L50 58" style={bone} transform="rotate(6 51 47)" />
          {/* swinging arms */}
          <g style={{ transformOrigin: "52px 40px", animation: `${uid}-armF .5s ease-in-out infinite` }}>
            <path d="M52 40 L60 52" style={boneThin} />
          </g>
          <g style={{ transformOrigin: "52px 40px", animation: `${uid}-armB .5s ease-in-out infinite` }}>
            <path d="M52 40 L44 50" style={boneThin} />
          </g>
          {/* driving legs */}
          <g style={{ transformOrigin: "50px 58px", animation: `${uid}-legF .5s ease-in-out infinite` }}>
            <path d="M50 58 L58 74" style={bone} />
          </g>
          <g style={{ transformOrigin: "50px 58px", animation: `${uid}-legB .5s ease-in-out infinite` }}>
            <path d="M50 58 L42 74" style={bone} />
          </g>
        </g>
      )}

      {/* ---------- LUNGE ---------- */}
      {kind === "lunge" && (
        <g>
          <line x1="18" y1="84" x2="82" y2="84" style={{ stroke, strokeOpacity: 0.25, strokeWidth: 3, strokeLinecap: "round" }} />
          <g style={{ transformOrigin: "50px 50px", animation: `${uid}-lungeD 1.9s ease-in-out infinite` }}>
            {head(50, 28)}
            <path d="M50 34 L50 56" style={bone} />
            {/* dumbbells at sides */}
            <rect x="38" y="46" width="8" height="7" rx="2" fill={`url(#${uid}-bar)`} />
            <rect x="54" y="46" width="8" height="7" rx="2" fill={`url(#${uid}-bar)`} />
          </g>
          {/* front leg bent, back leg extended */}
          <path d="M50 56 L62 70 M62 70 L62 84" style={bone} />
          <path d="M50 56 L38 72 M38 72 L34 84" style={bone} />
        </g>
      )}
    </svg>
  );
}

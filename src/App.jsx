import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ------------------------------------------------------------
//  Persistence shim — uses the browser's localStorage so the
//  app runs in any standard React/Vite environment.
//  (In the original Claude artifact this was window.storage.)
// ------------------------------------------------------------
const store = {
  async get(key) {
    try {
      const value = localStorage.getItem(`ironclad:${key}`);
      return value == null ? null : { value };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(`ironclad:${key}`, value);
    } catch (e) {}
  },
};

// ============================================================
//  IRONCLAD — Progressive Workout PWA
//  Push/Pull/Legs/Strength split with timers, countdowns,
//  exercise demos, and persistent completion tracking.
// ============================================================

const ACCENT = "#39FF6A";
const ACCENT_DIM = "#2bcc52";

// ---- Exercise demo registry: animated SVG figures ----
// Each demo is a tiny looping CSS animation that mimics the movement.
const DEMOS = {
  press: { label: "Pressing motion", kind: "vertical" },
  row: { label: "Rowing motion", kind: "horizontal" },
  squat: { label: "Squat motion", kind: "squat" },
  hinge: { label: "Hip hinge", kind: "hinge" },
  curl: { label: "Curling motion", kind: "curl" },
  raise: { label: "Lateral raise", kind: "raise" },
  core: { label: "Core hold", kind: "core" },
  cardio: { label: "Cardio", kind: "cardio" },
  lunge: { label: "Lunge motion", kind: "lunge" },
};

// ---- Real-photo demo registry ----
// Maps each exercise name to a folder under /public/exercises/ holding two
// frames (0.jpg = start, 1.jpg = end) from the public-domain free-exercise-db
// (https://github.com/yuhonas/free-exercise-db, CC0). The Demo component
// cross-fades the two frames so the movement reads as a rep. Exercises with no
// entry here (cardio, mobility, stretching) fall back to the animated SVG.
const EX_IMG = {
  "Barbell Bench Press": "Barbell_Bench_Press_-_Medium_Grip",
  "Dumbbell Incline Press": "Incline_Dumbbell_Press",
  "Dumbbell Shoulder Press": "Dumbbell_Shoulder_Press",
  "Dumbbell Lateral Raises": "Side_Lateral_Raise",
  "Dumbbell Lateral Raise": "Side_Lateral_Raise",
  "Dumbbell Chest Flyes": "Dumbbell_Flyes",
  "DB Overhead Triceps Extension": "Standing_Dumbbell_Triceps_Extension",
  "Barbell Bent-Over Row": "Bent_Over_Barbell_Row",
  "One-Arm Dumbbell Row": "One-Arm_Dumbbell_Row",
  "Dumbbell Rows": "One-Arm_Dumbbell_Row",
  "Dumbbell Rear Delt Fly": "Seated_Bent-Over_Rear_Delt_Raise",
  "Barbell Romanian Deadlift": "Romanian_Deadlift",
  "Dumbbell Hammer Curl": "Hammer_Curls",
  "Barbell Curl": "Barbell_Curl",
  "Barbell Back Squat": "Barbell_Full_Squat",
  "Dumbbell Walking Lunges": "Dumbbell_Lunges",
  "Dumbbell Goblet Squat": "Goblet_Squat",
  "Goblet Squats": "Goblet_Squat",
  "DB Standing Calf Raise": "Standing_Dumbbell_Calf_Raise",
  "Dumbbell Calf Raises": "Standing_Dumbbell_Calf_Raise",
  "Plank": "Plank",
  "Russian Twists (DB)": "Russian_Twist",
  "Leg Raises": "Flat_Bench_Lying_Leg_Raise",
  "Dumbbell Skull Crushers": "Lying_Dumbbell_Tricep_Extension",
  "DB Bulgarian Split Squat": "Dumbbell_Rear_Lunge",
  "Dumbbell Step-Ups": "Dumbbell_Step_Ups",
  "Barbell Deadlift": "Barbell_Deadlift",
  "Dumbbell Thrusters": "Kettlebell_Thruster",
  "Push-Ups": "Pushups",
};

// Resolve a bundled image path, honoring Vite's base path (e.g. /IronClad/).
const exImg = (slug, frame) => `${import.meta.env.BASE_URL}exercises/${slug}/${frame}.jpg`;

// ---- YouTube demo video registry ----
// Maps each exercise to a hand-picked, highly rated YouTube form tutorial,
// alternating male and female coaches. Videos stream from YouTube's
// privacy-enhanced embed domain, so an internet connection is required;
// the animated/photo demos above remain the instant offline fallback.
const EX_VIDEO = {
  "Barbell Bench Press": { id: "vcBig73ojpE", by: "Jeff Nippard" },
  "Dumbbell Incline Press": { id: "8iPEnn-ltC8", by: "Scott Herman" },
  "Dumbbell Shoulder Press": { id: "guW_ENwLOMI", by: "Form tutorial" },
  "Dumbbell Lateral Raises": { id: "Y29xKcze8Ik", by: "Physique Development" },
  "Dumbbell Lateral Raise": { id: "Y29xKcze8Ik", by: "Physique Development" },
  "Dumbbell Chest Flyes": { id: "eozdVDA78K0", by: "Scott Herman" },
  "DB Overhead Triceps Extension": { id: "wKEONiKiNCk", by: "Megan Davies" },
  "Barbell Bent-Over Row": { id: "FWJR5Ve8bnQ", by: "2 Minute Tutorials" },
  "One-Arm Dumbbell Row": { id: "Qx2f4YwJAu4", by: "Bombshell Fitness" },
  "Dumbbell Rows": { id: "Qx2f4YwJAu4", by: "Bombshell Fitness" },
  "Dumbbell Rear Delt Fly": { id: "OPy1gX4a6Vg", by: "Megan Davies" },
  "Barbell Romanian Deadlift": { id: "_oyxCn2iSjU", by: "Jeff Nippard" },
  "Dumbbell Hammer Curl": { id: "zC3nLlEvin4", by: "Scott Herman" },
  "Barbell Curl": { id: "dDI8ClxRS04", by: "Bodybuilding.com" },
  "Barbell Back Squat": { id: "SbgHegC6lEs", by: "Squat University" },
  "Dumbbell Walking Lunges": { id: "IUMtekTfVVQ", by: "HASfit" },
  "Dumbbell Goblet Squat": { id: "62bDZajYJm0", by: "Girls Gone Strong" },
  "Goblet Squats": { id: "62bDZajYJm0", by: "Girls Gone Strong" },
  "DB Standing Calf Raise": { id: "H6WptvjXkgw", by: "Form tutorial" },
  "Dumbbell Calf Raises": { id: "H6WptvjXkgw", by: "Form tutorial" },
  "Plank": { id: "6LqqeBtFn9M", by: "Calisthenic Movement" },
  "Russian Twists (DB)": { id: "JyUqwkVpsi8", by: "Livestrong Woman" },
  "Leg Raises": { id: "Wp4BlxcFTkE", by: "Livestrong Woman" },
  "Dumbbell Skull Crushers": { id: "WLQizQXoeIg", by: "Heather Robertson" },
  "DB Bulgarian Split Squat": { id: "2C-uNgKwPLE", by: "Scott Herman" },
  "Dumbbell Step-Ups": { id: "aKj-6hgiViA", by: "Coach Lauren" },
  "Barbell Deadlift": { id: "tNn7AlPITOw", by: "Meg Squats" },
  "Dumbbell Thrusters": { id: "M5gEwLTtWbg", by: "CrossFit" },
  "Push-Ups": { id: "bt5b9x9N0KU", by: "Well+Good" },
};

// ---- Full program data ----
const PROGRAM = {
  Monday: {
    title: "Push Day",
    subtitle: "Chest · Shoulders · Triceps",
    warmup: "Treadmill walk/jog: 5–10 minutes",
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bench Press", s: "4 × 6–8", d: "press" },
          { n: "Dumbbell Incline Press", s: "3 × 8–12", d: "press" },
          { n: "Dumbbell Shoulder Press", s: "3 × 8–12", d: "press" },
          { n: "Dumbbell Lateral Raises", s: "3 × 12–15", d: "raise" },
          { n: "Dumbbell Chest Flyes", s: "3 × 10–12", d: "press" },
          { n: "DB Overhead Triceps Extension", s: "3 × 10–12", d: "press" },
        ],
      },
      {
        name: "Finisher",
        exercises: [{ n: "Treadmill incline walk", s: "10 minutes", d: "cardio" }],
      },
    ],
  },
  Tuesday: {
    title: "Pull Day",
    subtitle: "Back · Biceps",
    warmup: "Treadmill walk: 5 minutes",
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bent-Over Row", s: "4 × 6–8", d: "row" },
          { n: "One-Arm Dumbbell Row", s: "3 × 8–12 each", d: "row" },
          { n: "Dumbbell Rear Delt Fly", s: "3 × 12–15", d: "raise" },
          { n: "Barbell Romanian Deadlift", s: "3 × 8–10", d: "hinge" },
          { n: "Dumbbell Hammer Curl", s: "3 × 10–12", d: "curl" },
          { n: "Barbell Curl", s: "3 × 8–10", d: "curl" },
        ],
      },
      {
        name: "Finisher",
        exercises: [{ n: "Treadmill steady jog", s: "15 minutes", d: "cardio" }],
      },
    ],
  },
  Wednesday: {
    title: "Legs + Core",
    subtitle: "Quads · Hams · Calves · Abs",
    warmup: "Treadmill walk: 5–10 minutes",
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Back Squat", s: "4 × 6–8", d: "squat" },
          { n: "Dumbbell Walking Lunges", s: "3 × 10 each", d: "lunge" },
          { n: "Barbell Romanian Deadlift", s: "3 × 8–10", d: "hinge" },
          { n: "Dumbbell Goblet Squat", s: "3 × 10–12", d: "squat" },
          { n: "DB Standing Calf Raise", s: "4 × 15–20", d: "raise" },
        ],
      },
      {
        name: "Core",
        exercises: [
          { n: "Plank", s: "3 × 45–60 sec", d: "core", timer: 60 },
          { n: "Russian Twists (DB)", s: "3 × 20", d: "core" },
          { n: "Leg Raises", s: "3 × 12–15", d: "core" },
        ],
      },
      {
        name: "Finisher",
        exercises: [{ n: "Incline treadmill walk", s: "10 minutes", d: "cardio" }],
      },
    ],
  },
  Thursday: {
    title: "Upper Body Strength",
    subtitle: "Heavy · Low Rep",
    warmup: "Light pressing & rowing to warm joints",
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bench Press", s: "5 × 5", d: "press" },
          { n: "Barbell Bent-Over Row", s: "5 × 5", d: "row" },
          { n: "Dumbbell Shoulder Press", s: "4 × 6–8", d: "press" },
          { n: "One-Arm Dumbbell Row", s: "4 × 8", d: "row" },
          { n: "Dumbbell Lateral Raise", s: "3 × 12", d: "raise" },
          { n: "Barbell Curl", s: "3 × 8", d: "curl" },
          { n: "Dumbbell Skull Crushers", s: "3 × 10", d: "press" },
        ],
      },
      {
        name: "Cardio",
        exercises: [{ n: "Treadmill walk/jog", s: "15 minutes", d: "cardio" }],
      },
    ],
  },
  Friday: {
    title: "Lower Body Strength",
    subtitle: "Strength + Conditioning",
    warmup: "Bodyweight squats & leg swings",
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Back Squat", s: "5 × 5", d: "squat" },
          { n: "Barbell Romanian Deadlift", s: "4 × 6–8", d: "hinge" },
          { n: "DB Bulgarian Split Squat", s: "3 × 8 each", d: "lunge" },
          { n: "Dumbbell Step-Ups", s: "3 × 10 each", d: "lunge" },
          { n: "Dumbbell Calf Raises", s: "4 × 15–20", d: "raise" },
        ],
      },
      {
        name: "Conditioning — 8 rounds",
        exercises: [
          { n: "Sprint", s: "30 seconds", d: "cardio", timer: 30 },
          { n: "Walk", s: "90 seconds", d: "cardio", timer: 90 },
        ],
      },
    ],
  },
  Saturday: {
    title: "Full Body + Intervals",
    subtitle: "Circuit · 4 Rounds",
    warmup: "Dynamic full-body warm-up: 5 minutes",
    blocks: [
      {
        name: "Circuit — 4 rounds (90s rest)",
        exercises: [
          { n: "Dumbbell Thrusters", s: "12 reps", d: "press" },
          { n: "Barbell Deadlift", s: "8 reps", d: "hinge" },
          { n: "Push-Ups", s: "15 reps", d: "press" },
          { n: "Dumbbell Rows", s: "12 each", d: "row" },
          { n: "Goblet Squats", s: "15 reps", d: "squat" },
          { n: "Plank", s: "45 seconds", d: "core", timer: 45 },
        ],
      },
      {
        name: "Treadmill Intervals — 6–8 rounds",
        exercises: [
          { n: "Fast run", s: "1 minute", d: "cardio", timer: 60 },
          { n: "Easy walk", s: "2 minutes", d: "cardio", timer: 120 },
        ],
      },
    ],
  },
  Sunday: {
    title: "Rest & Recovery",
    subtitle: "Mobility · Stretch",
    warmup: "Listen to your body today.",
    blocks: [
      {
        name: "Recovery",
        exercises: [
          { n: "Light walking", s: "Optional", d: "cardio" },
          { n: "Mobility work", s: "10 minutes", d: "core" },
          { n: "Stretching", s: "10–15 minutes", d: "core", timer: 600 },
          { n: "Easy treadmill walk", s: "Optional", d: "cardio" },
        ],
      },
    ],
  },
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ============================================================
//  Animated exercise demo component
// ============================================================
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

function Demo({ kind, name, size = 64 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const slug = name && EX_IMG[name];
  // Prefer the real-photo flipbook; fall back to the animated SVG if the
  // mapping is missing or an image can't load (e.g. fully offline first run).
  if (slug && !imgFailed) {
    return <Flipbook slug={slug} size={size} onError={() => setImgFailed(true)} />;
  }
  const stroke = ACCENT;
  const base = { width: size, height: size, display: "block" };
  // Stable unique id so multiple demos on screen don't share gradient defs
  const uid = useRef("d" + Math.random().toString(36).slice(2, 8)).current;

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

// ============================================================
//  Video demo modal — streams a hand-picked YouTube form tutorial
// ============================================================
function VideoModal({ video, name, onClose }) {
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 480, padding: 14, textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#8a9a8a" }}>Demo · {video.by} · via YouTube</div>
          </div>
          <button style={{ ...S.btnGhost, padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`}
            title={`${name} demo`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#667", marginTop: 8 }}>
          Requires internet · animation stays available offline
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Timer modal
// ============================================================
function TimerModal({ seconds, label, onClose }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            o.start();
            o.stop(ctx.currentTime + 0.6);
          } catch (e) {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = (remaining / seconds) * 100;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "#888" }}>{label}</div>
        <div style={{ position: "relative", width: 200, height: 200, margin: "18px auto" }}>
          <svg viewBox="0 0 120 120" style={{ width: 200, height: 200, transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#222" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 46, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {mm}:{ss}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={S.btnGhost} onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : remaining === 0 ? "Done" : "Resume"}
          </button>
          <button style={S.btnGhost} onClick={() => { setRemaining(seconds); setRunning(true); }}>Reset</button>
          <button style={S.btnAccent} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Set logging panel (per exercise)
// ============================================================
function LogPanel({ exName, today, last, onAdd, onRemove }) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");

  const add = () => {
    if (w === "" && r === "") return;
    onAdd(exName, w === "" ? "—" : w, r === "" ? "—" : r);
    setR("");
    // keep weight prefilled for the next set — common to repeat
  };

  return (
    <div style={S.logPanel}>
      {last && (
        <div style={S.lastRow}>
          <span style={{ color: "#6a7a6a" }}>Last ({last.date.slice(5)}): </span>
          {last.sets.map((s, i) => (
            <span key={i} style={S.lastTag}>{s.w}×{s.r}</span>
          ))}
        </div>
      )}

      {today && today.sets.length > 0 && (
        <div style={S.todaySets}>
          {today.sets.map((s, i) => (
            <div key={i} style={S.setChip}>
              <span style={{ color: "#888", fontSize: 11 }}>{i + 1}</span>
              <span style={{ fontWeight: 700 }}>{s.w}</span>
              <span style={{ color: "#6a7a6a", fontSize: 12 }}>lb ×</span>
              <span style={{ fontWeight: 700 }}>{s.r}</span>
              <button style={S.setX} onClick={() => onRemove(exName, i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={S.logInputs}>
        <div style={S.inputWrap}>
          <input
            type="number" inputMode="decimal" placeholder="0" value={w}
            onChange={(e) => setW(e.target.value)} style={S.numInput}
          />
          <span style={S.inputUnit}>lb</span>
        </div>
        <span style={{ color: "#556", fontSize: 18 }}>×</span>
        <div style={S.inputWrap}>
          <input
            type="number" inputMode="numeric" placeholder="0" value={r}
            onChange={(e) => setR(e.target.value)} style={S.numInput}
          />
          <span style={S.inputUnit}>reps</span>
        </div>
        <button style={S.addSetBtn} onClick={add}>+ Log set</button>
      </div>
    </div>
  );
}

// ============================================================
//  History + progression chart modal
// ============================================================
function HistoryModal({ logs, exercises, onClose, onExport }) {
  const [sel, setSel] = useState(exercises[0] || null);

  // Build chart data: for each session date, plot top set weight & est. 1RM
  const data = (() => {
    if (!sel || !logs[sel]) return [];
    return [...logs[sel]]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const numericSets = entry.sets
          .map((s) => ({ w: parseFloat(s.w), r: parseFloat(s.r) }))
          .filter((s) => !isNaN(s.w) && !isNaN(s.r));
        const topWeight = numericSets.length ? Math.max(...numericSets.map((s) => s.w)) : 0;
        // Epley estimated 1RM from the heaviest set
        const best = numericSets.reduce(
          (acc, s) => {
            const e = s.w * (1 + s.r / 30);
            return e > acc.e ? { e, w: s.w, r: s.r } : acc;
          },
          { e: 0, w: 0, r: 0 }
        );
        return {
          date: entry.date.slice(5),
          top: topWeight,
          e1rm: Math.round(best.e),
        };
      });
  })();

  const hasNumbers = data.some((d) => d.top > 0);

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 460, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>Progression</div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onExport}>⬇ CSV</button>
        </div>

        {exercises.length === 0 ? (
          <div style={{ color: "#889", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
            No logged sets yet. Start logging weights and your progression will chart here.
          </div>
        ) : (
          <>
            <select value={sel || ""} onChange={(e) => setSel(e.target.value)} style={S.select}>
              {exercises.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>

            {hasNumbers ? (
              <div style={{ height: 230, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#1c241c" vertical={false} />
                    <XAxis dataKey="date" stroke="#667" fontSize={11} tickLine={false} />
                    <YAxis stroke="#667" fontSize={11} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={{ background: "#0e120e", border: "1px solid #2a322a", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Line type="monotone" dataKey="top" name="Top set (lb)" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
                    <Line type="monotone" dataKey="e1rm" name="Est. 1RM" stroke="#7a8aff" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ color: "#889", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                This movement only has timed/bodyweight entries — log some weights to see a curve.
              </div>
            )}

            <div style={S.legendRow}>
              <span><span style={{ ...S.dot, background: ACCENT }} /> Heaviest set</span>
              <span><span style={{ ...S.dot, background: "#7a8aff" }} /> Est. 1-rep max</span>
            </div>

            <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 12 }}>
              {[...(logs[sel] || [])].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
                <div key={i} style={S.histRow}>
                  <span style={{ color: "#7a8a7a", fontSize: 12, minWidth: 48 }}>{entry.date.slice(5)}</span>
                  <span style={{ fontSize: 13 }}>
                    {entry.sets.map((s, j) => (
                      <span key={j} style={S.histTag}>{s.w}×{s.r}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <button style={{ ...S.btnAccent, width: "100%", marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ============================================================
//  Main App
// ============================================================
export default function App() {
  const today = DAYS[(new Date().getDay() + 6) % 7]; // JS Sunday=0 -> our index
  const [activeDay, setActiveDay] = useState(today);
  const [done, setDone] = useState({}); // { "Monday::Barbell Bench Press": true }
  const [logs, setLogs] = useState({}); // { "Barbell Bench Press": [ {date, sets:[{w,r}]} ] }
  const [openLog, setOpenLog] = useState(null); // exercise name currently expanded
  const [timer, setTimer] = useState(null);
  const [video, setVideo] = useState(null); // { video: {id, by}, name } currently playing
  const [showHistory, setShowHistory] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  // live clock for the countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // load saved progress + logs
  useEffect(() => {
    (async () => {
      try {
        const res = await store.get("progress");
        if (res && res.value) setDone(JSON.parse(res.value));
      } catch (e) {}
      try {
        const lg = await store.get("logs");
        if (lg && lg.value) setLogs(JSON.parse(lg.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (next) => {
    try { await store.set("progress", JSON.stringify(next)); } catch (e) {}
  }, []);

  const saveLogs = useCallback(async (next) => {
    try { await store.set("logs", JSON.stringify(next)); } catch (e) {}
  }, []);

  const todayStr = () => new Date().toISOString().slice(0, 10);

  // Save a set entry for an exercise on today's date
  const logSet = (exName, weight, reps) => {
    const date = todayStr();
    const next = { ...logs };
    const entries = next[exName] ? [...next[exName]] : [];
    let todayEntry = entries.find((e) => e.date === date);
    if (!todayEntry) {
      todayEntry = { date, sets: [] };
      entries.unshift(todayEntry);
    } else {
      entries.splice(entries.indexOf(todayEntry), 1);
      entries.unshift(todayEntry);
    }
    todayEntry.sets = [...todayEntry.sets, { w: weight, r: reps }];
    next[exName] = entries;
    setLogs(next);
    saveLogs(next);
  };

  const removeSet = (exName, setIdx) => {
    const date = todayStr();
    const next = { ...logs };
    const entries = [...(next[exName] || [])];
    const todayEntry = entries.find((e) => e.date === date);
    if (!todayEntry) return;
    todayEntry.sets = todayEntry.sets.filter((_, i) => i !== setIdx);
    if (todayEntry.sets.length === 0) {
      next[exName] = entries.filter((e) => e.date !== date);
    } else {
      next[exName] = entries;
    }
    setLogs(next);
    saveLogs(next);
  };

  // Get last session before today, for "last time" reference
  const lastSession = (exName) => {
    const entries = logs[exName] || [];
    return entries.find((e) => e.date !== todayStr()) || null;
  };
  const todaySession = (exName) => (logs[exName] || []).find((e) => e.date === todayStr()) || null;

  // Export all logs as CSV download
  const exportCSV = () => {
    const rows = [["date", "exercise", "set", "weight_lb", "reps"]];
    Object.keys(logs).forEach((exName) => {
      [...logs[exName]]
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((entry) => {
          entry.sets.forEach((s, i) => {
            rows.push([entry.date, exName, i + 1, s.w, s.r]);
          });
        });
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironclad-log-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // exercises that have at least one logged session, for the history view
  const loggedExercises = Object.keys(logs).filter((k) => (logs[k] || []).length > 0).sort();

  const toggle = (day, ex) => {
    const key = `${day}::${ex}`;
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    save(next);
  };

  const dayProgress = (day) => {
    const all = PROGRAM[day].blocks.flatMap((b) => b.exercises.map((e) => `${day}::${e.n}`));
    const complete = all.filter((k) => done[k]).length;
    return { complete, total: all.length, pct: all.length ? (complete / all.length) * 100 : 0 };
  };

  const resetDay = (day) => {
    const next = { ...done };
    PROGRAM[day].blocks.forEach((b) => b.exercises.forEach((e) => delete next[`${day}::${e.n}`]));
    setDone(next);
    save(next);
  };

  // Midnight countdown
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  const secsLeft = Math.max(0, Math.floor((endOfDay - now) / 1000));
  const cd = {
    h: String(Math.floor(secsLeft / 3600)).padStart(2, "0"),
    m: String(Math.floor((secsLeft % 3600) / 60)).padStart(2, "0"),
    s: String(secsLeft % 60).padStart(2, "0"),
  };

  const day = PROGRAM[activeDay];
  const prog = dayProgress(activeDay);
  const allDone = prog.total > 0 && prog.complete === prog.total;

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Outfit:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{height:0;width:0}
        @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flip{0%,38%{opacity:0}50%,88%{opacity:1}100%{opacity:0}}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.brand}>IRON<span style={{ color: ACCENT }}>CLAD</span></div>
          <div style={S.tagline}>8–12 week strength block</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={S.countdown}>
            <div style={S.cdLabel}>Day resets in</div>
            <div style={S.cdTime}>{cd.h}:{cd.m}:{cd.s}</div>
          </div>
          <button style={S.statsBtn} onClick={() => setShowHistory(true)}>📈 Progress</button>
        </div>
      </div>

      {/* Day selector */}
      <div style={S.dayRow}>
        {DAYS.map((d) => {
          const p = dayProgress(d);
          const active = d === activeDay;
          const isToday = d === today;
          return (
            <button key={d} onClick={() => setActiveDay(d)} style={{ ...S.dayChip, ...(active ? S.dayChipActive : {}) }}>
              <span style={{ fontWeight: 700 }}>{d.slice(0, 3)}</span>
              {isToday && <span style={S.todayDot} />}
              {p.total > 0 && p.complete === p.total && <span style={{ color: ACCENT }}> ✓</span>}
            </button>
          );
        })}
      </div>

      {/* Day header card */}
      <div style={S.dayCard} key={activeDay}>
        <div style={{ animation: "fade .4s ease" }}>
          <div style={S.dayTitle}>{day.title}</div>
          <div style={S.daySub}>{day.subtitle}</div>
          <div style={S.warmup}>🔥 Warm-Up · {day.warmup}</div>

          <div style={S.progBar}>
            <div style={{ ...S.progFill, width: `${prog.pct}%` }} />
          </div>
          <div style={S.progText}>
            {prog.complete}/{prog.total} complete
            {allDone && <span style={{ color: ACCENT, fontWeight: 700 }}> — Day crushed 💪</span>}
            {prog.complete > 0 && (
              <button style={S.resetBtn} onClick={() => resetDay(activeDay)}>reset</button>
            )}
          </div>
        </div>
      </div>

      {/* Blocks */}
      {day.blocks.map((block, bi) => (
        <div key={bi} style={S.block}>
          <div style={S.blockName}>{block.name}</div>
          {block.exercises.map((ex, ei) => {
            const key = `${activeDay}::${ex.n}`;
            const isDone = !!done[key];
            const isOpen = openLog === ex.n;
            const tSession = todaySession(ex.n);
            return (
              <div key={ei} style={{ ...S.exRow, ...(isDone ? S.exRowDone : {}), flexWrap: "wrap" }}>
                <div style={S.demoWrap}>
                  <Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={56} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...S.exName, ...(isDone ? { textDecoration: "line-through", color: "#666" } : {}) }}>{ex.n}</div>
                  <div style={S.exSets}>{ex.s}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {EX_VIDEO[ex.n] && (
                      <button
                        style={S.demoBtn}
                        onClick={() => setVideo({ video: EX_VIDEO[ex.n], name: ex.n })}
                      >
                        ▶ Demo
                      </button>
                    )}
                    {ex.timer && (
                      <button style={S.timerBtn} onClick={() => setTimer({ seconds: ex.timer, label: ex.n })}>
                        ⏱ Start timer
                      </button>
                    )}
                    <button
                      style={{ ...S.logToggle, ...(isOpen ? S.logToggleOpen : {}) }}
                      onClick={() => setOpenLog(isOpen ? null : ex.n)}
                    >
                      📋 Log {tSession ? `(${tSession.sets.length})` : ""}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggle(activeDay, ex.n)}
                  style={{ ...S.check, ...(isDone ? S.checkDone : {}) }}
                  aria-label="complete"
                >
                  {isDone ? <span style={{ animation: "pop .35s ease" }}>✓</span> : ""}
                </button>
                {isOpen && (
                  <div style={{ flexBasis: "100%", animation: "fade .25s ease" }}>
                    <LogPanel
                      exName={ex.n}
                      today={tSession}
                      last={lastSession(ex.n)}
                      onAdd={logSet}
                      onRemove={removeSet}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div style={S.footer}>
        Progression: add 5 lb to upper-body lifts and 5–10 lb to lower-body lifts every 1–2 weeks once you hit all reps with clean form. Keep 1–2 reps in reserve.
      </div>

      {timer && <TimerModal seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />}
      {video && <VideoModal video={video.video} name={video.name} onClose={() => setVideo(null)} />}
      {showHistory && (
        <HistoryModal
          logs={logs}
          exercises={loggedExercises}
          onClose={() => setShowHistory(false)}
          onExport={exportCSV}
        />
      )}
    </div>
  );
}

// ============================================================
//  Styles
// ============================================================
const S = {
  app: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 600px at 80% -10%, #14241a 0%, #0a0d0b 55%, #060807 100%)",
    color: "#eaeaea",
    fontFamily: "'Outfit', sans-serif",
    padding: "16px 14px 60px",
    maxWidth: 520,
    margin: "0 auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  brand: { fontFamily: "'Archivo Black', sans-serif", fontSize: 30, letterSpacing: -1, lineHeight: 1 },
  tagline: { fontSize: 11, color: "#777", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },
  countdown: { textAlign: "right", background: "rgba(57,255,106,.06)", border: "1px solid rgba(57,255,106,.2)", borderRadius: 12, padding: "8px 12px" },
  cdLabel: { fontSize: 10, color: "#7aa", letterSpacing: 1, textTransform: "uppercase" },
  cdTime: { fontSize: 20, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  statsBtn: { background: "#121613", border: "1px solid #2a322a", color: "#ccc", borderRadius: 10, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  select: { width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 10, color: "#eee", fontSize: 15, padding: "10px 12px", fontFamily: "inherit", outline: "none" },
  legendRow: { display: "flex", gap: 16, fontSize: 12, color: "#99a", marginTop: 10 },
  dot: { display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: "middle" },
  histRow: { display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #141914" },
  histTag: { display: "inline-block", background: "#131813", border: "1px solid #222", borderRadius: 6, padding: "2px 7px", marginRight: 5, color: "#9aa", fontSize: 12 },
  dayRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 14 },
  dayChip: {
    flex: "0 0 auto", background: "#121613", border: "1px solid #1f261f", color: "#bbb",
    borderRadius: 10, padding: "8px 12px", fontSize: 13, cursor: "pointer", position: "relative", fontFamily: "inherit",
  },
  dayChipActive: { background: ACCENT, color: "#06140b", borderColor: ACCENT },
  todayDot: { width: 5, height: 5, borderRadius: "50%", background: ACCENT, position: "absolute", top: 5, right: 6 },
  dayCard: { background: "linear-gradient(135deg,#10160f,#0b0f0c)", border: "1px solid #1c241c", borderRadius: 18, padding: 18, marginBottom: 18 },
  dayTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 26, lineHeight: 1.1 },
  daySub: { color: ACCENT, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  warmup: { fontSize: 13, color: "#9aa", marginTop: 10 },
  progBar: { height: 8, background: "#1a1f1a", borderRadius: 99, overflow: "hidden", marginTop: 14 },
  progFill: { height: "100%", background: `linear-gradient(90deg,${ACCENT_DIM},${ACCENT})`, transition: "width .4s ease", borderRadius: 99 },
  progText: { fontSize: 12, color: "#888", marginTop: 8, display: "flex", alignItems: "center", gap: 8 },
  resetBtn: { marginLeft: "auto", background: "none", border: "1px solid #2a322a", color: "#888", borderRadius: 8, fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" },
  block: { marginBottom: 16 },
  blockName: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#6a7a6a", marginBottom: 8, paddingLeft: 4 },
  exRow: { display: "flex", alignItems: "center", gap: 12, background: "#0e120e", border: "1px solid #181d18", borderRadius: 14, padding: 10, marginBottom: 8, transition: "all .25s ease" },
  exRowDone: { background: "rgba(57,255,106,.05)", borderColor: "rgba(57,255,106,.25)" },
  demoWrap: { flex: "0 0 auto", width: 56, height: 56, borderRadius: 12, background: "#0a0d0a", display: "grid", placeItems: "center", border: "1px solid #161b16" },
  exName: { fontSize: 15, fontWeight: 600 },
  exSets: { fontSize: 13, color: "#8a9a8a", marginTop: 2 },
  timerBtn: { background: "rgba(57,255,106,.1)", border: "1px solid rgba(57,255,106,.3)", color: ACCENT, borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  demoBtn: { background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,90,90,.3)", color: "#ff7a7a", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  logToggle: { background: "#161b16", border: "1px solid #2a322a", color: "#bbb", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  logToggleOpen: { background: "rgba(57,255,106,.12)", borderColor: "rgba(57,255,106,.35)", color: ACCENT },
  logPanel: { marginTop: 10, padding: 12, background: "#0a0d0a", border: "1px solid #181d18", borderRadius: 12 },
  lastRow: { fontSize: 12, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" },
  lastTag: { background: "#131813", border: "1px solid #222", borderRadius: 6, padding: "2px 7px", color: "#9aa", fontSize: 12 },
  todaySets: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  setChip: { display: "flex", alignItems: "center", gap: 8, background: "rgba(57,255,106,.06)", border: "1px solid rgba(57,255,106,.18)", borderRadius: 8, padding: "6px 10px" },
  setX: { marginLeft: "auto", background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" },
  logInputs: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center", flex: "1 1 80px", minWidth: 70 },
  numInput: { width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 8, color: "#eee", fontSize: 16, padding: "8px 34px 8px 10px", fontFamily: "inherit", outline: "none" },
  inputUnit: { position: "absolute", right: 9, fontSize: 11, color: "#667" },
  addSetBtn: { flex: "0 0 auto", background: ACCENT, color: "#06140b", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit" },
  check: {
    flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%", border: "2px solid #2a322a",
    background: "transparent", color: ACCENT, fontSize: 20, fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center",
  },
  checkDone: { background: ACCENT, borderColor: ACCENT, color: "#06140b" },
  footer: { fontSize: 12, color: "#667", lineHeight: 1.6, marginTop: 22, padding: 14, background: "#0c0f0c", borderRadius: 12, border: "1px solid #161b16" },
  modalWrap: { position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 },
  modalCard: { background: "#0e120e", border: "1px solid #1f261f", borderRadius: 22, padding: 26, textAlign: "center", width: "100%", maxWidth: 320 },
  btnGhost: { background: "#161b16", border: "1px solid #2a322a", color: "#ccc", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 14 },
  btnAccent: { background: ACCENT, border: "none", color: "#06140b", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 14 },
};

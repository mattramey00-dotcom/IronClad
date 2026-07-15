// ============================================================
//  IRONCLAD — program data
// ============================================================
//  The six training workouts, the Sunday recovery session, and the shared
//  Together block. Exercises, sets and reps are unchanged from the original
//  weekday-keyed PROGRAM — what's new is:
//
//    id     — workouts are addressed by id, not by weekday, so the scheduler
//             can hand them out in any order (see lib/schedule.js).
//    eq     — the equipment an exercise occupies. Two people in one garage
//             gym contend for everything except `bodyweight`.
//    load   — how much leg / run / upper stress the session carries (0–3).
//             The scheduler uses this to order the rotation so a hard leg
//             day never lands the day after a hard run.
//    bike   — every cardio prescription now has a stationary-bike equivalent,
//             so when both people need cardio the same day, one takes the
//             treadmill and the other takes the bike.
// ============================================================

export const ACCENT = "#39FF6A";
export const ACCENT_DIM = "#2bcc52";

// Equipment an exercise occupies while it is being performed.
export const EQ = {
  BARBELL: "barbell",
  BENCH: "bench",
  DUMBBELL: "dumbbell",
  BODYWEIGHT: "bodyweight",
  CARDIO: "cardio", // treadmill or bike — machine assigned per day
};

// Only bodyweight work is truly conflict-free: one bench, one barbell,
// one set of dumbbells, one treadmill, one bike.
export const isShareable = (ex) => ex.eq === EQ.BODYWEIGHT;

// ---- Animated SVG demo registry (offline fallback) ----
export const DEMOS = {
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
// Folders under /public/exercises/ holding two frames (0.jpg start, 1.jpg end)
// from the public-domain free-exercise-db (CC0). Cross-faded into a rep.
export const EX_IMG = {
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
  Plank: "Plank",
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
export const exImg = (slug, frame) =>
  `${import.meta.env.BASE_URL}exercises/${slug}/${frame}.jpg`;

// ---- YouTube form-tutorial registry ----
export const EX_VIDEO = {
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
  Plank: { id: "6LqqeBtFn9M", by: "Calisthenic Movement" },
  "Russian Twists (DB)": { id: "JyUqwkVpsi8", by: "Livestrong Woman" },
  "Leg Raises": { id: "Wp4BlxcFTkE", by: "Livestrong Woman" },
  "Dumbbell Skull Crushers": { id: "WLQizQXoeIg", by: "Heather Robertson" },
  "DB Bulgarian Split Squat": { id: "2C-uNgKwPLE", by: "Scott Herman" },
  "Dumbbell Step-Ups": { id: "aKj-6hgiViA", by: "Coach Lauren" },
  "Barbell Deadlift": { id: "tNn7AlPITOw", by: "Meg Squats" },
  "Dumbbell Thrusters": { id: "M5gEwLTtWbg", by: "CrossFit" },
  "Push-Ups": { id: "bt5b9x9N0KU", by: "Well+Good" },
};

// Shared warm-up: machine-agnostic so it never blocks the other person.
const WARMUP_CARDIO = {
  treadmill: "Treadmill walk/jog: 5–10 minutes",
  bike: "Bike: 5–10 minutes, easy spin",
};

// ============================================================
//  The six rotation workouts
// ============================================================
//  `load` drives the recovery-aware ordering in lib/schedule.js:
//    leg   0–3  how much the session taxes the legs
//    run   0–3  how much running/high-impact conditioning it carries
//    upper 0–3  how much it taxes the upper body
export const WORKOUTS = [
  {
    id: "push",
    title: "Push Day",
    subtitle: "Chest · Shoulders · Triceps",
    short: "Push",
    warmup: WARMUP_CARDIO,
    load: { leg: 0, run: 1, upper: 3 },
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bench Press", s: "4 × 6–8", d: "press", eq: EQ.BARBELL },
          { n: "Dumbbell Incline Press", s: "3 × 8–12", d: "press", eq: EQ.BENCH },
          { n: "Dumbbell Shoulder Press", s: "3 × 8–12", d: "press", eq: EQ.DUMBBELL },
          { n: "Dumbbell Lateral Raises", s: "3 × 12–15", d: "raise", eq: EQ.DUMBBELL },
          { n: "Dumbbell Chest Flyes", s: "3 × 10–12", d: "press", eq: EQ.BENCH },
          { n: "DB Overhead Triceps Extension", s: "3 × 10–12", d: "press", eq: EQ.DUMBBELL },
        ],
      },
      {
        name: "Finisher",
        exercises: [
          {
            n: "Incline walk",
            s: "10 minutes",
            d: "cardio",
            eq: EQ.CARDIO,
            bike: { n: "Steady ride", s: "12 minutes, moderate resistance" },
          },
        ],
      },
    ],
  },
  {
    id: "pull",
    title: "Pull Day",
    subtitle: "Back · Biceps",
    short: "Pull",
    warmup: WARMUP_CARDIO,
    load: { leg: 1, run: 2, upper: 3 },
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bent-Over Row", s: "4 × 6–8", d: "row", eq: EQ.BARBELL },
          { n: "One-Arm Dumbbell Row", s: "3 × 8–12 each", d: "row", eq: EQ.BENCH },
          { n: "Dumbbell Rear Delt Fly", s: "3 × 12–15", d: "raise", eq: EQ.DUMBBELL },
          { n: "Barbell Romanian Deadlift", s: "3 × 8–10", d: "hinge", eq: EQ.BARBELL },
          { n: "Dumbbell Hammer Curl", s: "3 × 10–12", d: "curl", eq: EQ.DUMBBELL },
          { n: "Barbell Curl", s: "3 × 8–10", d: "curl", eq: EQ.BARBELL },
        ],
      },
      {
        name: "Finisher",
        exercises: [
          {
            n: "Steady jog",
            s: "15 minutes",
            d: "cardio",
            eq: EQ.CARDIO,
            bike: { n: "Steady ride", s: "18 minutes, moderate–hard" },
          },
        ],
      },
    ],
  },
  {
    id: "legs",
    title: "Legs + Core",
    subtitle: "Quads · Hams · Calves · Abs",
    short: "Legs",
    warmup: WARMUP_CARDIO,
    load: { leg: 3, run: 1, upper: 0 },
    hasCore: true, // already carries a core block — never doubled up with Together
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Back Squat", s: "4 × 6–8", d: "squat", eq: EQ.BARBELL },
          { n: "Dumbbell Walking Lunges", s: "3 × 10 each", d: "lunge", eq: EQ.DUMBBELL },
          { n: "Barbell Romanian Deadlift", s: "3 × 8–10", d: "hinge", eq: EQ.BARBELL },
          { n: "Dumbbell Goblet Squat", s: "3 × 10–12", d: "squat", eq: EQ.DUMBBELL },
          { n: "DB Standing Calf Raise", s: "4 × 15–20", d: "raise", eq: EQ.DUMBBELL },
        ],
      },
      {
        name: "Core",
        exercises: [
          { n: "Plank", s: "3 × 45–60 sec", d: "core", timer: 60, eq: EQ.BODYWEIGHT },
          { n: "Russian Twists (DB)", s: "3 × 20", d: "core", eq: EQ.DUMBBELL },
          { n: "Leg Raises", s: "3 × 12–15", d: "core", eq: EQ.BODYWEIGHT },
        ],
      },
      {
        name: "Finisher",
        exercises: [
          {
            n: "Incline walk",
            s: "10 minutes",
            d: "cardio",
            eq: EQ.CARDIO,
            bike: { n: "Easy spin", s: "12 minutes, light resistance" },
          },
        ],
      },
    ],
  },
  {
    id: "upper",
    title: "Upper Body Strength",
    subtitle: "Heavy · Low Rep",
    short: "Upper",
    warmup: { treadmill: "Light pressing & rowing to warm joints", bike: "Light pressing & rowing to warm joints" },
    load: { leg: 0, run: 1, upper: 3 },
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Bench Press", s: "5 × 5", d: "press", eq: EQ.BARBELL },
          { n: "Barbell Bent-Over Row", s: "5 × 5", d: "row", eq: EQ.BARBELL },
          { n: "Dumbbell Shoulder Press", s: "4 × 6–8", d: "press", eq: EQ.DUMBBELL },
          { n: "One-Arm Dumbbell Row", s: "4 × 8", d: "row", eq: EQ.BENCH },
          { n: "Dumbbell Lateral Raise", s: "3 × 12", d: "raise", eq: EQ.DUMBBELL },
          { n: "Barbell Curl", s: "3 × 8", d: "curl", eq: EQ.BARBELL },
          { n: "Dumbbell Skull Crushers", s: "3 × 10", d: "press", eq: EQ.BENCH },
        ],
      },
      {
        name: "Cardio",
        exercises: [
          {
            n: "Walk/jog",
            s: "15 minutes",
            d: "cardio",
            eq: EQ.CARDIO,
            bike: { n: "Steady ride", s: "15–18 minutes" },
          },
        ],
      },
    ],
  },
  {
    id: "lower",
    title: "Lower Body Strength",
    subtitle: "Strength + Conditioning",
    short: "Lower",
    warmup: { treadmill: "Bodyweight squats & leg swings", bike: "Bodyweight squats & leg swings" },
    load: { leg: 3, run: 3, upper: 0 },
    blocks: [
      {
        name: "Workout",
        exercises: [
          { n: "Barbell Back Squat", s: "5 × 5", d: "squat", eq: EQ.BARBELL },
          { n: "Barbell Romanian Deadlift", s: "4 × 6–8", d: "hinge", eq: EQ.BARBELL },
          { n: "DB Bulgarian Split Squat", s: "3 × 8 each", d: "lunge", eq: EQ.DUMBBELL },
          { n: "Dumbbell Step-Ups", s: "3 × 10 each", d: "lunge", eq: EQ.BENCH },
          { n: "Dumbbell Calf Raises", s: "4 × 15–20", d: "raise", eq: EQ.DUMBBELL },
        ],
      },
      {
        name: "Conditioning — 8 rounds",
        exercises: [
          {
            n: "Sprint",
            s: "30 seconds",
            d: "cardio",
            timer: 30,
            eq: EQ.CARDIO,
            bike: { n: "Hard sprint", s: "30 seconds, heavy resistance" },
          },
          {
            n: "Walk",
            s: "90 seconds",
            d: "cardio",
            timer: 90,
            eq: EQ.CARDIO,
            bike: { n: "Easy spin", s: "90 seconds" },
          },
        ],
      },
    ],
  },
  {
    id: "full",
    title: "Full Body + Intervals",
    subtitle: "Circuit · 4 Rounds",
    short: "Full",
    warmup: { treadmill: "Dynamic full-body warm-up: 5 minutes", bike: "Dynamic full-body warm-up: 5 minutes" },
    load: { leg: 2, run: 3, upper: 2 },
    blocks: [
      {
        name: "Circuit — 4 rounds (90s rest)",
        exercises: [
          { n: "Dumbbell Thrusters", s: "12 reps", d: "press", eq: EQ.DUMBBELL },
          { n: "Barbell Deadlift", s: "8 reps", d: "hinge", eq: EQ.BARBELL },
          { n: "Push-Ups", s: "15 reps", d: "press", eq: EQ.BODYWEIGHT },
          { n: "Dumbbell Rows", s: "12 each", d: "row", eq: EQ.DUMBBELL },
          { n: "Goblet Squats", s: "15 reps", d: "squat", eq: EQ.DUMBBELL },
          { n: "Plank", s: "45 seconds", d: "core", timer: 45, eq: EQ.BODYWEIGHT },
        ],
      },
      {
        name: "Intervals — 6–8 rounds",
        exercises: [
          {
            n: "Fast run",
            s: "1 minute",
            d: "cardio",
            timer: 60,
            eq: EQ.CARDIO,
            bike: { n: "Hard effort", s: "1 minute, heavy resistance" },
          },
          {
            n: "Easy walk",
            s: "2 minutes",
            d: "cardio",
            timer: 120,
            eq: EQ.CARDIO,
            bike: { n: "Easy spin", s: "2 minutes" },
          },
        ],
      },
    ],
  },
];

export const WORKOUT_BY_ID = Object.fromEntries(WORKOUTS.map((w) => [w.id, w]));

// ============================================================
//  Sunday — the one day you are both off
// ============================================================
//  It is the only day the schedule can give you together: with one of you
//  lifting every day from Monday to Saturday, Sunday is the sole day neither
//  of you is in the gym. So nothing is scheduled on it and nothing is tracked
//  — no exercises, no checkmarks, no progress bar to leave unfinished. The
//  scheduler never places an off-day run or a Together block here.
export const REST_DAY = {
  title: "Rest Day",
  subtitle: "Both of you · off",
  note: "Nothing scheduled and nothing to check off. If you feel like moving — a walk, a stretch — do it because you want to, not because the app is counting.",
};

// ============================================================
//  The Together block — the only work that needs no machine
// ============================================================
//  Bodyweight and light-dumbbell core, so both of you can do it side by side
//  on the same day. The scheduler appends it to two training days a week
//  (one on each person's day) and never to a Legs day, which already has core.
export const TOGETHER = {
  name: "Together — Core",
  note: "No machines needed — do this one side by side.",
  exercises: [
    { n: "Plank", s: "3 × 45–60 sec", d: "core", timer: 60, eq: EQ.BODYWEIGHT },
    { n: "Russian Twists (DB)", s: "3 × 20", d: "core", eq: EQ.DUMBBELL },
    { n: "Leg Raises", s: "3 × 12–15", d: "core", eq: EQ.BODYWEIGHT },
  ],
};

// ============================================================
//  Off-day cardio — the run you do on the day you aren't lifting
// ============================================================
export const OFF_DAY_CARDIO = {
  treadmill: { n: "Easy run", s: "20–30 minutes, conversational pace", d: "cardio", eq: EQ.CARDIO },
  bike: { n: "Easy ride", s: "25–35 minutes, conversational pace", d: "cardio", eq: EQ.CARDIO },
};

// ============================================================
//  Mobility — the day you aren't lifting and can't run
// ============================================================
//  You get three days a week off the bar and only two of them can carry a run:
//  the third sits directly before a leg day, which is the one place a run must
//  not go. Rather than leave it blank, it takes low-intensity work instead.
//
//  This is NOT a rest day. Sunday is the only rest day, and it's the only day
//  the app is allowed to call rest. This one is machine-free and easy on
//  purpose — it keeps you moving without borrowing from tomorrow's session.
export const MOBILITY = {
  title: "Mobility Day",
  name: "Mobility",
  note: "Easy on purpose — a leg day follows this one. Move, don't train.",
  exercises: [
    { n: "Light walk", s: "15–20 minutes, easy", d: "cardio", eq: EQ.BODYWEIGHT },
    { n: "Mobility work", s: "10 minutes", d: "core", eq: EQ.BODYWEIGHT },
    { n: "Stretching", s: "10–15 minutes", d: "core", timer: 600, eq: EQ.BODYWEIGHT },
  ],
};

// Resolve an exercise for the machine actually assigned to you that day.
// Cardio exercises carry a bike-equivalent prescription; everything else is
// machine-independent and passes straight through.
export function forMachine(ex, machine) {
  if (ex.eq !== EQ.CARDIO || machine !== "bike" || !ex.bike) return ex;
  return { ...ex, n: ex.bike.n, s: ex.bike.s };
}

// Read the prescription string ("4 × 6–8", "3 × 10 each", "4 × 15–20") into the
// numbers the logger needs: how many sets, and a sensible rest between them.
//
// Rest is derived from the low end of the rep range because that's the honest
// signal of intensity — a heavy 4×6 needs the nervous system to reset (2–3 min),
// a 3×15 pump set does not (about a minute). No separate data to maintain; the
// rep scheme already says how hard the set is. Cardio/timed rows ("12 minutes…")
// have no "N ×" and return null — no set count, no auto-rest.
export function prescription(s) {
  const m = /^\s*(\d+)\s*[×x]\s*(\d+)/.exec(s || "");
  if (!m) return null;
  const sets = +m[1];
  const lowReps = +m[2];
  const restSecs = lowReps <= 6 ? 150 : lowReps <= 10 ? 120 : 75;
  return { sets, lowReps, restSecs };
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

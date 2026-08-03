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

export const ACCENT = "#818CF8";
export const ACCENT_DIM = "#6366F1";

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

// ---- animated exercise demos (WorkoutX API) ---------------------------
//  Maps our movements onto the exercise ids used by workoutxapp's API. The ids
//  themselves came from the MIT-licensed public index of that dataset; the GIF
//  bytes are fetched at runtime from workoutxapp with this device's own key and
//  cached (components/ExerciseGif.jsx). The media is © Gym Visual, licensed to
//  the API — which is why we consume their service rather than vendoring files.
//
//  Anything absent here (Plank, Bodyweight Squats, the towel improvisations, …)
//  simply has no honest match in the dataset and falls back to the photo/SVG.
export const EX_GIF = {
  // push
  "Barbell Bench Press": "0025",
  "Dumbbell Incline Press": "0314",
  "DB Overhead Triceps Extension": "2188",
  "Dumbbell Shoulder Press": "0405",
  "Dumbbell Lateral Raises": "0334",
  "Dumbbell Lateral Raise": "0334",
  "Dumbbell Chest Flyes": "0308",
  "Dumbbell Skull Crushers": "0351",
  // pull
  "Barbell Bent-Over Row": "0027",
  "One-Arm Dumbbell Row": "0293",
  "Dumbbell Rows": "0293",
  "Dumbbell Rear Delt Fly": "0383",
  "Barbell Romanian Deadlift": "0085",
  "Dumbbell Hammer Curl": "0313",
  "Barbell Curl": "0031",
  // legs
  "Barbell Back Squat": "0043",
  "Barbell Deadlift": "0032",
  "Dumbbell Walking Lunges": "0336",
  "Dumbbell Goblet Squat": "1760",
  "Goblet Squats": "1760",
  "DB Bulgarian Split Squat": "0410",
  "Dumbbell Step-Ups": "0431",
  "DB Standing Calf Raise": "0417",
  "Dumbbell Calf Raises": "0417",
  "Dumbbell Thrusters": "3305",
  // core
  "Leg Raises": "0620",
  "Russian Twists (DB)": "0687",
  "Russian Twists": "0687",
  // travel / bodyweight stand-ins
  "Push-Ups": "0662",
  "Wide Push-Ups": "1311",
  "Diamond Push-Ups": "0283",
  "Feet-Elevated Push-Ups": "0279",
  "Burpees": "1160",
  "Chair Dips": "0129",
  "Towel Rows": "3165",
  "Single-Arm Towel Row": "3161",
  "Single-Leg RDL": "1757",
  "Bulgarian Split Squat": "2368",
  "Walking Lunges": "1460",
  "Chair Step-Ups": "0431",
  "Plank Shoulder Taps": "3239",
  "Single-Leg Calf Raise": "1373",
  "Prone Reverse Fly": "0383",
  // the last gaps — no exact match in the set, so the nearest honest motion:
  // an air-squat pattern, a plank, a pike push-up, and resistance-band curls
  // standing in for the towel ones. Approximate, but a real demo beats an icon.
  "Bodyweight Squats": "1685",
  "Plank": "0464",
  "Pike Push-Ups": "3662",
  "Towel Curls": "0968",
  "Isometric Towel Curls": "3123",
  // cardio + mobility, so those cards animate too
  "Easy run": "0685",
  "Hard sprint": "0685",
  "Light walk": "3666",
  "Incline walk": "3666",
  "Easy ride": "2138",
  "Steady ride": "2138",
  "Easy spin": "2138",
  "Hard effort": "2138",
  "Mobility work": "1511",
  "Stretching": "1511",
};

export const exGifUrl = (id) => `https://api.workoutxapp.com/v1/gifs/${id}.gif`;

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
            timer: 600,
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
            timer: 900,
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
            timer: 600,
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
            timer: 900,
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
        // A circuit, not straight sets: you run all six stations once (a round),
        // rest, then repeat. The circuit UI tracks the round you're on and rests
        // between rounds rather than checking each move off just once.
        circuit: { rounds: 4, restSecs: 90 },
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
  treadmill: { n: "Easy run", s: "20–30 minutes, conversational pace", d: "cardio", timer: 1200, eq: EQ.CARDIO },
  bike: { n: "Easy ride", s: "25–35 minutes, conversational pace", d: "cardio", timer: 1500, eq: EQ.CARDIO },
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
    { n: "Light walk", s: "15–20 minutes, easy", d: "cardio", timer: 900, eq: EQ.BODYWEIGHT },
    { n: "Mobility work", s: "10 minutes", d: "core", timer: 600, eq: EQ.BODYWEIGHT },
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

// ============================================================
//  Travel mode — the weight-free version of the whole program
// ============================================================
//  A hotel room and a carry-on have no barbell, no dumbbells and no bench, so
//  when Travel mode is on, every loaded lift is swapped for a bodyweight (or
//  improvised — a towel, a chair) movement that trains the same pattern. Cardio
//  and moves that were already bodyweight (planks, push-ups) pass straight
//  through: a run or a plank needs no gym.
//
//  Keyed by exercise NAME, same as the image/video registries. The swap keeps
//  the movement pattern (`d`) so the animated demo still reads right, and marks
//  the result bodyweight so nothing in it contends for equipment.
export const TRAVEL_SUBS = {
  // press
  "Barbell Bench Press": { n: "Push-Ups", s: "4 × 12–20", d: "press" },
  "Dumbbell Incline Press": { n: "Feet-Elevated Push-Ups", s: "3 × 10–15", d: "press" },
  "Dumbbell Chest Flyes": { n: "Wide Push-Ups", s: "3 × 12–15", d: "press" },
  "Dumbbell Shoulder Press": { n: "Pike Push-Ups", s: "3 × 8–12", d: "press" },
  "Dumbbell Thrusters": { n: "Burpees", s: "12 reps", d: "squat" },
  "DB Overhead Triceps Extension": { n: "Chair Dips", s: "3 × 10–15", d: "press" },
  "Dumbbell Skull Crushers": { n: "Diamond Push-Ups", s: "3 × 10–15", d: "press" },
  // pull — no bar, so rows go under a sturdy table with a towel
  "Barbell Bent-Over Row": { n: "Towel Rows", s: "4 × 12–15", d: "row" },
  "One-Arm Dumbbell Row": { n: "Single-Arm Towel Row", s: "3 × 12 each", d: "row" },
  "Dumbbell Rows": { n: "Towel Rows", s: "12 each", d: "row" },
  "Dumbbell Rear Delt Fly": { n: "Prone Reverse Fly", s: "3 × 15", d: "raise" },
  // delts
  "Dumbbell Lateral Raises": { n: "Plank Shoulder Taps", s: "3 × 20", d: "raise" },
  "Dumbbell Lateral Raise": { n: "Plank Shoulder Taps", s: "3 × 20", d: "raise" },
  // curls — self-resisted with a towel
  "Dumbbell Hammer Curl": { n: "Towel Curls", s: "3 × 12", d: "curl" },
  "Barbell Curl": { n: "Isometric Towel Curls", s: "3 × 30 sec", d: "curl" },
  // hinge
  "Barbell Romanian Deadlift": { n: "Single-Leg RDL", s: "3 × 10 each", d: "hinge" },
  "Barbell Deadlift": { n: "Single-Leg RDL", s: "10 each", d: "hinge" },
  // squat / legs
  "Barbell Back Squat": { n: "Bodyweight Squats", s: "4 × 20–25", d: "squat" },
  "Dumbbell Goblet Squat": { n: "Bulgarian Split Squat", s: "3 × 12 each", d: "lunge" },
  "Goblet Squats": { n: "Bodyweight Squats", s: "20 reps", d: "squat" },
  "Dumbbell Walking Lunges": { n: "Walking Lunges", s: "3 × 12 each", d: "lunge" },
  "DB Bulgarian Split Squat": { n: "Bulgarian Split Squat", s: "3 × 12 each", d: "lunge" },
  "Dumbbell Step-Ups": { n: "Chair Step-Ups", s: "3 × 12 each", d: "lunge" },
  "DB Standing Calf Raise": { n: "Single-Leg Calf Raise", s: "4 × 15–20 each", d: "raise" },
  "Dumbbell Calf Raises": { n: "Single-Leg Calf Raise", s: "4 × 15–20 each", d: "raise" },
  // core
  "Russian Twists (DB)": { n: "Russian Twists", s: "3 × 20", d: "core" },
};

// Resolve an exercise for a weight-free (traveling) session. A move with a
// bodyweight stand-in is swapped for it — carrying over the pattern (`d`) so the
// demo animates right and the timer, if any, survives — and marked bodyweight so
// nothing in a travel session contends for equipment. Everything else (cardio,
// moves already bodyweight) passes straight through.
export function forTravel(ex, travel) {
  if (!travel) return ex;
  const sub = TRAVEL_SUBS[ex.n];
  if (!sub) return ex;
  return { ...ex, ...sub, eq: EQ.BODYWEIGHT };
}

// Apply a personal substitution, if the user set one for this movement. Keyed
// by the ORIGINAL name; `_orig` remembers it so the modal can offer to swap
// back, and so completion/logging key off the replacement's own name. A no-op
// (returns the exercise untouched) whenever there's no override — so the whole
// feature is invisible until someone actually swaps something.
export function forSub(ex, subs) {
  const rep = subs?.[ex.n];
  if (!rep || !rep.n) return ex;
  return { ...ex, ...rep, _orig: ex.n, _sub: true };
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
  // A short 45s default keeps the pace up; the timer's 1:00 / 1:30 chips are
  // there for the heavier sets where you want a longer breather.
  const restSecs = 45;
  return { sets, lowReps, restSecs };
}

// ---- which muscles an exercise targets --------------------------------
//  Mapped by NAME, not by animation. The demo `kind` is the movement pattern,
//  and several movements share one — a calf raise and a lateral raise both
//  animate as "raise" but train opposite ends of the body. The name is the only
//  honest key. Order matters: primary movers first, they read left-to-right.
//
//  Tokens line up with the zones drawn in components/MuscleMap.jsx.

export const MUSCLE_LABELS = {
  chest: "Chest", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps",
  forearms: "Forearms", abs: "Abs", obliques: "Obliques", lats: "Lats",
  traps: "Traps", lowerback: "Lower back", glutes: "Glutes", quads: "Quads",
  hamstrings: "Hamstrings", calves: "Calves", fullbody: "Full body",
};

const MUSCLES_BY_NAME = {
  // press
  "Barbell Bench Press": ["chest", "shoulders", "triceps"],
  "Dumbbell Incline Press": ["chest", "shoulders", "triceps"],
  "Dumbbell Chest Flyes": ["chest", "shoulders"],
  "Push-Ups": ["chest", "shoulders", "triceps", "abs"],
  "Dumbbell Shoulder Press": ["shoulders", "triceps"],
  "Dumbbell Thrusters": ["shoulders", "quads", "glutes", "triceps"],
  "DB Overhead Triceps Extension": ["triceps"],
  "Dumbbell Skull Crushers": ["triceps"],
  // row / pull
  "Barbell Bent-Over Row": ["lats", "traps", "shoulders", "biceps", "lowerback"],
  "One-Arm Dumbbell Row": ["lats", "traps", "biceps"],
  "Dumbbell Rows": ["lats", "traps", "biceps"],
  "Dumbbell Rear Delt Fly": ["shoulders", "traps"],
  // curls
  "Barbell Curl": ["biceps", "forearms"],
  "Dumbbell Hammer Curl": ["biceps", "forearms"],
  // delts
  "Dumbbell Lateral Raise": ["shoulders"],
  "Dumbbell Lateral Raises": ["shoulders"],
  // hinge
  "Barbell Romanian Deadlift": ["hamstrings", "glutes", "lowerback"],
  "Barbell Deadlift": ["hamstrings", "glutes", "lowerback", "quads", "traps"],
  // squat / legs
  "Barbell Back Squat": ["quads", "glutes", "hamstrings", "lowerback"],
  "Dumbbell Goblet Squat": ["quads", "glutes"],
  "Goblet Squats": ["quads", "glutes"],
  "Dumbbell Walking Lunges": ["quads", "glutes", "hamstrings"],
  "DB Bulgarian Split Squat": ["quads", "glutes", "hamstrings"],
  "Dumbbell Step-Ups": ["quads", "glutes"],
  "DB Standing Calf Raise": ["calves"],
  "Dumbbell Calf Raises": ["calves"],
  // core
  "Plank": ["abs", "obliques"],
  "Leg Raises": ["abs"],
  "Russian Twists (DB)": ["obliques", "abs"],
  // travel-mode bodyweight stand-ins (see TRAVEL_SUBS)
  "Feet-Elevated Push-Ups": ["chest", "shoulders", "triceps"],
  "Wide Push-Ups": ["chest", "shoulders"],
  "Diamond Push-Ups": ["triceps", "chest"],
  "Pike Push-Ups": ["shoulders", "triceps"],
  "Chair Dips": ["triceps", "chest", "shoulders"],
  "Burpees": ["quads", "glutes", "chest", "shoulders"],
  "Plank Shoulder Taps": ["shoulders", "abs"],
  "Towel Rows": ["lats", "traps", "biceps"],
  "Single-Arm Towel Row": ["lats", "traps", "biceps"],
  "Prone Reverse Fly": ["shoulders", "traps"],
  "Towel Curls": ["biceps", "forearms"],
  "Isometric Towel Curls": ["biceps", "forearms"],
  "Single-Leg RDL": ["hamstrings", "glutes", "lowerback"],
  "Bodyweight Squats": ["quads", "glutes"],
  "Bulgarian Split Squat": ["quads", "glutes", "hamstrings"],
  "Walking Lunges": ["quads", "glutes", "hamstrings"],
  "Chair Step-Ups": ["quads", "glutes"],
  "Single-Leg Calf Raise": ["calves"],
  "Russian Twists": ["obliques", "abs"],
  "Mobility work": ["fullbody"],
  "Stretching": ["fullbody"],
  // cardio (treadmill or bike — legs + conditioning either way)
  "Light walk": ["quads", "hamstrings", "calves"],
  "Incline walk": ["quads", "hamstrings", "calves"],
  "Easy run": ["quads", "hamstrings", "calves"],
  "Easy ride": ["quads", "hamstrings", "calves"],
  "Steady ride": ["quads", "hamstrings", "calves"],
};

// Safety net for anything not named above (e.g. a future movement): fall back to
// a sensible default for its animation pattern rather than showing nothing.
const MUSCLES_BY_KIND = {
  vertical: ["chest", "shoulders", "triceps"],
  horizontal: ["lats", "traps", "biceps"],
  squat: ["quads", "glutes"],
  hinge: ["hamstrings", "glutes", "lowerback"],
  curl: ["biceps", "forearms"],
  raise: ["shoulders"],
  core: ["abs"],
  cardio: ["quads", "hamstrings", "calves"],
  lunge: ["quads", "glutes", "hamstrings"],
};

export function musclesFor(ex) {
  return MUSCLES_BY_NAME[ex.n] || MUSCLES_BY_KIND[DEMOS[ex.d]?.kind] || ["fullbody"];
}

// ---- accessory library ------------------------------------------------
//  Movements beyond the daily program, so the tap-a-muscle picker has real
//  depth — cables, machines, isolation work. Each is { n, s, d, m: muscles,
//  gif } where the gif reuses the established WorkoutX id for the same movement
//  pattern (the app's "nearest honest motion" rule — a real animation of the
//  matching lift beats an icon). A few isolation machines with no honest analog
//  carry no gif and fall back to the photo/line demo, exactly as elsewhere.

export const LIBRARY = [
  // chest
  { n: "Incline Barbell Press", s: "4 × 8", d: "press", m: ["chest", "shoulders", "triceps"], gif: "0314" },
  { n: "Cable Chest Fly", s: "3 × 12–15", d: "press", m: ["chest", "shoulders"], gif: "0308" },
  { n: "Machine Chest Press", s: "3 × 10–12", d: "press", m: ["chest", "triceps", "shoulders"], gif: "0025" },
  { n: "Decline Push-Ups", s: "3 × 12–15", d: "press", m: ["chest", "shoulders", "triceps"], gif: "0279" },
  // shoulders
  { n: "Arnold Press", s: "3 × 10", d: "press", m: ["shoulders", "triceps"], gif: "0405" },
  { n: "Barbell Overhead Press", s: "4 × 6–8", d: "press", m: ["shoulders", "triceps"], gif: "0405" },
  { n: "Cable Lateral Raise", s: "3 × 15", d: "raise", m: ["shoulders"], gif: "0334" },
  { n: "Face Pull", s: "3 × 15", d: "row", m: ["shoulders", "traps"], gif: "0383" },
  { n: "Dumbbell Shrug", s: "3 × 12–15", d: "raise", m: ["traps"] },
  // back
  { n: "Lat Pulldown", s: "3 × 10–12", d: "row", m: ["lats", "biceps"], gif: "0293" },
  { n: "Seated Cable Row", s: "3 × 10–12", d: "row", m: ["lats", "traps", "biceps"], gif: "0293" },
  { n: "Pull-Ups", s: "3 × AMRAP", d: "row", m: ["lats", "biceps"], gif: "0293" },
  { n: "Chin-Ups", s: "3 × AMRAP", d: "row", m: ["lats", "biceps"], gif: "0293" },
  // biceps
  { n: "Preacher Curl", s: "3 × 10", d: "curl", m: ["biceps"], gif: "0031" },
  { n: "Cable Curl", s: "3 × 12", d: "curl", m: ["biceps", "forearms"], gif: "0031" },
  { n: "Concentration Curl", s: "3 × 12", d: "curl", m: ["biceps"], gif: "0313" },
  // triceps
  { n: "Tricep Pushdown", s: "3 × 12–15", d: "press", m: ["triceps"], gif: "2188" },
  { n: "Overhead Cable Extension", s: "3 × 12", d: "press", m: ["triceps"], gif: "2188" },
  { n: "Bench Dips", s: "3 × 12", d: "press", m: ["triceps", "chest"], gif: "0129" },
  { n: "Close-Grip Bench Press", s: "4 × 8", d: "press", m: ["triceps", "chest"], gif: "0025" },
  // legs
  { n: "Leg Press", s: "4 × 10–12", d: "squat", m: ["quads", "glutes"], gif: "0043" },
  { n: "Front Squat", s: "4 × 6–8", d: "squat", m: ["quads", "glutes"], gif: "0043" },
  { n: "Hip Thrust", s: "3 × 10–12", d: "hinge", m: ["glutes", "hamstrings"], gif: "0085" },
  { n: "Lying Leg Curl", s: "3 × 12–15", d: "hinge", m: ["hamstrings"] },
  { n: "Leg Extension", s: "3 × 12–15", d: "squat", m: ["quads"] },
  { n: "Seated Calf Raise", s: "4 × 15–20", d: "raise", m: ["calves"], gif: "0417" },
  // core
  { n: "Hanging Leg Raise", s: "3 × 12–15", d: "core", m: ["abs"], gif: "0620" },
  { n: "Bicycle Crunch", s: "3 × 20", d: "core", m: ["abs", "obliques"], gif: "0687" },
  { n: "Cable Crunch", s: "3 × 15", d: "core", m: ["abs"] },
  { n: "Side Plank", s: "3 × 30 sec", d: "core", m: ["obliques", "abs"], gif: "0464" },
  // forearms
  { n: "Wrist Curls", s: "3 × 15", d: "curl", m: ["forearms"], gif: "0968" },
];

// Fold the library into the shared lookups so its movements animate and light
// the right muscles everywhere, exactly like the program's own.
LIBRARY.forEach((e) => {
  if (!MUSCLES_BY_NAME[e.n]) MUSCLES_BY_NAME[e.n] = e.m;
  if (e.gif && !EX_GIF[e.n]) EX_GIF[e.n] = e.gif;
});

// ---- swap suggestions -------------------------------------------------
//  When a movement doesn't work for you, some replacements keep the day's plan
//  intact — they hit the same primary muscle, so the week's balance is unchanged
//  — and some deliberately change what the slot trains. Both are drawn from the
//  program's own movements, so each carries a real animation and muscle map. The
//  index is built once from WORKOUTS.

const ALL_EX = (() => {
  const out = {};
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      // Real lifts only — cardio (d: "cardio") isn't a strength-exercise swap.
      if (typeof node.n === "string" && typeof node.d === "string" && node.d !== "cardio" && !out[node.n]) {
        out[node.n] = { n: node.n, s: node.s, d: node.d };
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(WORKOUTS);
  return out;
})();

// The program's own set/rep scheme for a movement — reused for a swap so a
// same-muscle replacement keeps the day's volume identical.
export function programScheme(name) {
  return ALL_EX[name]?.s || null;
}

// Every strength movement in the program that trains a given muscle token, with
// the exercises that hit it as a primary mover listed first. Powers the
// tap-a-muscle targeted-work picker.
export function exercisesForMuscle(token) {
  // Program movements first, then the accessory library — deduped by name.
  const pool = [];
  const seen = new Set();
  [...Object.values(ALL_EX), ...LIBRARY].forEach((c) => {
    if (seen.has(c.n)) return;
    seen.add(c.n);
    pool.push({ n: c.n, s: c.s, d: c.d });
  });
  const list = pool.filter((c) => (MUSCLES_BY_NAME[c.n] || []).includes(token));
  list.sort(
    (a, b) =>
      Number((MUSCLES_BY_NAME[b.n] || [])[0] === token) - Number((MUSCLES_BY_NAME[a.n] || [])[0] === token),
  );
  return list;
}

// Every strength movement the app knows — the program's own lifts plus the
// accessory library, deduped and alphabetised. Powers the swap field's
// autocomplete so a manual replacement is picked from real, mapped movements
// (each carries a scheme, animation and muscle map) rather than typed blind.
export const EXERCISE_CATALOG = (() => {
  const pool = [];
  const seen = new Set();
  [...Object.values(ALL_EX), ...LIBRARY].forEach((c) => {
    if (seen.has(c.n)) return;
    seen.add(c.n);
    pool.push({ n: c.n, s: c.s, d: c.d });
  });
  pool.sort((a, b) => a.n.localeCompare(b.n));
  return pool;
})();

// Resolve a typed name to a known movement (case-insensitive), so a swap picks
// up the library entry's scheme + demo kind when the name matches one.
export function findExercise(name) {
  const q = (name || "").trim().toLowerCase();
  if (!q) return null;
  return EXERCISE_CATALOG.find((c) => c.n.toLowerCase() === q) || null;
}

export function swapSuggestions(exName) {
  const base = ALL_EX[exName];
  const primary = (MUSCLES_BY_NAME[exName] || [])[0];
  const keep = []; // same primary muscle → the day still trains what it planned
  const shift = []; // same movement pattern, different target → changes the plan
  Object.values(ALL_EX).forEach((c) => {
    if (c.n === exName) return;
    const cPrimary = (MUSCLES_BY_NAME[c.n] || [])[0];
    if (primary && cPrimary === primary) keep.push(c);
    else if (base && c.d === base.d) shift.push(c);
  });
  // Among the schedule-safe picks, surface the same movement pattern first.
  keep.sort((a, b) => Number(base && b.d === base.d) - Number(base && a.d === base.d));
  return { keep: keep.slice(0, 6), shift: shift.slice(0, 4) };
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

# IRONCLAD — Design & Feature Spec

This document describes what the app does and how it is laid out, for a designer
picking it up. The whole UI is implemented in `src/App.jsx`.

---

## Concept

A self-contained workout tracker for **two people sharing one home gym** — one
treadmill, one bike, one bench, one barbell, one set of dumbbells. They train on
alternating days so they never contend for a machine, swapping schedules each
week, and rest together on Sunday.

The user opens it daily, sees what *they* are assigned and what their *partner*
is doing, runs timers for timed movements, logs the weight and reps of each set,
checks off completed exercises, and reviews their own progression over time.
Mobile-first, installable as a PWA, one profile per phone.

### The core idea

The program is **not keyed to weekdays**. Each person cycles the same six
workouts, one per training day. If it were weekday-keyed, splitting the calendar
between two people would amputate the program — Mon/Wed/Fri would mean two leg
days and no pull day, forever, and Tue/Thu/Sat would mean no dedicated leg day.
Instead each person works through the full rotation, taking about two weeks to
complete it, and both get everything.

---

## Visual language

- **Mood:** dark, high-contrast, "gym at night." Near-black background with a
  radial green-tinted glow in the top-right.
- **Accent:** electric green `#39FF6A`, used for active states, progress fill,
  checkmarks, timers, and the primary chart line. Secondary green `#2BCC52`.
- **Type:** "Archivo Black" (heavy display) for the logo, day titles, and modal
  headers; "Outfit" for everything else.
- **Shape:** rounded cards (14–22px radius), soft 1px borders in dark green-gray,
  pill-shaped progress bars and chips.
- **Motion:** exercise demos animate continuously; checkmarks "pop" on completion;
  panels fade in; a faint accent ring slowly rotates around each demo.

---

## Screens & components

### 0. First run — Setup
Either **create the plan** (two names, who takes Mon/Wed/Fri this first week, how
many off-day cardio sessions) or **join** one by pasting a partner's plan code.
Creating produces a base64 **plan code** to text to the other person; both phones
then derive the same calendar forever, offline. Joining asks which of the two
people this phone belongs to.

### 1. Header
- Wordmark "IRON**CLAD**" (the second half in accent green) + tagline.
- **Daily countdown** card: live `HH:MM:SS` until midnight, when the day resets.
  (Real — completion is keyed by date.)
- **Progress** button opens the history/chart modal; **⚙** opens Settings.

### 2. Who's who
- A green chip with your name (tap for Settings) and a muted "with <partner>" chip.

### 3. Week strip
- Horizontal scroll row of 7 day cells (Mon–Sun), each showing **your** assignment
  (workout short name / Run / Ride / Core / Off / Rest) and, underneath, what your
  **partner** is doing that day. A ✦ marks a Together-core day.
- Days you're active on are tinted; the selected day is outlined green; today has a dot.

### 4. Day card
- **Training day:** workout title + muscle-group subtitle, warm-up, a **machine chip**
  ("🏃 Treadmill · Sarah on the bike"), progress bar with "X/Y complete" and a "Day
  crushed" badge at 100%, and a reset link once anything is checked.
- **Light day** (partner's gym day, but you have a run and/or the core block): shows
  what you *do* have.
- **Rest day** (your partner has the gym, you have nothing): says so plainly.
- **Sunday:** "Rest Day / Both of you · off" — no exercises, no checkmarks, no
  progress bar. A rest day with a to-do list isn't a rest day.

### 5. Partner card
- What your partner is doing today, which machine they're on, and whether the core
  block is shared today.

### 6. Exercise rows (grouped into blocks: Workout / Finisher / Core / Together / etc.)
Each row has:
- An **animated SVG demo** (left) showing the movement pattern.
- Exercise name + prescribed sets×reps.
- A **target-muscle map**: a small front-and-back mannequin (inline SVG, tinted in
  the accent) with the worked muscles lit, plus the muscle names in text (the primary
  mover in accent). Muscles are mapped by exercise *name*, not by animation — a calf
  raise and a lateral raise share the "raise" demo but light opposite ends of the body.
  It's a stylized heat map, not an anatomy chart, matching the demos' honesty.
- A **timer button** (only on timed movements — planks, sprints, intervals).
- A **log button** that expands the logging panel; shows today's set count.
- A circular **completion checkmark** (right) that fills green when tapped.

### 7. Log panel (expands under an exercise)
- **Set tracker** at the top: "Set 3 of 4" with a row of dots that fill (✓) as
  you log, the next set outlined, any extra sets past the target shown dimmed.
  The target set count is parsed from the prescription ("4 × 6–8" → 4). Cardio and
  timed rows have no "N ×" and so show no tracker.
- "Last (MM-DD): 135×8 135×8" reference line from your previous session.
- Today's logged sets as chips with a delete (×) control.
- Weight + reps number inputs and a "+ Log set N" button (N = the set you're
  about to do). Weight stays prefilled between sets for fast entry.

### 7b. Rest timer (sticky, between sets)
- Logging a set on **today** starts a countdown pinned just above the tab bar, so
  it survives scrolling, collapsing the panel, or switching tabs — you're not
  babysitting the row you just logged.
- Duration is **derived from the rep range**, not a fixed value: heavy low-rep
  work (≤6 reps) rests 2:30, mid-rep 2:00, high-rep pump sets 1:15. The rep scheme
  already encodes intensity, so there's no separate rest data to maintain.
- Live **−15 / +15** adjustment and **Skip**. At zero it flips to a green "GO ·
  next set" state, plays a rising two-note chime, and buzzes (`navigator.vibrate`),
  then clears itself a few seconds later.
- Back-filling a past day's workout does **not** start a rest timer — a countdown
  for Tuesday's session logged on Thursday is noise.

### 8. Timer modal (for timed *movements*)
- Full-screen overlay, large circular progress ring counting down. This is for the
  exercise itself — planks, sprints, carries — distinct from the between-sets rest
  bar above.
- Pause / Resume, Reset, Close. Plays a short beep at zero.

### 9. History / progression modal
- Exercise dropdown. **Scoped to the signed-in profile** — your chart is yours.
- Line chart (recharts): solid green = heaviest set per session; dashed blue =
  estimated 1-rep max (Epley formula).
- Scrollable dated session history below the chart.
- **CSV export** button downloads your full log (date, exercise, set, weight, reps).

### 9b. Fuel card (every day, including Sunday)
- Two bars: **protein** (amber — a floor you're trying to clear) and **calories** (green — a
  ceiling you're trying to stay under). Deliberately different colours, because they are
  different *kinds* of number and painting both green would imply they behave the same way.
- Targets are derived from the person's **measured TDEE**, not a calculator, and shift as the
  measurement sharpens. The card says so ("target from your own TDEE").
- Today's meals as rows, with a source tag (📷 photo / AI / nothing for manual).
- Three ways in — **📷 Photo**, **✍️ Describe**, **＋ By hand** — all landing in the same
  editable draft.
- A daily **weigh-in** field. This is not optional garnish: without it there is no TDEE.
- **On Sunday the bars disappear.** Intake is still recorded (a gap would bias the TDEE
  estimate low) but it's shown as a plain read-out — `0 kcal · 0 g protein` — with no targets
  and no completion framing. Sunday is a rest day from *training*, not from eating, and it
  must not acquire a scoreboard.

### 9c. Meal draft (the review step)
- The model's estimate arrives as an **editable form**, never a saved entry: name, the itemised
  breakdown it saw, and four number fields (kcal / protein / carbs / fat).
- A **caveat** strip in amber naming the single biggest source of error in *this* meal
  ("can't tell how much oil the chicken was cooked in"), plus the model's own confidence.
- Save or Discard. Nothing reaches the log without a human pressing Save.

> **Important:** photo calorie estimates are **±20–30%** — worst on mixed dishes and sauces,
> best on protein. That is not a model limitation, it's information that isn't in the
> photograph. The feature is built for *trend*, which is what the TDEE math needs; it is not
> built for precision, and the UI should never imply otherwise.

### 9d. Insights modal
- **Measured TDEE** with a plausible range, or an honest "not enough data yet" listing exactly
  what's still missing (`3/10 days of meals logged, 2/6 weigh-ins`).
- Four stat boxes: bodyweight + slope, 28-day est. 1RM change, protein (with g/lb), intake.
- **Weight vs strength chart** — green bodyweight line against a dashed blue strength index.
  Each lift is scored against its *own* starting point (100 = start), so the rotation putting
  squats in one week and presses in the next doesn't move the line. Green down + blue up
  crossing = recomposition, and it looks like exactly that.
- Verdict cards (protein adequacy, the recomp quadrant, gap-to-target).
- Goal selector: Lose fat / Recomp / Maintain / Build.
- **"What does this say about my training?"** — the one narrative AI call, fed the computed
  numbers only.

### 10. Settings
- Which person this phone belongs to.
- The current rotation order.
- The **plan code**, to copy and send to the other phone. Contains no personal data and no key.
- **Anthropic API key** (optional) — masked, with a reveal toggle. The exposure is stated in
  the UI, not buried in a doc: no backend means the key lives in this phone's storage, and
  anyone holding the unlocked phone could read it. Everything except the three AI calls works
  without one.
- **Model** — Opus 4.8 (default) or Haiku 4.5, with the per-photo cost shown.
- "Start over" (double-tap to confirm) — erases everything on this device, key included.

---

## The animated exercise demos

Implemented in the `Demo` component as inline SVG with CSS keyframe animations.
Each `kind` is a jointed figure whose limbs articulate to match the lift:

| kind          | movement shown                                  |
|---------------|-------------------------------------------------|
| `vertical`    | overhead/bench press — arms drive a barbell up  |
| `horizontal`  | bent-over row — arm pulls a dumbbell to ribs    |
| `squat`       | barbell back squat — hips drop, knees bend      |
| `hinge`       | Romanian deadlift — torso pivots at the hip     |
| `curl`        | biceps curl — forearm rotates through the arc   |
| `raise`       | lateral raise — both arms sweep to shoulder ht  |
| `core`        | plank — held body line with a tension pulse     |
| `cardio`      | running — alternating arms and driving legs     |
| `lunge`       | lunge — split stance descends and rises         |

> **Important:** these are stylized *movement cues* showing path and tempo, not
> form tutorials. They intentionally omit bracing, exact depth, and bar-path
> nuance. If the product wants true form guidance, that's a separate content
> effort (illustrated guides or video), not a tweak to these.

Design freedom here is wide open — these could be replaced with custom
illustrations, Lottie animations, or video loops without touching the app logic,
as long as each exercise maps to one of the `kind` values (or the mapping in the
`DEMOS` object is updated).

---

## The schedule

`lib/schedule.js` derives the whole calendar from `(plan, date)` with pure
functions — nothing about it is stored, which is why both phones agree without a
backend. What it decides:

| Decision | Rule |
|---|---|
| Who trains | Schedule A = Mon/Wed/Fri, B = Tue/Thu/Sat, swapping every week |
| Which workout | Rotation position derived from training days elapsed since the plan's anchor Monday |
| Rotation order | All 720 permutations scored; lowest penalty wins. A hard leg day must not follow a hard run; no back-to-back leg days; alternate upper/lower. The cyclic wrap-around pair is scored too |
| Off-day cardio | Up to N runs/week (default 2), only on off days that aren't immediately before a leg day |
| Mobility | Any remaining day off the bar — light walk, mobility, stretching. Machine-free and deliberately easy, because by construction this is the day a leg day follows. **Not** a rest day |
| Treadmill vs bike | Whoever's session is genuinely a *run* takes the treadmill; the other takes the bike |
| Together core | Two training days a week, one hosted by each person, never on a Legs day |
| Sunday | Nothing. Not scheduled, not tracked |

**Every day from Monday to Saturday carries something** — a workout, a run, or mobility.
Sunday is the *single* rest day shared between the two people, and the only day the app is
allowed to call rest; nothing else in the UI uses that word. Note that the run count floats
between 1 and 2 per week: when the rotation puts leg days after *both* of a person's
candidate days off the bar, only one can take a run and the other becomes mobility. Raising
the quota won't change that — the leg-day rule is what binds.

Because the schedule is derived from the date rather than from what you've
completed, skipping a day means that workout comes back next cycle rather than
shifting everything one slot. That is the cost of keeping two offline phones in
agreement, and it is deliberate.

---

## Data & program

The six workouts (exercises, sets×reps, warm-ups, finishers, which moves are
timed) live in `data/program.js`. Editing the program is a data edit there — no
layout changes required. Two fields matter to the scheduler:

- `load: { leg, run, upper }` (0–3) per workout — drives the rotation ordering.
  Rate new workouts honestly or the recovery ordering quietly degrades.
- `eq` per exercise — `barbell` / `bench` / `dumbbell` / `cardio` / `bodyweight`.
  Only `bodyweight` is conflict-free when both people are in the gym; that's what
  the Together block is built from. Every `cardio` exercise also carries a `bike`
  prescription so it can be reassigned when the treadmill is taken.

Persistence is `localStorage`, namespaced per profile; there is no account or
backend. The **plan code** (base64 of the plan config) is how the schedule moves
between the two phones. CSV export is the portable backup of your own logs.

### Where the AI is, and where it deliberately isn't

`lib/nutrition.js` is **pure arithmetic with no network access** — TDEE, protein per pound,
the strength index, the recomp verdict. `lib/claude.js` holds the only three model calls, and
none of them compute anything: a photo becomes a draft meal, a sentence becomes a draft meal,
and a set of *already-computed* numbers becomes a paragraph of English.

This split is the design, not an implementation detail. A model asked to compute a TDEE will
produce a confident number that is really a BMR formula with extra steps. A bodyweight
regression against logged intake is an actual measurement. Keep new quantitative work in
`nutrition.js`, and keep the model on the side of the line where it's actually better than code.

**Not built:** live shared progress. You can see your partner's *plan* but not
their logged weights or checkmarks — that needs a real sync service and is a
genuine addition, not a tweak.

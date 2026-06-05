# IRONCLAD — Design & Feature Spec

This document describes what the app does and how it is laid out, for a designer
picking it up. The whole UI is implemented in `src/App.jsx`.

---

## Concept

A self-contained workout tracker for one fixed 7-day program. The user opens it
daily, sees that day's workout, runs timers for timed movements, logs the weight
and reps of each set, checks off completed exercises, and reviews progression
over time. Mobile-first, installable as a PWA.

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

### 1. Header
- Wordmark "IRON**CLAD**" (the second half in accent green) + tagline.
- **Daily countdown** card: live `HH:MM:SS` until midnight, when the day resets.
- **Progress button** opens the history/chart modal.

### 2. Day selector
- Horizontal scroll row of 7 day chips (Mon–Sun).
- Active day is filled green; today's chip has a small green dot; fully completed
  days show a checkmark.

### 3. Day card
- Large day title (e.g. "Push Day") + muscle-group subtitle.
- Warm-up line.
- Progress bar with "X/Y complete" and a "Day crushed" badge at 100%.
- A reset link appears once anything is logged that day.

### 4. Exercise rows (grouped into blocks: Workout / Finisher / Core / etc.)
Each row has:
- An **animated SVG demo** (left) showing the movement pattern.
- Exercise name + prescribed sets×reps.
- A **timer button** (only on timed movements — planks, sprints, intervals).
- A **log button** that expands the logging panel; shows today's set count.
- A circular **completion checkmark** (right) that fills green when tapped.

### 5. Log panel (expands under an exercise)
- "Last (MM-DD): 135×8 135×8" reference line from the previous session.
- Today's logged sets as chips with a delete (×) control.
- Weight + reps number inputs and a "+ Log set" button. Weight stays prefilled
  between sets for fast entry.

### 6. Timer modal
- Full-screen overlay, large circular progress ring counting down.
- Pause / Resume, Reset, Close. Plays a short beep at zero.

### 7. History / progression modal
- Exercise dropdown.
- Line chart (recharts): solid green = heaviest set per session; dashed blue =
  estimated 1-rep max (Epley formula).
- Scrollable dated session history below the chart.
- **CSV export** button downloads the full log (date, exercise, set, weight, reps).

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

## Data & program

The full program (days, exercises, sets×reps, warm-ups, finishers, which moves
are timed) lives in the `PROGRAM` object near the top of `App.jsx`. Editing the
program is a data edit there — no layout changes required.

Persistence is `localStorage` only; there is no account or backend. CSV export is
the user's portable backup.

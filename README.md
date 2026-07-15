# IRONCLAD — Workout Tracker PWA

A mobile-first progressive web app for **two people sharing one home gym**. Built with
React + Vite. Includes per-exercise timers, completion checkmarks, set-by-set weight/rep
logging, and a progression chart with CSV export.

Two people alternate days (Mon/Wed/Fri and Tue/Thu/Sat, swapping weekly) so that only one
of them is ever on the treadmill. Each cycles the same six workouts — one per training day
— so splitting the calendar doesn't split the program. Sunday, both rest.

---

## Quick start

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

To produce an optimized build:

```bash
npm run build    # outputs to /dist
npm run preview  # serve the production build locally
```

The app is mobile-first — in your browser dev tools, toggle the device
toolbar (iPhone/Android) to see it as intended. Max content width is 520px;
it centers on desktop.

---

## Project structure

```
ironclad/
├── index.html                 # entry HTML + PWA meta tags
├── package.json
├── vite.config.js
├── public/
│   ├── manifest.webmanifest   # PWA manifest (name, icons, theme)
│   ├── sw.js                  # minimal offline service worker
│   ├── icon-192.png           # PLACEHOLDER app icon — replace
│   └── icon-512.png           # PLACEHOLDER app icon — replace
└── src/
    ├── main.jsx               # React entry, registers service worker
    ├── App.jsx                # layout, day view, week strip, settings
    ├── styles.js              # the design-token sheet (the `S` object)
    ├── data/
    │   └── program.js         # the six workouts, equipment tags, demo/video registries
    ├── lib/
    │   ├── schedule.js        # the two-person scheduler (pure functions)
    │   ├── nutrition.js       # TDEE, protein, recomp math (pure functions, no AI)
    │   ├── claude.js          # the only three API calls (lazy-loaded, optional)
    │   └── storage.js         # per-profile localStorage + plan codes
    └── components/
        ├── Demo.jsx           # photo flipbook + animated SVG fallback
        ├── Modals.jsx         # timer + YouTube demo modals
        ├── LogPanel.jsx       # per-exercise set logging
        ├── HistoryModal.jsx   # progression chart + CSV export
        ├── TabBar.jsx         # bottom nav: Train · Fuel · Insights
        ├── RestTimer.jsx      # sticky between-sets rest countdown
        ├── MuscleMap.jsx      # front/back target-muscle diagram per exercise
        ├── FuelCard.jsx       # the day's meals, macros and weigh-in
        ├── InsightsView.jsx   # measured TDEE, recomp chart, coach read-out
        └── Setup.jsx          # first-run: create a plan or join with a code
```

### How the schedule works

`lib/schedule.js` is the core. Everything in it is a **pure function of (plan, date)** —
nothing about the calendar is stored. Both phones hold the same small plan config, so they
independently derive the *identical* calendar. That's how you can see your partner's week
with no backend, no account, and no network.

It works out, for any date:

1. **Who trains** — schedule A (Mon/Wed/Fri) and B (Tue/Thu/Sat), swapping every week.
2. **Which workout** — each person's position in the rotation is derived from how many
   training days they've had since the plan's anchor Monday.
3. **The rotation order** — all 720 permutations of the six workouts are scored and the
   best is chosen, so a hard leg day never follows a hard run (the cyclic wrap-around pair
   is scored too).
4. **Off-day cardio** — up to N runs per week, placed only on off days that aren't
   immediately before a leg day.
5. **Mobility** — any day off the bar that's left over takes a light walk, mobility work
   and stretching instead of standing empty. Machine-free and deliberately easy: by
   construction this is the day a leg day follows, which is exactly why it couldn't take a
   run. It is *not* a rest day.
6. **Treadmill vs bike** — whoever's session is genuinely a *run* gets the treadmill; the
   other takes the bike. Every cardio block has a bike-equivalent prescription.
7. **The Together block** — machine-free core work, appended to two training days a week
   (one on each person's day), never on a Legs day (already has core).

Every day Monday–Saturday carries something — a workout, a run, or mobility. **Sunday is
the single rest day shared between the two of you, and the only day the app calls rest.**

The consequence of deriving rather than storing: skip a Wednesday and that workout comes
back next cycle rather than shifting everything one slot. That is the price of both phones
agreeing without ever talking to each other.

**Sunday is sacred.** It is the only day neither person is in the gym — with one of them
lifting every day Monday through Saturday, no other day *can* be free for both. So nothing
is scheduled on it and nothing is tracked: no exercises, no checkmarks, no progress bar to
leave unfinished.

---

## Notes for design

- **All visual styling is in `src/styles.js`.** Colors, spacing, radii, and typography are
  defined there as plain JS objects — a single place to retheme.
- **Brand colors:** accent green `#39FF6A` (constant `ACCENT`), dimmer green
  `#2BCC52` (`ACCENT_DIM`), near-black background. Change `ACCENT` / `ACCENT_DIM`
  at the top of `data/program.js` to recolor the whole app.
- **Fonts:** "Archivo Black" for display/headers and "Outfit" for body, currently
  pulled from Google Fonts via an `@import` inside `App.jsx`. Swap there.
- **App icons in `/public` are placeholders** (an "IC" monogram). Replace
  `icon-192.png` and `icon-512.png` with real artwork at those exact sizes,
  and update `manifest.webmanifest` if you add more.
- **The exercise animations are stylized movement cues, not form tutorials** —
  they show the path and tempo of each lift, not coaching detail. See `SPEC.md`.
- **Editing the program** is a data edit in `data/program.js`. Each workout carries a
  `load: { leg, run, upper }` rating (0–3) — the scheduler uses it to order the rotation,
  so if you add or change a workout, rate it honestly or the recovery ordering degrades.
  Each exercise carries an `eq` (equipment) tag; only `bodyweight` work is conflict-free
  when both people are in the gym.

---

## Nutrition & metabolic insights

Each person logs meals and a daily weigh-in. From those two series the app **measures**
their TDEE instead of predicting it:

```
TDEE = average daily intake − (bodyweight slope in lb/week × 3500 ÷ 7)
```

If you're losing a pound a week, your body found 3500 kcal that your fork didn't supply —
so you burned ~500/day more than you ate. Run that backwards and you get maintenance. This
beats Mifflin-St Jeor and every calculator on the internet for the same reason a scale beats
a guess: those predict a population, this measures a person. It is only as honest as the
logging — under-report by 300 kcal a day and it reads 300 low, with total confidence.

The bodyweight slope is a **least-squares regression, not (last − first)**. A single weigh-in
is mostly a measurement of yesterday's sodium; endpoint-differencing gives that a full vote.
On simulated data with realistic scale noise, regression recovers a known TDEE to 0.1% where
endpoint-differencing is off by 2.1%.

Below ~14 days (10 with meals, 6 weigh-ins) the app returns `null` and **says it doesn't know
yet** rather than showing a number it can't stand behind. Days you forgot to log are excluded
from the average rather than counted as zero-calorie days.

The headline output is the **recomp quadrant** — bodyweight and estimated 1RM moving at once:

| | Strength ↑ | Strength ↓ |
|---|---|---|
| **Weight ↓** | Textbook recomp | The deficit is costing you muscle |
| **Weight ↑** | Surplus is being used | Gaining without the strength to show for it |

### Where the AI actually is

Only three calls, all in `lib/claude.js`, all optional:

1. **Meal photo → draft** — a vision call returns items, portions and macros.
2. **Meal description → draft** — same, from `"two eggs, toast, black coffee"`. Cheaper than a
   photo and often *more* accurate, because you know what you ate and the camera doesn't.
3. **Coach read-out** — hands the *already-computed* numbers to Claude and asks what they mean.

**The model never does arithmetic.** It doesn't compute your TDEE, average your protein, or
decide whether you're recomping — all of that is `lib/nutrition.js`, which is pure functions
and has no network access. The model is used for the one thing it's genuinely better at than
code: looking at a plate and saying what's on it.

Every AI estimate lands in an **editable draft you confirm before it saves**, and the model is
required to name the biggest source of error in that specific meal (`caveat`). This is not
decoration. A photo cannot see the oil in the pan; photo calorie estimates run **±20–30%**, worst
on mixed dishes and sauces, best on protein. Silently logging 620 kcal with no chance to correct
it would quietly poison the TDEE estimate the whole feature rests on.

### The API key

There is no backend, so there is nowhere to hide a secret. Each person pastes **their own**
Anthropic key into Settings; it lives in that phone's `localStorage`. It is **never** in the app
bundle, **never** in the plan code (which you text to your partner), and never sent anywhere but
`api.anthropic.com`. The trade-off, stated in the UI rather than buried here: anyone holding your
unlocked phone could read it. The blast radius is your own API spend.

If that's not acceptable, the fix is a ~30-line serverless proxy holding the key server-side —
a change confined to `lib/claude.js`.

**The whole app works with no key at all**: the workouts, the logs, manual meal entry, and every
number on the Insights screen. The SDK is lazy-loaded on first AI use, so a keyless install never
even downloads it.

---

## Data & sync

Two things are stored, both in `localStorage`:

- **The plan** — the shared config (names, who starts on which schedule, the rotation).
  Identical on both phones. Moved between devices as a **plan code** (base64, copy-paste)
  from Settings. Nothing is uploaded anywhere; the code is simply how the two phones agree.
- **Per-profile progress + logs** — namespaced by person (`ironclad:logs:p1`), so each
  person's progression chart and "Last: 135×8" reference line are their own.

Completion is keyed by **date**, so the "day resets in HH:MM:SS" countdown is real. (It
used to be keyed by weekday with no date, which meant checkmarks never actually reset.)

There is no backend, so you can see your partner's *plan* but not their *logged weights*.
Live shared progress would need a real sync service — that's a genuine addition, not a
tweak. Logs from the old single-user version are migrated into the first profile on
first run; CSV export is the portable backup.

See `SPEC.md` for a full feature + screen breakdown.

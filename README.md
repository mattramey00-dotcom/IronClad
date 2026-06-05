# IRONCLAD — Workout Tracker PWA

A mobile-first progressive web app for tracking a 7-day Push / Pull / Legs / Strength
program. Built with React + Vite. Includes per-exercise timers, a daily reset countdown,
completion checkmarks, set-by-set weight/rep logging, and a progression chart with CSV export.

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
    └── App.jsx                # the entire app (single component file)
```

Everything lives in `src/App.jsx`. It is organized top-to-bottom as:

1. `store` — localStorage persistence shim
2. `DEMOS` / `PROGRAM` / `DAYS` — the program data (all 7 days, sets, reps)
3. `Demo` — the animated SVG exercise figures
4. `TimerModal` — circular countdown timer with end beep
5. `LogPanel` — per-exercise set logging UI
6. `HistoryModal` — progression chart (recharts) + session history + CSV export
7. `App` — main component, state, and layout
8. `S` — the full inline style object (acts as the design-token sheet)

---

## Notes for design

- **All visual styling is in the `S` object at the bottom of `App.jsx`.** Colors,
  spacing, radii, and typography are defined there as plain JS objects — a single
  place to retheme.
- **Brand colors:** accent green `#39FF6A` (constant `ACCENT`), dimmer green
  `#2BCC52` (`ACCENT_DIM`), near-black background. Change `ACCENT` / `ACCENT_DIM`
  near the top of the file to recolor the whole app.
- **Fonts:** "Archivo Black" for display/headers and "Outfit" for body, currently
  pulled from Google Fonts via an `@import` inside `App.jsx`. Swap there.
- **App icons in `/public` are placeholders** (an "IC" monogram). Replace
  `icon-192.png` and `icon-512.png` with real artwork at those exact sizes,
  and update `manifest.webmanifest` if you add more.
- **The exercise animations are stylized movement cues, not form tutorials** —
  they show the path and tempo of each lift, not coaching detail. See `SPEC.md`.
- The data layer is `localStorage` on the device. There is no backend; clearing
  browser data clears history. If long-term/cross-device sync is wanted, that's a
  backend addition (out of current scope).

See `SPEC.md` for a full feature + screen breakdown.

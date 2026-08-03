// ============================================================
//  IRONCLAD — goal-based training tuning
// ============================================================
//  The nutrition goal (cut / recomp / maintain / build) should shape training,
//  not just diet — but WITHOUT disturbing anything that makes the routines work.
//  So this changes nothing about which movements you do or the rotation that
//  schedules them. It only bends the *prescription* — sets and rep range — which
//  is the honest place a goal actually diverges:
//
//    · Build (a surplus): a little more volume, moderate hypertrophy reps.
//    · Lose fat (a deficit): keep the heavy compounds heavy to hold on to
//      strength, and pull burnout-rep accessory work down toward that range.
//    · Recomp / Maintain: the program as written (already a balanced default).
//
//  It's a pure render-time transform applied through the same lens the app uses
//  for substitutions and travel mode, so rest (derived from the rep range),
//  the set tracker, logging, the muscle map and demos all follow from this one
//  change. The effect is deliberately modest: rep-range tuning is real but small,
//  and the app would rather nudge honestly than oversell it.
//
//  Goal ids come from GOALS in nutrition.js: cut · recomp · maintain · gain.
// ============================================================

const TIMES = "×"; // × — the multiply sign the program uses
const NDASH = "–"; // – — the en dash the program uses for rep ranges

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Turn one "S × reps" prescription into its goal-tuned version. Anything that
// isn't a plain rep scheme — timed holds ("3 × 30 sec"), cardio ("15 minutes"),
// AMRAP, a bare label — is returned untouched. Recomp/maintain are no-ops.
export function adaptScheme(s, goalId) {
  if (goalId !== "gain" && goalId !== "cut") return s;

  const raw = String(s || "").trim();
  // sets × reps, an optional range, an optional "each"/"each side" suffix — and
  // nothing else after it (so " sec" / " min" / "AMRAP" never match here).
  const m = /^(\d+)\s*[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?(\s+each(?:\s+side)?)?\s*$/i.exec(raw);
  if (!m) return s;

  const origSets = +m[1];
  const origLo = +m[2];
  const origHi = m[3] ? +m[3] : origLo;
  const suffix = m[4] || "";

  let sets = origSets, lo = origLo, hi = origHi;

  if (goalId === "gain") {
    // Build: shift reps up into the hypertrophy band and add a set to the lower-
    // volume work. Capped so nothing drifts into junk-volume territory.
    lo = clamp(lo + 2, 5, 15);
    hi = clamp(hi + 2, 6, 15);
    if (sets <= 3) sets += 1;
  } else {
    // Cut: protect strength. Leave already-heavy compounds (low reps) alone and
    // pull higher-rep accessory work down toward a heavier range. Sets unchanged
    // — recovery is limited in a deficit.
    if (lo >= 8) {
      lo = clamp(lo - 3, 4, 15);
      hi = clamp(hi - 3, 5, 15);
    }
  }
  if (hi < lo) hi = lo;

  // No net change → hand back the original string so its exact formatting (and
  // the "unchanged" fast-path in adaptExercise) is preserved.
  if (sets === origSets && lo === origLo && hi === origHi) return s;

  const reps = hi > lo ? `${lo}${NDASH}${hi}` : `${lo}`;
  return `${sets} ${TIMES} ${reps}${suffix}`;
}

// Apply the tuning to a resolved exercise. Returns the same object reference when
// nothing changed, so React's referential checks aren't disturbed.
export function adaptExercise(ex, goalId, enabled = true) {
  if (!enabled || !ex || !ex.s) return ex;
  const s2 = adaptScheme(ex.s, goalId);
  return s2 === ex.s ? ex : { ...ex, s: s2 };
}

// A short, honest line for the day card so the changed numbers are never a
// mystery. Null when there's nothing to say (recomp/maintain, or tuning off).
export function goalTuneNote(goalId, enabled = true) {
  if (!enabled) return null;
  if (goalId === "gain") return "Tuned for building — a little more volume, moderate reps.";
  if (goalId === "cut") return "Tuned for losing fat — heavier where it counts to hold strength.";
  return null;
}

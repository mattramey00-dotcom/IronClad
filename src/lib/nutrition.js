// ============================================================
//  IRONCLAD — nutrition & metabolic math
// ============================================================
//  Everything in here is arithmetic. No model calls, no network, no guessing.
//  That is deliberate: the *interesting* part of "am I developing?" is not a
//  language problem, it's a measurement problem. An LLM asked to compute your
//  TDEE will produce a confident number that is really just a BMR formula with
//  extra steps. Your own bodyweight trend against your own logged intake is an
//  actual measurement of your actual metabolism, and it beats every calculator
//  on the internet — as long as you log honestly for a few weeks.
//
//  The AI half of the feature (lib/claude.js) reads *these* numbers. It never
//  computes them.
// ============================================================

export const KCAL_PER_LB = 3500; // the classic approximation for a pound of fat

// Protein for people who lift, in grams per pound of bodyweight. The evidence
// clusters around 0.7–1.0 g/lb; past ~1.0 the returns are somewhere between
// small and unmeasurable, so the app stops nagging there.
export const PROTEIN_LO = 0.7;
export const PROTEIN_HI = 1.0;

export const GOALS = {
  cut: { id: "cut", label: "Lose fat", deficit: -400, proteinPerLb: 1.0 },
  recomp: { id: "recomp", label: "Recomp", deficit: -150, proteinPerLb: 1.0 },
  maintain: { id: "maintain", label: "Maintain", deficit: 0, proteinPerLb: 0.8 },
  gain: { id: "gain", label: "Build", deficit: 300, proteinPerLb: 0.9 },
};

export const DEFAULT_TARGETS = {
  goal: "recomp", kcal: null, protein: null,
  goalWeight: null, sex: null, heightIn: null, age: null,
};

// Grams of protein a scoop of whey tends to carry — for the "how much more"
// nudge. Approximate on purpose; the point is "about a scoop", not a number.
export const SCOOP_G = 25;

// Muscle protein synthesis saturates around 0.4 g/kg per meal, so protein does
// more good spread across the day than piled into dinner. Past this share in a
// single meal, the app suggests spreading it out.
export const MEAL_BACKLOAD_SHARE = 0.55;

// How much data before any of this means anything. Below these thresholds the
// app says "not yet" instead of showing a number it can't stand behind.
export const MIN_DAYS = 14;
export const MIN_INTAKE_DAYS = 10;
export const MIN_WEIGH_INS = 6;

// ---- small helpers ---------------------------------------------------

const round = (n, p = 0) => {
  const f = 10 ** p;
  return Math.round(n * f) / f;
};

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);

// Days between two "YYYY-MM-DD" keys. UTC-anchored so a DST shift can't make a
// day 23 or 25 hours long and quietly skew the regression.
export function daysBetween(a, b) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export function shiftKey(key, delta) {
  const t = Date.parse(`${key}T00:00:00Z`) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// The N-day window ending on `endKey`, inclusive.
export function windowKeys(endKey, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftKey(endKey, -i));
  return out;
}

// ---- meals -----------------------------------------------------------

export const EMPTY_TOTALS = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0, cholesterol: 0 };

// The FDA Daily Values, in the units each is logged in. Neutral label references
// — the same numbers printed on every nutrition panel — not personal
// prescriptions. Active, heavy-sweating people often need more sodium; anyone
// with a medical reason to limit any of these should follow their clinician, not
// these numbers. Sodium/sugar/cholesterol are ceilings to stay under; fiber is a
// floor to reach.
export const SODIUM_DV_MG = 2300;
export const SUGAR_DV_G = 50;      // added-sugars Daily Value
export const FIBER_DV_G = 28;      // dietary-fiber Daily Value — a target, not a cap
export const CHOLESTEROL_DV_MG = 300;

export function mealTotals(list) {
  return (list || []).reduce(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
      // Added later than the four above — older logged meals don't carry them, so
      // a missing value is simply zero and never a silent gap in the day's math.
      sugar: acc.sugar + (Number(m.sugar) || 0),
      sodium: acc.sodium + (Number(m.sodium) || 0),
      fiber: acc.fiber + (Number(m.fiber) || 0),
      cholesterol: acc.cholesterol + (Number(m.cholesterol) || 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export const dayTotals = (meals, key) => mealTotals(meals?.[key]);

// ---- logging streak --------------------------------------------------
//  Consecutive days, ending at today (or yesterday if today isn't logged yet),
//  on which anything was logged — a meal or a weigh-in. The whole app rests on
//  the habit of logging, so this rewards the habit, nothing more. A day counts
//  the moment it has any entry; today not being logged doesn't break a streak
//  that's alive through yesterday.
export function loggingStreak(meals, weights, endKey) {
  const logged = (k) => (meals?.[k]?.length || 0) > 0 || Number(weights?.[k]) > 0;
  let start = endKey;
  if (!logged(start)) {
    const y = shiftKey(endKey, -1);
    if (!logged(y)) return { current: 0, loggedToday: false };
    start = y;
  }
  let n = 0;
  for (let k = start; logged(k); k = shiftKey(k, -1)) n++;
  return { current: n, loggedToday: logged(endKey) };
}

// ---- bodyweight trend ------------------------------------------------
//  Least-squares slope, not (last − first).
//
//  A single weigh-in is mostly a measurement of yesterday's sodium and water.
//  Differencing the endpoints hands both of those a full vote; regression makes
//  every day vote once, so a salty Saturday moves the line a little instead of
//  moving the answer a lot. This is the difference between a TDEE estimate that
//  wobbles 400 kcal a day and one you can actually steer by.

export function weightTrend(weights, endKey, days = 21) {
  const pts = [];
  windowKeys(endKey, days).forEach((k, i) => {
    const lb = Number(weights?.[k]);
    if (Number.isFinite(lb) && lb > 0) pts.push({ x: i, y: lb });
  });
  if (pts.length < 2) {
    return { n: pts.length, slopePerWeek: null, avg: pts.length ? pts[0].y : null, span: 0 };
  }

  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  const denom = sum(pts.map((p) => (p.x - mx) ** 2));
  const slopePerDay = denom === 0 ? 0 : sum(pts.map((p) => (p.x - mx) * (p.y - my))) / denom;

  return {
    n: pts.length,
    slopePerWeek: slopePerDay * 7, // lb/week — the number that drives TDEE
    avg: my,
    latest: pts[pts.length - 1].y,
    span: pts[pts.length - 1].x - pts[0].x + 1,
  };
}

// ---- intake ----------------------------------------------------------
//  Only days that actually have meals count toward the average. A day you
//  forgot to log is not a zero-calorie day, and treating it as one would drag
//  the TDEE estimate down and tell you you're eating less than you are.

export function intakeStats(meals, endKey, days = 21) {
  const keys = windowKeys(endKey, days);
  const logged = keys
    .map((k) => ({ key: k, t: dayTotals(meals, k), any: (meals?.[k]?.length || 0) > 0 }))
    .filter((d) => d.any);

  return {
    days,
    daysLogged: logged.length,
    coverage: days ? logged.length / days : 0,
    avgKcal: mean(logged.map((d) => d.t.kcal)),
    avgProtein: mean(logged.map((d) => d.t.protein)),
    avgCarbs: mean(logged.map((d) => d.t.carbs)),
    avgFat: mean(logged.map((d) => d.t.fat)),
    // Only days that actually carry sodium figures — old logs from before
    // sodium was tracked would otherwise drag the average toward zero.
    avgSodium: mean(logged.filter((d) => d.t.sodium > 0).map((d) => d.t.sodium)),
    sodiumDays: logged.filter((d) => d.t.sodium > 0).length,
  };
}

// ---- measured TDEE ---------------------------------------------------
//  TDEE = average intake − (energy the weight change accounts for)
//
//  If you're losing 1 lb/week, your body found 3500 kcal somewhere that your
//  fork didn't supply — so you burned 500/day more than you ate. Run it
//  backwards and you get maintenance. That's the whole trick, and it's better
//  than Mifflin-St Jeor or Harris-Benedict for the same reason a scale beats a
//  guess: those predict a population, this measures a person.
//
//  It is only as honest as the logging. Under-report your intake by 300 kcal a
//  day and this returns a TDEE that's 300 too low, with total confidence.

export function estimateTDEE(meals, weights, endKey, days = 21) {
  const intake = intakeStats(meals, endKey, days);
  const trend = weightTrend(weights, endKey, days);

  const reasons = [];
  if (intake.daysLogged < MIN_INTAKE_DAYS)
    reasons.push(`${intake.daysLogged}/${MIN_INTAKE_DAYS} days of meals logged`);
  if (trend.n < MIN_WEIGH_INS) reasons.push(`${trend.n}/${MIN_WEIGH_INS} weigh-ins`);
  if (trend.span < MIN_DAYS) reasons.push(`${trend.span}/${MIN_DAYS} days of history`);

  if (reasons.length || trend.slopePerWeek === null) {
    return { ready: false, reasons, intake, trend, tdee: null };
  }

  const balancePerDay = (trend.slopePerWeek * KCAL_PER_LB) / 7; // + = surplus
  const tdee = intake.avgKcal - balancePerDay;

  // Honest error bar. The dominant term isn't the math, it's the logging: photo
  // estimates run ±20–30%, and the scale noise shrinks as the window fills.
  // Wider when you've logged less. This is a plausible range, not a CI.
  const slack = 0.06 + 0.14 * (1 - Math.min(1, intake.coverage)) + (trend.n < 10 ? 0.05 : 0);

  return {
    ready: true,
    reasons: [],
    intake,
    trend,
    tdee: round(tdee),
    lo: round(tdee * (1 - slack), -1),
    hi: round(tdee * (1 + slack), -1),
    balancePerDay: round(balancePerDay),
  };
}

// ---- targets ---------------------------------------------------------

export function resolveTargets(targets, tdee, bodyweight) {
  const goal = GOALS[targets?.goal] || GOALS.recomp;

  const kcal =
    Number(targets?.kcal) > 0
      ? Number(targets.kcal)
      : tdee?.ready
        ? Math.max(1200, round(tdee.tdee + goal.deficit, -1))
        : null;

  const protein =
    Number(targets?.protein) > 0
      ? Number(targets.protein)
      : bodyweight
        ? Math.round(bodyweight * goal.proteinPerLb)
        : null;

  return { goal, kcal, protein, derived: !(Number(targets?.kcal) > 0) };
}

// ---- strength trend --------------------------------------------------
//  Epley. Not gospel — it drifts high above ~10 reps — but it's monotonic in
//  both weight and reps, which is all we need to answer "is this going up?"

export const e1rm = (w, r) => (Number(w) || 0) * (1 + (Number(r) || 0) / 30);

export function bestE1RM(entry) {
  return Math.max(0, ...(entry?.sets || []).map((s) => e1rm(s.w, s.r)));
}

// Percent change in estimated 1RM across the window, averaged over every
// exercise with at least two sessions in it. One lift stalling is noise; the
// whole board stalling is a signal.
export function strengthTrend(logs, endKey, days = 28) {
  const from = shiftKey(endKey, -(days - 1));
  const moves = [];

  Object.entries(logs || {}).forEach(([name, entries]) => {
    const inWindow = (entries || [])
      .filter((e) => e.date >= from && e.date <= endKey && (e.sets?.length || 0) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (inWindow.length < 2) return;

    const first = bestE1RM(inWindow[0]);
    const last = bestE1RM(inWindow[inWindow.length - 1]);
    if (first <= 0) return;

    moves.push({ name, first, last, pct: ((last - first) / first) * 100, sessions: inWindow.length });
  });

  if (!moves.length) return { n: 0, pct: null, moves: [], volume: 0 };

  // Total tonnage in the window — the other half of "am I doing more work?"
  let volume = 0;
  Object.values(logs || {}).forEach((entries) => {
    (entries || []).forEach((e) => {
      if (e.date >= from && e.date <= endKey)
        (e.sets || []).forEach((s) => {
          volume += (Number(s.w) || 0) * (Number(s.r) || 0);
        });
    });
  });

  return {
    n: moves.length,
    pct: mean(moves.map((m) => m.pct)),
    moves: moves.sort((a, b) => b.pct - a.pct),
    volume: Math.round(volume),
  };
}

// ---- the chart series ------------------------------------------------
//  Weekly points, because daily is noise and monthly is too late to steer by.
//
//  The strength index is the fiddly bit. You can't just average raw e1RMs each
//  week: the rotation means one week is squats and deadlifts (heavy numbers)
//  and the next is presses and rows (light ones), so the average would swing
//  wildly for reasons that have nothing to do with getting stronger. So every
//  lift is indexed to *its own* first recorded e1RM — 100 = where you started —
//  and the week's score is the mean of whatever you happened to train. Now a
//  rising line means every bar is going up, whichever bars they were.

export function weeklySeries({ meals, weights, logs, endKey, weeks = 8 }) {
  const start = shiftKey(endKey, -(weeks * 7 - 1));

  // Baseline per exercise: the first e1RM in the window.
  const baseline = {};
  Object.entries(logs || {}).forEach(([name, entries]) => {
    const first = (entries || [])
      .filter((e) => e.date >= start && e.date <= endKey && (e.sets?.length || 0) > 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (first) {
      const v = bestE1RM(first);
      if (v > 0) baseline[name] = v;
    }
  });

  const out = [];
  for (let w = 0; w < weeks; w++) {
    const wEnd = shiftKey(endKey, -(weeks - 1 - w) * 7);
    const keys = windowKeys(wEnd, 7);
    const inWeek = (d) => d >= keys[0] && d <= keys[6];

    const lbs = keys.map((k) => Number(weights?.[k])).filter((v) => Number.isFinite(v) && v > 0);
    const kcals = keys.filter((k) => meals?.[k]?.length).map((k) => dayTotals(meals, k).kcal);

    const ratios = [];
    let volume = 0;
    Object.entries(logs || {}).forEach(([name, entries]) => {
      (entries || []).forEach((e) => {
        if (!inWeek(e.date)) return;
        (e.sets || []).forEach((s) => { volume += (Number(s.w) || 0) * (Number(s.r) || 0); });
      });
      if (!baseline[name]) return;
      const best = Math.max(
        0,
        ...(entries || []).filter((e) => inWeek(e.date)).map((e) => bestE1RM(e)),
      );
      if (best > 0) ratios.push((best / baseline[name]) * 100);
    });

    out.push({
      week: `${keys[0].slice(5).replace("-", "/")}`,
      weight: lbs.length ? round(mean(lbs), 1) : null,
      kcal: kcals.length ? Math.round(mean(kcals)) : null,
      strength: ratios.length ? round(mean(ratios), 1) : null,
      volume: Math.round(volume),
    });
  }
  return out;
}

// ---- the insight -----------------------------------------------------
//  The question Matt actually asked: how is my *development* tracking against
//  my training? The answer lives in two numbers moving at once — bodyweight and
//  estimated 1RM — and it falls into four quadrants. This is the whole point of
//  the feature, and it needs no model to say it.

export function recompVerdict(weightSlope, strengthPct) {
  if (weightSlope === null || strengthPct === null) return null;

  const wDown = weightSlope < -0.15;
  const wUp = weightSlope > 0.15;
  const sUp = strengthPct > 1.5;
  const sDown = strengthPct < -1.5;

  if (wDown && sUp)
    return {
      kind: "good",
      title: "Textbook recomp",
      body: "Bodyweight is coming down and your lifts are still going up. This is the hardest quadrant to be in and the one everybody wants. Don't change anything.",
    };
  if (wDown && sDown)
    return {
      kind: "warn",
      title: "The deficit is costing you strength",
      body: "You're losing weight, but your estimated 1RM is falling with it — some of what you're shedding is likely muscle. Push protein toward 1 g per pound and shrink the deficit before you keep cutting.",
    };
  if (wUp && sUp)
    return {
      kind: "good",
      title: "Gaining, and it's going somewhere",
      body: "Weight up, lifts up. The surplus is being used. Keep the rate modest — much past ~0.5 lb/week and the extra tends to arrive as fat.",
    };
  if (wUp && !sUp)
    return {
      kind: "warn",
      title: "Gaining without the strength to show for it",
      body: "Bodyweight is climbing but the bar isn't. That's a surplus you aren't converting. Trim calories back toward maintenance, or find the reason the lifts have stalled — sleep and recovery come before food here.",
    };
  if (sUp)
    return {
      kind: "good",
      title: "Stronger at the same weight",
      body: "Bodyweight is flat and your lifts are climbing. That is recomposition, and it's exactly what a fixed bodyweight is supposed to look like when it's going well.",
    };
  if (sDown)
    return {
      kind: "warn",
      title: "Lifts sliding at a steady weight",
      body: "Neither the scale nor the bar is moving in your favour. Look at protein and sleep first — this usually isn't a calorie problem.",
    };
  return {
    kind: "info",
    title: "Holding steady",
    body: "Weight and strength are both roughly flat. Fine if maintenance is the goal — if it isn't, something has to move: calories, protein, or load on the bar.",
  };
}

// The full local read-out. Feed this to the UI, and to the coach prompt.
export function buildInsights({ meals, weights, logs, targets, endKey }) {
  const tdee = estimateTDEE(meals, weights, endKey);
  const strength = strengthTrend(logs, endKey);
  const bodyweight = tdee.trend.latest ?? tdee.trend.avg ?? null;
  const resolved = resolveTargets(targets, tdee, bodyweight);

  const proteinPerLb =
    bodyweight && tdee.intake.avgProtein ? tdee.intake.avgProtein / bodyweight : null;

  const notes = [];

  if (proteinPerLb !== null && tdee.intake.daysLogged >= 3) {
    if (proteinPerLb < PROTEIN_LO)
      notes.push({
        kind: "warn",
        title: `Protein is low — ${proteinPerLb.toFixed(2)} g/lb`,
        body: `You're averaging ${Math.round(tdee.intake.avgProtein)} g a day at ${Math.round(bodyweight)} lb. Lifting on this little protein is the most common way to train hard and keep none of it. Aim for ${Math.round(bodyweight * PROTEIN_LO)}–${Math.round(bodyweight * PROTEIN_HI)} g.`,
      });
    else if (proteinPerLb > PROTEIN_HI + 0.35)
      notes.push({
        kind: "info",
        title: `Protein is well past useful — ${proteinPerLb.toFixed(2)} g/lb`,
        body: "No harm in it, but nothing above roughly 1 g/lb is buying you more muscle. Those calories would do more work as carbs around your training.",
      });
    else
      notes.push({
        kind: "good",
        title: `Protein is dialled in — ${proteinPerLb.toFixed(2)} g/lb`,
        body: `${Math.round(tdee.intake.avgProtein)} g a day, right in the range where lifting actually pays out.`,
      });
  }

  const verdict = recompVerdict(tdee.trend.slopePerWeek, strength.pct);
  if (verdict) notes.push(verdict);

  if (tdee.ready && resolved.kcal) {
    const gap = tdee.intake.avgKcal - resolved.kcal;
    if (Math.abs(gap) > 150)
      notes.push({
        kind: "info",
        title: gap > 0 ? `Eating ~${Math.round(gap)} over target` : `Eating ~${Math.round(-gap)} under target`,
        body: `Your ${resolved.goal.label.toLowerCase()} target is ${resolved.kcal} kcal; you're averaging ${Math.round(tdee.intake.avgKcal)}. At that gap the scale moves about ${Math.abs((gap * 7) / KCAL_PER_LB).toFixed(1)} lb a week ${gap > 0 ? "up" : "down"} from where it is now.`,
      });
  }

  if (tdee.intake.coverage < 0.6 && tdee.intake.daysLogged > 0)
    notes.push({
      kind: "warn",
      title: "Gaps in the log",
      body: `Only ${tdee.intake.daysLogged} of the last ${tdee.intake.days} days have meals on them. Missed days aren't zero-calorie days, so they're left out of the average — but they do make every number here shakier. The math is worth more than the precision of any single entry.`,
    });

  return { tdee, strength, resolved, bodyweight, proteinPerLb, verdict, notes };
}

// ---- formula TDEE (the day-1 bridge) ---------------------------------
//  Mifflin–St Jeor × an activity multiplier. This is a *population guess*, not
//  a measurement — the exact thing the rest of this file exists to replace. Its
//  only job is to give a sensible starting calorie number in the two weeks
//  before there's enough logged data to measure the real one. It is always
//  labelled as an estimate, and it disappears the moment the measured TDEE is
//  ready. It needs three facts the logs can't supply: sex, height, age.

export const ACTIVITY = 1.55; // moderate-active: a lifting split plus off-day runs

export function formulaTDEE({ sex, heightIn, age, weightLb, activity = ACTIVITY }) {
  const w = Number(weightLb), h = Number(heightIn), a = Number(age);
  if (!(w > 0) || !(h > 0) || !(a > 0) || (sex !== "male" && sex !== "female")) return null;
  const kg = w / 2.2046226;
  const cm = h * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * a + (sex === "female" ? -161 : 5);
  return { bmr: Math.round(bmr), tdee: Math.round((bmr * activity) / 10) * 10, activity };
}

// ---- water target ----------------------------------------------------
//  A daily fluid recommendation, in fluid ounces. ~0.6 oz per lb of bodyweight
//  sits in the middle of the common "0.5–1 oz/lb" band for active people, with
//  a sensible floor. Rounded to whole cups (8 oz) so the target reads cleanly.
//  A guideline, not a prescription — thirst, sweat and climate move it.
export const CUP_OZ = 8;
export function waterTargetOz(bodyweightLb) {
  const bw = Number(bodyweightLb);
  const raw = bw > 0 ? bw * 0.6 : 80;
  return Math.max(64, Math.round(raw / CUP_OZ) * CUP_OZ);
}

// ---- BMI (reference only) --------------------------------------------
//  The crude height-to-weight ratio. It can't tell muscle from fat, so it
//  over-reads for anyone who lifts — the measured bodyweight trend and the
//  weight-vs-strength chart are the honest signals. Shown with that caveat.
export function bmi(weightLb, heightIn) {
  const w = Number(weightLb), h = Number(heightIn);
  if (!(w > 0) || !(h > 0)) return null;
  return round((703 * w) / (h * h), 1);
}

export function bmiBand(v) {
  if (v == null) return null;
  if (v < 18.5) return "below the standard range";
  if (v < 25) return "in the standard range";
  if (v < 30) return "above the standard range";
  return "well above the standard range";
}

// ---- metabolic adaptation --------------------------------------------
//  Diet long enough and your metabolism quietly drops to meet the lower
//  intake — adaptive thermogenesis. You can't see it in any single TDEE number,
//  only in the *trend* of that number, so we measure TDEE over the recent window
//  and over the window before it and compare. A real downward drift while you're
//  in a deficit is the cue for a diet break or a refeed, not more cutting.

export function tdeeAdaptation(meals, weights, endKey, goalId) {
  const now = estimateTDEE(meals, weights, endKey);
  const prior = estimateTDEE(meals, weights, shiftKey(endKey, -21));
  if (!now.ready || !prior.ready) return { ready: false };

  const delta = now.tdee - prior.tdee;        // negative = metabolism fell
  const pct = (delta / prior.tdee) * 100;
  const cutting = goalId === "cut" || goalId === "recomp" || now.balancePerDay < -100;
  return {
    ready: true,
    now: now.tdee,
    prior: prior.tdee,
    delta: Math.round(delta),
    pct: round(pct, 1),
    cutting,
    // A meaningful drop (both absolute and relative) while eating at a deficit.
    adapting: cutting && delta < -80 && pct < -3,
  };
}

// ---- bodyweight series (raw dots + the regression trend line) ---------
//  The same least-squares line weightTrend() drives the TDEE math, but sampled
//  per day so the chart can draw it *through* the raw weigh-ins. Seeing the
//  scatter and the line together is the whole point: the daily bounce is water,
//  the line is you.

export function bodyweightSeries(weights, endKey, days = 42) {
  const keys = windowKeys(endKey, days);
  const pts = [];
  keys.forEach((k, i) => {
    const lb = Number(weights?.[k]);
    if (Number.isFinite(lb) && lb > 0) pts.push({ x: i, y: lb });
  });

  let slope = 0, intercept = null;
  if (pts.length >= 2) {
    const mx = mean(pts.map((p) => p.x));
    const my = mean(pts.map((p) => p.y));
    const denom = sum(pts.map((p) => (p.x - mx) ** 2));
    slope = denom ? sum(pts.map((p) => (p.x - mx) * (p.y - my))) / denom : 0;
    intercept = my - slope * mx;
  }

  const series = keys.map((k, i) => ({
    date: k.slice(5).replace("-", "/"),
    raw: pts.some((p) => p.x === i) ? Number(weights[k]) : null,
    trend: intercept !== null ? round(intercept + slope * i, 1) : null,
  }));

  return {
    series,
    n: pts.length,
    slopePerWeek: intercept !== null ? round(slope * 7, 2) : null,
    // The trend line's value *today* — a smoothed bodyweight that ignores the
    // last weigh-in's water, better for "where am I really" than the raw number.
    smoothed: intercept !== null ? round(intercept + slope * (days - 1), 1) : null,
  };
}

// ---- goal projection -------------------------------------------------
//  Where the trend line, extended, crosses your goal weight — and an honest
//  range around it, because the rate itself carries ±25% of slop. Returns days
//  from endKey so the caller can turn it into a date with its own clock.

export function projectGoal({ smoothed, goalWeight, slopePerWeek }) {
  const w = Number(smoothed), g = Number(goalWeight);
  if (!(w > 0) || !(g > 0) || slopePerWeek == null) return null;

  const remaining = g - w; // signed: negative means you need to lose
  if (Math.abs(remaining) < 0.4) return { reached: true, remaining: round(remaining, 1) };

  // Are you actually moving toward it?
  const moving = Math.abs(slopePerWeek) > 0.05 && Math.sign(remaining) === Math.sign(slopePerWeek);
  if (!moving) return { stalled: true, remaining: round(remaining, 1), slopePerWeek };

  const weeks = remaining / slopePerWeek;
  const wA = remaining / (slopePerWeek * 1.25);
  const wB = remaining / (slopePerWeek * 0.75);
  return {
    remaining: round(remaining, 1),
    weeks: round(weeks, 1),
    etaDays: Math.round(weeks * 7),
    etaLoDays: Math.round(Math.min(wA, wB) * 7),
    etaHiDays: Math.round(Math.max(wA, wB) * 7),
  };
}

// ---- protein distribution across the day -----------------------------
//  Uses the per-meal protein and timestamps already stored. Answers two things
//  the daily total can't: is it spread out, and how much is left to hit target.

export function proteinDistribution(dayMeals, target) {
  const meals = (dayMeals || [])
    .map((m) => ({ name: m.name, time: m.time || "", protein: Math.round(Number(m.protein) || 0) }))
    .filter((m) => m.protein > 0)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const total = sum(meals.map((m) => m.protein));
  const maxMeal = meals.reduce((a, m) => Math.max(a, m.protein), 0);
  const maxShare = total ? maxMeal / total : 0;
  const remaining = Number(target) > 0 ? Math.max(0, Math.round(target - total)) : null;

  return {
    meals,
    total,
    doses: meals.length,
    maxShare,
    backLoaded: meals.length >= 2 && maxShare > MEAL_BACKLOAD_SHARE,
    remaining,
    scoops: remaining != null ? Math.round((remaining / SCOOP_G) * 10) / 10 : null,
  };
}

// ---- protein cadence — when's the next dose? ---------------------------
//  Muscle protein synthesis responds best to ~25–40 g doses spaced a couple of
//  hours apart rather than one big hit. This reads the day's protein-bearing
//  meals and, against the current clock, says when the next dose is due — pure
//  timing guidance, never a medical prescription.
export const PROTEIN_DOSE_LO = 25;   // g — the low end of an effective dose
export const PROTEIN_DOSE_HI = 40;   // g — the high end
const PROTEIN_GAP_LO_MIN = 120;      // 2 hr — soonest a next dose is worthwhile
const PROTEIN_GAP_HI_MIN = 180;      // 3 hr — by here you're due
const PROTEIN_DOSE_QUALIFY = 15;     // g — below this a meal doesn't reset the clock

const hhmmToMin = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s || "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
const clock12 = (min) => {
  const t = (((Math.round(min) % 1440) + 1440) % 1440);
  let h = Math.floor(t / 60);
  const mm = t % 60;
  const ap = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ap}`;
};
const durText = (min) => {
  const t = Math.max(0, Math.round(min));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
};

// dayMeals: the selected day's meals · nowMin: minutes since midnight (local) ·
// target: today's protein goal (0/undefined if none yet).
// Returns { status, text } with status: done | start | waiting | due | overdue.
export function proteinCadence(dayMeals, nowMin, target) {
  const rounded = (dayMeals || []).map((m) => Math.round(Number(m.protein) || 0));
  const totalProtein = sum(rounded);
  const remaining = Number(target) > 0 ? Math.max(0, Math.round(Number(target) - totalProtein)) : null;

  // Suggested dose stays in the 25–40 g band, but never more than what's left.
  const doseText = remaining != null && remaining < PROTEIN_DOSE_LO
    ? `about ${remaining} g`
    : `${PROTEIN_DOSE_LO}–${PROTEIN_DOSE_HI} g`;

  // Target already met — stop chasing doses for the day.
  if (remaining === 0 && Number(target) > 0) {
    return { status: "done", text: "Protein target hit for today — no need to time more doses.", doseText, lastDoseMin: null, nextDueMin: null };
  }

  const doses = (dayMeals || [])
    .map((m) => ({ t: hhmmToMin(m.time), protein: Math.round(Number(m.protein) || 0) }))
    .filter((m) => m.t != null && m.protein >= PROTEIN_DOSE_QUALIFY)
    .sort((a, b) => a.t - b.t);

  if (!doses.length) {
    return {
      status: "start",
      text: `No protein dose logged yet — start with ${doseText}, then repeat every 2–3 hrs to keep an even cadence.`,
      doseText, lastDoseMin: null, nextDueMin: null,
    };
  }

  const last = doses[doses.length - 1].t;
  const nextStart = last + PROTEIN_GAP_LO_MIN;
  const nextEnd = last + PROTEIN_GAP_HI_MIN;
  const timing = { doseText, lastDoseMin: last, nextDueMin: nextStart };

  if (nowMin < nextStart) {
    return {
      status: "waiting",
      text: `Next dose (${doseText}) around ${clock12(nextStart)} — about ${durText(nextStart - nowMin)} away. Last was ${durText(nowMin - last)} ago.`,
      ...timing,
    };
  }
  if (nowMin <= nextEnd) {
    return {
      status: "due",
      text: `Time for your next dose — aim for ${doseText}. It's been ${durText(nowMin - last)} since your last.`,
      ...timing,
    };
  }
  return {
    status: "overdue",
    text: `Due for protein — ${durText(nowMin - last)} since your last dose. A ${doseText} hit gets you back on a 2–3 hr cadence.`,
    ...timing,
  };
}

// ---- "how long will it take?" — answered in code, never by the model ----
//  The coach (lib/claude.js) can ask any weight question the user throws at it —
//  "lose 10 lb", "get to 175", "in time for the wedding" — and this is what does
//  the arithmetic. It never guesses; it reads three lenses off the measured data:
//
//    at_current_trend  — extend the bodyweight trend you're actually on
//    at_calorie_change — pick a deficit (or show 250/500/750) and convert it
//    for_your_deadline — if they named a date, what rate/deficit that demands
//
//  1% of bodyweight per week is the rough ceiling for losing fat without shedding
//  muscle, so each option carries an `aggressive` flag the coach can warn on. The
//  model's whole job is to read this back in plain English — the numbers are ours.
//
//  Convention: lose_lb is positive to lose, negative to gain; or give to_weight_lb.
export function planWeightChange(
  { lose_lb, to_weight_lb, in_weeks, daily_kcal_change } = {},
  { currentLb, tdee, tdeeMeasured, ratePerWeek, today } = {},
) {
  // How much to move, and which way. + delta = need to lose, − = need to gain.
  let delta = null;
  if (Number(lose_lb)) delta = Number(lose_lb);
  else if (Number(to_weight_lb) > 0 && Number(currentLb) > 0) delta = Number(currentLb) - Number(to_weight_lb);
  if (delta == null || Math.abs(delta) < 0.1)
    return { error: "no_target", note: "Ask for a number of pounds to lose/gain, or a goal weight." };

  const losing = delta > 0;
  const absLb = Math.abs(delta);
  const cur = Number(currentLb) > 0 ? Number(currentLb) : null;
  const T = Number(tdee) > 0 ? Number(tdee) : null;

  const etaOf = (weeks) => {
    if (!(weeks > 0) || !today) return {};
    const days = Math.round(weeks * 7);
    return { eta_days: days, eta_date: shiftKey(today, days) };
  };

  const out = {
    goal: `${losing ? "lose" : "gain"} ${round(absLb, 1)} lb`,
    current_weight_lb: cur != null ? round(cur, 1) : null,
    tdee_kcal: T != null ? Math.round(T) : null,
    tdee_is_measured: !!tdeeMeasured, // false = a formula estimate, treat as softer
    max_sustainable_rate_lb_per_week: cur != null ? round(cur * 0.01, 2) : null,
  };

  // Lens A — extend the trend they're actually on.
  if (ratePerWeek != null && Math.abs(ratePerWeek) > 0.05 && (losing ? ratePerWeek < 0 : ratePerWeek > 0)) {
    const weeks = absLb / Math.abs(ratePerWeek);
    out.at_current_trend = { rate_lb_per_week: round(ratePerWeek, 2), weeks: round(weeks, 1), ...etaOf(weeks) };
  } else {
    out.at_current_trend = {
      rate_lb_per_week: ratePerWeek != null ? round(ratePerWeek, 2) : null,
      moving_toward_goal: false,
      note: "Their current trend isn't moving toward this goal — the intake gap has to change first.",
    };
  }

  // Lens B — convert a calorie deficit/surplus. Their chosen one, else 250/500/750.
  if (T != null) {
    const sizes = Number(daily_kcal_change) > 0 ? [Number(daily_kcal_change)] : [250, 500, 750];
    out.at_calorie_change = sizes.map((k) => {
      const rate = (k * 7) / KCAL_PER_LB; // lb/week the gap moves
      const weeks = absLb / rate;
      const pctBw = cur != null ? (rate / cur) * 100 : null;
      return {
        daily_kcal_change: losing ? -k : k,
        target_intake_kcal: Math.round(T + (losing ? -k : k)),
        rate_lb_per_week: round(rate, 2),
        weeks: round(weeks, 1),
        percent_bodyweight_per_week: pctBw != null ? round(pctBw, 2) : null,
        aggressive: pctBw != null ? pctBw > 1 : false,
        ...etaOf(weeks),
      };
    });
  }

  // Lens C — hit a named deadline: what it takes, and whether that's sane.
  if (Number(in_weeks) > 0) {
    const reqRate = absLb / Number(in_weeks);
    const reqKcal = Math.round((reqRate * KCAL_PER_LB) / 7);
    const pctBw = cur != null ? (reqRate / cur) * 100 : null;
    out.for_your_deadline = {
      weeks: Number(in_weeks),
      required_rate_lb_per_week: round(reqRate, 2),
      required_daily_kcal_change: losing ? -reqKcal : reqKcal,
      target_intake_kcal: T != null ? Math.round(T + (losing ? -reqKcal : reqKcal)) : null,
      percent_bodyweight_per_week: pctBw != null ? round(pctBw, 2) : null,
      aggressive: pctBw != null ? pctBw > 1 : false,
    };
  }

  return out;
}

// ---- weekly summary --------------------------------------------------
//  A recap of a finished week: how much you trained, any new PRs, total
//  volume, the week's bodyweight move, and how the eating went. All measured
//  from the same logs everything else on Insights reads. `startKey`..`endKey`
//  are the week's Monday..Sunday.
export function weeklySummary({ meals, weights, logs, startKey, endKey }) {
  const keys = windowKeys(endKey, 7); // = startKey .. endKey (Mon..Sun)

  const trainDates = new Set();
  let volume = 0;
  const prs = [];
  Object.entries(logs || {}).forEach(([name, entries]) => {
    const inWeek = (entries || []).filter((e) => e.date >= startKey && e.date <= endKey && (e.sets?.length || 0) > 0);
    inWeek.forEach((e) => {
      trainDates.add(e.date);
      (e.sets || []).forEach((s) => { volume += (Number(s.w) || 0) * (Number(s.r) || 0); });
    });
    const weekBest = Math.max(0, ...inWeek.map((e) => bestE1RM(e)));
    const priorBest = Math.max(0, ...(entries || []).filter((e) => e.date < startKey).map((e) => bestE1RM(e)));
    if (weekBest > 0 && priorBest > 0 && weekBest > priorBest + 0.01) prs.push(name);
  });

  const wKeys = keys.filter((k) => Number(weights?.[k]) > 0);
  const bwStart = wKeys.length ? Number(weights[wKeys[0]]) : null;
  const bwEnd = wKeys.length ? Number(weights[wKeys[wKeys.length - 1]]) : null;

  const loggedDays = keys.filter((k) => (meals?.[k]?.length || 0) > 0);
  const avgKcal = mean(loggedDays.map((k) => dayTotals(meals, k).kcal));
  const avgProtein = mean(loggedDays.map((k) => dayTotals(meals, k).protein));

  const workouts = trainDates.size;
  return {
    startKey,
    endKey,
    workouts,
    volume: Math.round(volume),
    prs,
    bwStart: bwStart != null ? round(bwStart, 1) : null,
    bwEnd: bwEnd != null ? round(bwEnd, 1) : null,
    bwChange: bwStart != null && bwEnd != null ? round(bwEnd - bwStart, 1) : null,
    weighIns: wKeys.length,
    mealDays: loggedDays.length,
    avgKcal: Math.round(avgKcal) || null,
    avgProtein: Math.round(avgProtein) || null,
    hasActivity: workouts > 0 || loggedDays.length > 0 || wKeys.length > 0,
  };
}

// ---- coach context --------------------------------------------------
//  Everything the AI coach is allowed to see, assembled from the raw logs in one
//  place so the coach can live anywhere in the app, not only on Insights. It's
//  handed the *computed* figures, never the raw logs — interpretation is the only
//  part it's better at than the arithmetic. `snapshot` is the read-out it reasons
//  from; `planCtx` is what the timeline tool (lib/claude.js) computes against.
export function coachContext({ meals, weights, logs, targets, today }) {
  const ins = buildInsights({ meals, weights, logs, targets, endKey: today });
  const { tdee, strength, resolved, bodyweight, proteinPerLb } = ins;
  const formula = formulaTDEE({ sex: targets?.sex, heightIn: targets?.heightIn, age: targets?.age, weightLb: bodyweight });
  const adapt = tdeeAdaptation(meals, weights, today, resolved.goal.id);
  const bw = bodyweightSeries(weights, today);
  const goalProj = projectGoal({ smoothed: bw.smoothed, goalWeight: targets?.goalWeight, slopePerWeek: bw.slopePerWeek });

  const snapshot = {
    goal: resolved.goal.label,
    bodyweight_lb: bodyweight,
    measured_tdee_kcal: tdee.tdee,
    tdee_plausible_range: tdee.ready ? [tdee.lo, tdee.hi] : null,
    avg_daily_intake_kcal: Math.round(tdee.intake.avgKcal) || null,
    avg_daily_protein_g: Math.round(tdee.intake.avgProtein) || null,
    protein_g_per_lb: proteinPerLb ? Number(proteinPerLb.toFixed(2)) : null,
    bodyweight_change_lb_per_week: tdee.trend.slopePerWeek !== null ? Number(tdee.trend.slopePerWeek.toFixed(2)) : null,
    est_1rm_change_pct_28d: strength.pct !== null ? Number(strength.pct.toFixed(1)) : null,
    lifts_tracked: strength.n,
    training_volume_lb_28d: strength.volume,
    per_lift_change_pct: strength.moves.slice(0, 6).map((m) => ({ lift: m.name, change_pct: Number(m.pct.toFixed(1)), sessions: m.sessions })),
    days_of_meals_logged: tdee.intake.daysLogged,
    days_of_weigh_ins: tdee.trend.n,
    data_is_sufficient_for_tdee: tdee.ready,
    formula_tdee_estimate_kcal: !tdee.ready && formula ? formula.tdee : null,
    tdee_trend: adapt.ready
      ? { recent_kcal: adapt.now, prior_kcal: adapt.prior, change_kcal: adapt.delta, metabolic_adaptation: adapt.adapting }
      : null,
    goal_weight_lb: Number(targets?.goalWeight) || null,
    weeks_to_goal_at_current_rate: goalProj && !goalProj.reached && !goalProj.stalled ? goalProj.weeks : null,
  };

  const planCtx = {
    currentLb: bw.smoothed ?? bodyweight,
    tdee: tdee.ready ? tdee.tdee : formula ? formula.tdee : null,
    tdeeMeasured: tdee.ready,
    ratePerWeek: bw.slopePerWeek,
    today,
  };

  return { snapshot, planCtx };
}

// ---- per-lift strength curve ----------------------------------------
//  One lift's estimated 1RM, session by session, so you can watch a single bar
//  climb rather than the averaged index. Each point is the best e1RM of that
//  day's sets; the set that produced it rides along for the tooltip.
export function liftE1rmSeries(logs, name, endKey, days = 120) {
  const from = shiftKey(endKey, -(days - 1));
  const entries = (logs?.[name] || [])
    .filter((e) => e.date >= from && e.date <= endKey && (e.sets?.length || 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return entries.map((e) => {
    let top = null, topV = 0;
    (e.sets || []).forEach((s) => { const v = e1rm(s.w, s.r); if (v > topV) { topV = v; top = s; } });
    return { date: e.date.slice(5).replace("-", "/"), e1rm: Math.round(topV), w: top?.w ?? null, r: top?.r ?? null };
  });
}

// The lifts worth charting — those with at least two logged sessions, so there's
// actually a line to draw. Newest-trained first.
export function trackedLifts(logs, endKey, days = 120) {
  const from = shiftKey(endKey, -(days - 1));
  return Object.entries(logs || {})
    .map(([name, entries]) => {
      const sessions = (entries || []).filter((e) => e.date >= from && e.date <= endKey && (e.sets?.length || 0) > 0);
      const last = sessions.length ? sessions.map((e) => e.date).sort().slice(-1)[0] : null;
      return { name, sessions: sessions.length, last };
    })
    .filter((l) => l.sessions >= 2)
    .sort((a, b) => (b.last || "").localeCompare(a.last || ""));
}

// ---- consistency grid -----------------------------------------------
//  A calendar heatmap: for each day, how many of the three logs it has — a meal,
//  a weigh-in, a workout (0–3). Laid out Monday→Sunday in weekly columns ending
//  on this week, so the habit (and the gaps) reads at a glance.
export function activityGrid(meals, weights, logs, endKey, weeks = 15) {
  const trained = new Set();
  Object.values(logs || {}).forEach((entries) => (entries || []).forEach((e) => { if (e.sets?.length) trained.add(e.date); }));

  const isoDow = (key) => { const d = new Date(`${key}T00:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };
  const thisMon = shiftKey(endKey, -(isoDow(endKey) - 1));
  const startMon = shiftKey(thisMon, -(weeks - 1) * 7);

  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const key = shiftKey(startMon, w * 7 + d);
      const future = key > endKey;
      let level = 0;
      if (!future) {
        if ((meals?.[key]?.length || 0) > 0) level++;
        if (Number(weights?.[key]) > 0) level++;
        if (trained.has(key)) level++;
      }
      days.push({ key, level, future });
    }
    cols.push(days);
  }
  return cols;
}

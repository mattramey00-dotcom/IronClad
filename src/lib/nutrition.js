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

export const DEFAULT_TARGETS = { goal: "recomp", kcal: null, protein: null };

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

export const EMPTY_TOTALS = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function mealTotals(list) {
  return (list || []).reduce(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export const dayTotals = (meals, key) => mealTotals(meals?.[key]);

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
    Object.entries(logs || {}).forEach(([name, entries]) => {
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

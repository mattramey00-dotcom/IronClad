// ============================================================
//  IRONCLAD — meal plan (optional, rigid 7-day schedule)
// ============================================================
//  Pure helpers, no model calls, no network — same rule as nutrition.js. A meal
//  plan is a repeating cycle of days (usually 7) anchored to a calendar date, so
//  "Day 3" resolves to a real date the same way the workout rotation does.
//
//  The design decision that keeps this from being a second app: a planned meal
//  carries its nutrition in the *same field names* a logged meal uses (kcal,
//  protein, carbs, fat, sugar, sodium, fiber, cholesterol). Checking one off
//  logs it into the normal `meals` store with source "plan" and a `planMealId`
//  back-reference — so the plan is just a faster way to log, and every existing
//  number (totals, TDEE, Insights) picks it up for free. Water is deliberately
//  absent: it stays the separate manual tracker in both modes.
// ============================================================

import { daysBetween, mealTotals } from "./nutrition.js";

// The meal slots, in the order a day is eaten. Snacks are optional — a plan may
// prescribe none, and skipping them isn't "incomplete".
export const SLOTS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks", optional: true },
];

export const SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
const SLOT_IDS = SLOTS.map((s) => s.id);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---- calendar mapping ------------------------------------------------

export const planLength = (plan) => plan?.days?.length || 0;

// Which day of the cycle (0-based) a calendar date lands on. Anchored so the
// same date always resolves to the same plan day, and it wraps forever forward
// and backward. Null when there's no plan to map against.
export function planDayIndex(plan, dateKey) {
  const len = planLength(plan);
  if (!len || !plan?.anchor) return null;
  const d = daysBetween(plan.anchor, dateKey);
  return ((d % len) + len) % len;
}

export function planDay(plan, dateKey) {
  const i = planDayIndex(plan, dateKey);
  return i == null ? null : plan.days[i];
}

export const planDayMeals = (plan, dateKey) => planDay(plan, dateKey)?.meals || [];

// The day's prescribed totals — the target the plan-mode bars fill toward.
export const planDayTotals = (plan, dateKey) => mealTotals(planDayMeals(plan, dateKey));

// The prescribed totals for a raw day object (used by the review screen, which
// works by day index rather than by calendar date).
export const dayTotals = (day) => mealTotals(day?.meals || []);

// ---- grouping for display -------------------------------------------
//  A day's meals bucketed into slots, in eating order, dropping empty slots so a
//  plan with no snacks doesn't render an empty "Snacks" header.
export function groupBySlot(meals) {
  return SLOTS
    .map((s) => ({ ...s, meals: (meals || []).filter((m) => (m.slot || "snack") === s.id) }))
    .filter((g) => g.meals.length > 0);
}

// ---- turning a planned meal into a logged one ------------------------
//  The nutrition fields already match a logged meal's, so this is mostly
//  stamping identity: a fresh log id, the time it was checked, the source, and
//  the back-reference the card uses to know this planned meal is "eaten".
export function plannedToLogged(planned, { id, time }) {
  return {
    id,
    time,
    name: planned.name || "Meal",
    kcal: num(planned.kcal),
    protein: num(planned.protein),
    carbs: num(planned.carbs),
    fat: num(planned.fat),
    sugar: planned.sugar != null ? num(planned.sugar) : undefined,
    sodium: planned.sodium != null ? num(planned.sodium) : undefined,
    fiber: planned.fiber != null ? num(planned.fiber) : undefined,
    cholesterol: planned.cholesterol != null ? num(planned.cholesterol) : undefined,
    source: "plan",
    planMealId: planned.id,
  };
}

// Which planned-meal ids are already logged on a given day — the card reads this
// to render a meal as checked. Derived purely from the presence of a logged meal
// carrying that planMealId, so the checkbox and the log can never drift apart
// (delete the meal from the log and it un-checks itself).
export function loggedPlanIds(dayMeals) {
  const set = new Set();
  (dayMeals || []).forEach((m) => { if (m.planMealId) set.add(m.planMealId); });
  return set;
}

// ---- normalising an imported / generated plan ------------------------
//  Whatever a parse or a generator hands back is coerced into the stored shape:
//  a fixed number of days, each meal pinned to a known slot with numeric macros
//  and a stable id. `estimated` carries the field names the source didn't state
//  (so the review screen can flag them). Deterministic ids (d{day}-m{i}) stay
//  stable across reloads, which is what the logged-meal back-reference relies on.
export function normalizePlan(raw, { anchor, name, source, days = 7 } = {}) {
  const inDays = Array.isArray(raw?.days) ? raw.days : [];
  const out = [];
  for (let di = 0; di < days; di++) {
    const meals = Array.isArray(inDays[di]?.meals) ? inDays[di].meals : [];
    out.push({
      meals: meals.map((m, mi) => ({
        id: `d${di}-m${mi}`,
        slot: SLOT_IDS.includes(m.slot) ? m.slot : "snack",
        name: (m.name || "Meal").toString().slice(0, 120),
        kcal: num(m.kcal),
        protein: num(m.protein),
        carbs: num(m.carbs),
        fat: num(m.fat),
        sugar: num(m.sugar),
        sodium: num(m.sodium),
        fiber: num(m.fiber),
        cholesterol: num(m.cholesterol),
        // field names the source didn't state, filled by estimate — flagged so
        // the review screen can show what wasn't on the original plan.
        estimated: Array.isArray(m.estimated) ? m.estimated.filter((k) => typeof k === "string") : [],
      })),
    });
  }
  return {
    name: (name || raw?.name || "Meal plan").toString().slice(0, 80),
    source: source || "import",
    importedAt: null, // stamped by the caller, which has a clock
    anchor,
    days: out,
  };
}

// A one-line "Day N of M" label for the plan card header.
export function planDayLabel(plan, dateKey) {
  const i = planDayIndex(plan, dateKey);
  const len = planLength(plan);
  return i == null ? "" : `Day ${i + 1} / ${len}`;
}

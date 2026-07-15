// ============================================================
//  IRONCLAD — persistence
// ============================================================
//  localStorage, namespaced per profile. Two people, two phones, no backend.
//
//  Two things are stored:
//    plan   — the shared config (who trains when, the rotation). Identical on
//             both phones; that's what lets each of you see the other's week
//             without syncing anything. Moved between devices as a plan code.
//    per-profile progress + logs — yours alone, on your device.
//
//  Completion is keyed by DATE, not by weekday. The old app keyed it
//  "Monday::Barbell Bench Press", which meant the "day resets in HH:MM:SS"
//  countdown was decorative — your checkmarks sat there under that weekday
//  forever until you hit reset by hand.
// ============================================================

const NS = "ironclad";

const read = (key) => {
  try {
    return localStorage.getItem(`${NS}:${key}`);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(`${NS}:${key}`, value);
    return true;
  } catch {
    // Private mode, quota, or a locked-down webview. The app keeps working
    // for the session; it just won't survive a reload.
    return false;
  }
};

const remove = (key) => {
  try {
    localStorage.removeItem(`${NS}:${key}`);
  } catch {
    /* nothing sensible to do */
  }
};

const readJSON = (key, fallback) => {
  const raw = read(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// ---- plan (shared between both devices) ----------------------------

export const loadPlan = () => readJSON("plan", null);
export const savePlan = (plan) => write("plan", JSON.stringify(plan));

// ---- which person this device belongs to ---------------------------

export const loadMe = () => read("me");
export const saveMe = (personId) => write("me", personId);

// ---- plan code -----------------------------------------------------
//  How the plan gets from your phone to hers. Base64 of the plan JSON, short
//  enough to text. She pastes it, picks which person she is, and both phones
//  now compute the same calendar forever after — no accounts, no server.

export function encodePlan(plan) {
  const json = JSON.stringify(plan);
  // btoa is byte-oriented; round-trip through UTF-8 so names with accents or
  // emoji survive the trip.
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function decodePlan(code) {
  try {
    const binary = atob(code.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const plan = JSON.parse(new TextDecoder().decode(bytes));
    // Validate enough that a mistyped code fails loudly instead of half-loading
    // and quietly desyncing the two phones.
    if (
      !plan ||
      typeof plan.anchor !== "string" ||
      !Array.isArray(plan.people) ||
      plan.people.length !== 2 ||
      !Array.isArray(plan.rotation) ||
      !plan.rotation.length ||
      !plan.schedules?.A ||
      !plan.schedules?.B
    ) {
      return null;
    }
    return plan;
  } catch {
    return null;
  }
}

// ---- per-profile data ----------------------------------------------
//  progress: { "2026-07-13::Barbell Bench Press": true }
//  logs:     { "Barbell Bench Press": [ { date, sets: [{ w, r }] } ] }

export const loadProgress = (personId) => readJSON(`progress:${personId}`, {});
export const saveProgress = (personId, progress) =>
  write(`progress:${personId}`, JSON.stringify(progress));

export const loadLogs = (personId) => readJSON(`logs:${personId}`, {});
export const saveLogs = (personId, logs) => write(`logs:${personId}`, JSON.stringify(logs));

// ---- nutrition (per profile) ----------------------------------------
//  meals:   { "2026-07-14": [ { id, time, name, kcal, protein, carbs, fat, ... } ] }
//  weights: { "2026-07-14": 182.4 }   — lb, one weigh-in per day
//  targets: { goal, kcal, protein }   — nulls mean "derive it from my own data"

export const loadMeals = (personId) => readJSON(`meals:${personId}`, {});
export const saveMeals = (personId, meals) => write(`meals:${personId}`, JSON.stringify(meals));

export const loadWeights = (personId) => readJSON(`weights:${personId}`, {});
export const saveWeights = (personId, weights) =>
  write(`weights:${personId}`, JSON.stringify(weights));

export const loadTargets = (personId) => readJSON(`targets:${personId}`, null);
export const saveTargets = (personId, targets) =>
  write(`targets:${personId}`, JSON.stringify(targets));

// ---- the API key (this device only) ----------------------------------
//  Deliberately NOT part of the plan, and therefore NOT in the plan code — you
//  text that code to your partner, and a secret that travels by SMS isn't one.
//  Each phone holds its own key, or none, and the app works either way.

export const loadApiKey = () => read("apikey") || "";
export const saveApiKey = (key) => (key ? write("apikey", key) : remove("apikey"));

export const loadModel = () => read("model") || "";
export const saveModel = (model) => write("model", model);

// ---- migration from the single-user app -----------------------------
//  The old app kept one unnamespaced bucket of logs and progress. Those logs
//  are real training history and must not be lost, so they move to whichever
//  profile this device belongs to.
//
//  The old *progress* is dropped on purpose: it was keyed by weekday with no
//  date, so there is no honest way to say which Monday a checkmark belonged
//  to. The logs — dated, and the thing the charts are built from — carry over
//  intact.

export function migrateLegacy(personId) {
  const legacyLogs = read("logs");
  const alreadyMigrated = read(`logs:${personId}`) != null;
  if (!legacyLogs || alreadyMigrated) return false;

  write(`logs:${personId}`, legacyLogs);
  // Keep the original key as a backstop rather than deleting it outright —
  // a botched migration should not be able to eat someone's training history.
  write("logs:legacy-backup", legacyLogs);
  remove("progress"); // weekday-keyed, undatable
  return true;
}

export function resetEverything() {
  ["plan", "me", "apikey", "model"].forEach(remove);
  ["p1", "p2"].forEach((id) => {
    ["progress", "logs", "meals", "weights", "targets"].forEach((k) => remove(`${k}:${id}`));
  });
}

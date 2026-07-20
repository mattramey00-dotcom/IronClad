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

// ---- water intake (per profile) -------------------------------------
//  Ounces of water per day, keyed by date: { "2026-07-20": 88 }. A per-profile
//  daily tally, reset by nature each day (a new date key starts at zero).
export const loadWater = (personId) => readJSON(`water:${personId}`, {});
export const saveWater = (personId, water) => write(`water:${personId}`, JSON.stringify(water));

// ---- supplements (per profile) --------------------------------------
//  A purely self-defined checklist — NO recommendations. `supps` is the list
//  the person built ([{ id, name, dose }]); `supplog` records which of them
//  were ticked off on each day ({ "2026-07-20": [id, id] }). The value of a
//  supplement is consistency, so a daily tick is all this is.
export const loadSupps = (personId) => readJSON(`supps:${personId}`, []);
export const saveSupps = (personId, supps) => write(`supps:${personId}`, JSON.stringify(supps));
export const loadSuppLog = (personId) => readJSON(`supplog:${personId}`, {});
export const saveSuppLog = (personId, log) => write(`supplog:${personId}`, JSON.stringify(log));

// ---- favourite meals (per profile) ----------------------------------
//  The meals you eat on repeat, saved so re-logging them is one tap. Logging
//  friction is what quietly kills the whole TDEE estimate, so this is really a
//  data-quality feature wearing a convenience hat.

export const loadFavMeals = (personId) => readJSON(`favmeals:${personId}`, []);
export const saveFavMeals = (personId, favs) => write(`favmeals:${personId}`, JSON.stringify(favs));

// ---- exercise substitutions (per profile, this device only) ----------
//  A personal "I can't do that movement — give me this instead" override,
//  keyed by the original exercise name → the replacement { n, s, d }. Like
//  travel mode it's a switch on this phone, never part of the shared plan, so
//  swapping the overhead press for a landmine press doesn't touch the rotation
//  or your partner's week. Logs land under the replacement's own name, which is
//  what you want — a different lift is different history.

export const loadSubs = (personId) => readJSON(`subs:${personId}`, {});
export const saveSubs = (personId, subs) => write(`subs:${personId}`, JSON.stringify(subs));

// ---- weekly summary (per profile) -----------------------------------
//  The Sunday (endKey) of the most recent week whose summary this person has
//  already seen — so the launch pop-up fires once per finished week, not on
//  every open. Reopening it from Insights doesn't depend on this.
export const loadWeeklySeen = (personId) => read(`weeklyseen:${personId}`) || "";
export const saveWeeklySeen = (personId, endKey) => write(`weeklyseen:${personId}`, endKey);

// ---- added / accessory exercises (per profile) ----------------------
//  Extra movements a person tacks onto a day from the "Target a muscle" picker,
//  keyed by date → [{ n, s, d }]. They show up in that day's exercise list on
//  top of the prescribed plan, so the whole session is visible — but they don't
//  change the shared program, and they don't count toward the day's plan-done
//  gold tick (that stays about finishing the prescribed workout).

export const loadExtras = (personId) => readJSON(`extras:${personId}`, {});
export const saveExtras = (personId, extras) => write(`extras:${personId}`, JSON.stringify(extras));

// ---- progress photo index (per profile) -----------------------------
//  Just the index — [{ id, date, angle }] — pointing at blobs held in
//  IndexedDB (lib/photos.js). The scale wobbles week to week; a photo doesn't.

export const loadPhotos = (personId) => readJSON(`photos:${personId}`, []);
export const savePhotos = (personId, photos) => write(`photos:${personId}`, JSON.stringify(photos));

// ---- the API key (this device only) ----------------------------------
//  Deliberately NOT part of the plan, and therefore NOT in the plan code — you
//  text that code to your partner, and a secret that travels by SMS isn't one.
//  Each phone holds its own key, or none, and the app works either way.

export const loadApiKey = () => read("apikey") || "";
export const saveApiKey = (key) => (key ? write("apikey", key) : remove("apikey"));

export const loadModel = () => read("model") || "";
export const saveModel = (model) => write("model", model);

// ---- the WorkoutX key, for animated exercise demos (this device only) ----
//  Same reasoning as the AI key: it's a secret, so it never rides along in the
//  plan code. Without it the app just shows the photo/SVG demos instead.

export const loadWxKey = () => read("wxkey") || "";
export const saveWxKey = (key) => (key ? write("wxkey", key) : remove("wxkey"));

// ---- theme (this device only) ----------------------------------------
//  "dark" (default) or "light". A per-device preference, never part of the plan.
export const loadTheme = () => (read("theme") === "light" ? "light" : "dark");
export const saveTheme = (t) => (t === "light" ? write("theme", "light") : remove("theme"));

// ---- rest-timer notifications (this device only) ---------------------
//  Opt-in: whether to fire a system notification when a rest ends, so you get a
//  buzz without watching the clock. A device preference, not part of the plan.
export const loadNotify = () => read("restnotify") === "1";
export const saveNotify = (on) => (on ? write("restnotify", "1") : remove("restnotify"));

// ---- full-device backup (export / import) ---------------------------
//  There is no server, so a wiped phone is a wiped account. These two lift the
//  entire `ironclad:*` namespace out to a plain object (for a JSON file the user
//  saves to their own device) and write it back on restore. Everything under the
//  namespace goes — plan, profile logs, meals, weights, keys — so a restore is a
//  faithful clone of the phone at export time. Photo blobs live in IndexedDB and
//  are handled alongside this in lib/backup.js.

export function dumpLocal() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${NS}:`)) out[key.slice(NS.length + 1)] = localStorage.getItem(key);
    }
  } catch {
    /* storage unavailable — caller gets an empty dump */
  }
  return out;
}

export function restoreLocal(map) {
  Object.entries(map || {}).forEach(([k, v]) => {
    if (typeof v === "string") write(k, v);
  });
}

// When the last backup was taken, and which month we've already nudged about —
// so the end-of-month reminder fires once a month, not on every open.
export const loadLastBackup = () => read("lastbackup") || "";
export const saveLastBackup = (iso) => write("lastbackup", iso);
export const loadBackupNudge = () => read("backupnudge") || "";
export const saveBackupNudge = (monthKey) => write("backupnudge", monthKey);

// ---- travel (weight-free) mode (this device only) --------------------
//  A temporary "I'm on the road, no gym" switch, not a change to the shared
//  program — so it lives on the phone, never in the plan code. Off by default;
//  each phone flips it for themselves when their trip starts and back when
//  they're home.

export const loadTravel = () => read("travel") === "1";
export const saveTravel = (on) => (on ? write("travel", "1") : remove("travel"));

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
  ["plan", "me", "apikey", "model", "travel", "wxkey", "lastbackup", "backupnudge", "restnotify", "theme"].forEach(remove);
  ["p1", "p2"].forEach((id) => {
    ["progress", "logs", "meals", "weights", "targets", "favmeals", "subs", "extras", "weeklyseen", "water", "supps", "supplog"].forEach((k) => remove(`${k}:${id}`));
  });
}

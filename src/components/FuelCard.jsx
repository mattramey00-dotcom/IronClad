// ============================================================
//  IRONCLAD — the day's fuel
// ============================================================
//  Three ways in: a photo, a sentence, or by hand. All three land in the same
//  place — an editable draft you confirm before it's saved.
//
//  That confirmation step is not friction to be optimised away. A photo cannot
//  see the oil in the pan; a model that logs 620 kcal silently, with no chance
//  to correct it, is quietly poisoning the TDEE estimate that the whole feature
//  rests on. Two seconds of "yes, that's about right" is what makes the numbers
//  downstream worth anything.
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import Hint from "./Hint.jsx";
import MealHistoryModal from "./MealHistoryModal.jsx";
import SavedMealsModal from "./SavedMealsModal.jsx";
import BarcodeScanner from "./BarcodeScanner.jsx";
import FuelArt from "./FuelArt.jsx";
import { mealTotals, proteinDistribution, proteinCadence, SODIUM_DV_MG, SUGAR_DV_G, FIBER_DV_G, CHOLESTEROL_DV_MG } from "../lib/nutrition.js";
import { lookupBarcode } from "../lib/food.js";
import {
  compressImage, estimateMealFromPhoto, estimateMealFromText, lookupChainMeal, explainError, DEFAULT_MODEL,
} from "../lib/claude.js";

const PROTEIN_COLOR = "#e0b44a";
const WATER_COLOR = "#56b6d9";
const SODIUM_COLOR = "#8f9bb3"; // a cool slate — distinct from protein amber, calorie indigo, water blue
const SUGAR_COLOR = "#d98fb0";  // a muted rose
const FIBER_COLOR = "#9aa86a";  // a muted olive-green
const CHOL_COLOR = "#b58fae";   // a muted mauve
const OVER_COLOR = "#e08a6a";   // the same warm tone the calorie bar uses when past target
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Blank draft — what "add by hand" starts from, and the shape the model fills.
const EMPTY_DRAFT = {
  name: "", kcal: "", protein: "", carbs: "", fat: "", sugar: "", sodium: "", fiber: "", cholesterol: "",
  items: [], caveat: "", confidence: null, source: "manual",
};

// The tappable meal-row area (name + macros + kcal) opens the editor, so you no
// longer have to hit a tiny pencil. Its siblings — save and remove — get proper
// ~40px touch targets instead of the old 18px icons that were nearly impossible
// to tap on a phone.
const rowEditBtn = {
  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
  background: "transparent", border: "none", padding: "2px 0", margin: 0,
  cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit",
};
const rowActBtn = {
  flex: "0 0 auto", width: 38, height: 38, borderRadius: 9, background: "transparent",
  border: "none", cursor: "pointer", fontFamily: "inherit", display: "grid", placeItems: "center",
  color: "var(--text-dim)",
};

// A translucent colour per logging method, so the meal list reads at a glance —
// a scanned item, a photo estimate and a hand-entered meal each get their own
// faint tint and matching source tag. Manual/re-logged meals stay neutral.
const MEAL_TINT = {
  photo: "129,140,248",   // indigo — the photo estimator
  barcode: "86,182,217",  // teal — a barcode scan
  web: "122,176,138",     // green — a published/online lookup
  text: "224,180,74",     // amber — a described meal
};

function Bar({ label, value, target, color, over, unit, hint }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const past = target && value > target;
  return (
    <div style={S.macroRow}>
      <div style={S.macroTop}>
        <span style={S.macroName}>{label}</span>
        <span style={{ ...S.macroVal, color: past && over ? "#e08a6a" : "var(--text)" }}>
          {Math.round(value).toLocaleString()}
          {target
            ? <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> / {Math.round(target).toLocaleString()}</span>
            : unit ? <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> {unit}</span> : null}
        </span>
      </div>
      {target ? (
        <div style={S.macroBar}>
          <div style={{ ...S.macroFill, width: `${pct}%`, background: past && over ? "#e08a6a" : color }} />
        </div>
      ) : hint ? (
        // No target to scale against — say why the bar isn't here, don't just
        // drop it silently (that reads as "the bar disappeared").
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, lineHeight: 1.4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

// A daily-value reference bar. Unlike the protein/calorie bars, these have no
// personal target — they fill against the neutral FDA Daily Value printed on
// every label. Two flavours: a `ceiling` to stay under (sodium, sugar,
// cholesterol — warns warm when exceeded) and a `floor` to reach (fiber — reads
// as met, not over, once you pass it). Rendered only when the day carries the
// stat, so an unknown never shows as an empty or zeroed bar.
function RefBar({ label, value, dv, color, unit, kind }) {
  const pct = dv ? Math.min(100, (value / dv) * 100) : 0;
  const ceiling = kind !== "floor";
  const over = ceiling && value > dv;
  const met = !ceiling && value >= dv;
  const dvText = unit === "mg" ? dv.toLocaleString() : dv;
  return (
    <div style={{ marginTop: 9 }}>
      <div style={S.macroTop}>
        <span style={S.macroName}>{label}</span>
        <span style={{ ...S.macroVal, color: over ? OVER_COLOR : "var(--text)" }}>
          {Math.round(value).toLocaleString()}
          <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> / {dvText} {unit}</span>
        </span>
      </div>
      <div style={S.macroBar}>
        <div style={{ ...S.macroFill, width: `${pct}%`, background: over ? OVER_COLOR : color }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
        {ceiling
          ? over
            ? `${Math.round(value - dv).toLocaleString()} ${unit} over the ${dvText} ${unit} daily value`
            : `of the ${dvText} ${unit} daily value`
          : met
            ? `✓ past the ${dvText} ${unit} daily target`
            : `of the ${dvText} ${unit} daily target`}
      </div>
    </div>
  );
}

export default function FuelCard({
  meals, allMeals, today, isToday = true, targets, apiKey, model, restMode, favorites = [],
  proteinAlerts = false, onSetProteinAlerts,
  water = 0, waterTarget = 80, onAddWater,
  supps = [], suppTaken = [], onAddSupp, onRemoveSupp, onToggleSupp,
  compose, setCompose,
  onAddMeal, onRemoveMeal, onEditMeal, onRelogMeal, onLogFavorite, onSaveFavorite, onRemoveFavorite, onOpenInsights, onCopyDay,
}) {
  // The whole in-progress compose lifecycle — which panel is open, the editable
  // draft a web lookup / photo / description produced, the text box, AND the
  // loading state — lives in the parent, so it all survives leaving and
  // returning to the Fuel tab. The request itself is a fired promise that keeps
  // running regardless of this component; because busy/label live in the parent
  // too, coming back mid-search still shows "Searching…" so you know it's
  // working and don't re-fire the call. Wrapper setters keep the rest unchanged.
  const { mode, draft, editingId, text, busy = false, busyLabel = "Reading the plate…", error = "" } = compose;
  const apply = (patch) => setCompose((c) => ({ ...c, ...patch }));
  const setMode = (v) => apply({ mode: typeof v === "function" ? v(mode) : v });
  const setDraft = (v) => apply({ draft: typeof v === "function" ? v(draft) : v });
  const setEditingId = (v) => apply({ editingId: typeof v === "function" ? v(editingId) : v });
  const setText = (v) => apply({ text: typeof v === "function" ? v(text) : v });
  const setBusy = (v) => apply({ busy: typeof v === "function" ? v(busy) : v });
  const setBusyLabel = (v) => apply({ busyLabel: typeof v === "function" ? v(busyLabel) : v });
  const setError = (v) => apply({ error: typeof v === "function" ? v(error) : v });
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false); // the "+ Meal" how-to-add popup
  const [addingSupp, setAddingSupp] = useState(false);
  const [suppName, setSuppName] = useState("");
  const [suppDose, setSuppDose] = useState("");
  const fileRef = useRef(null);
  const composerRef = useRef(null);

  // The add/edit form lives at the top of the meals section — so tapping a
  // logged meal to fix it never buries the editor below a long list. Bring it
  // into view whenever it opens (or you switch to editing a different meal).
  useEffect(() => {
    if ((mode === "draft" || mode === "text") && composerRef.current) {
      composerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [mode, editingId]);

  const hasHistory = Object.values(allMeals || {}).some((l) => l?.length);

  const totals = mealTotals(meals);
  const pd = proteinDistribution(meals, targets.protein);
  // Cadence guidance — when the next protein dose is due — only for today, where
  // "now" is meaningful. Recomputes on each render (a logged meal, added water).
  const nowDate = new Date();
  const cadence = isToday ? proteinCadence(meals, nowDate.getHours() * 60 + nowDate.getMinutes(), targets.protein) : null;
  const cadenceHot = cadence && (cadence.status === "due" || cadence.status === "overdue");
  // Notifications need a real Notification API (absent on e.g. iOS Safari outside
  // an installed PWA) — hide the bell where it can't work.
  const canNotify = typeof window !== "undefined" && "Notification" in window && !!onSetProteinAlerts;
  // The permission prompt must run inside the tap, so it lives here, not in a
  // background effect.
  const toggleProteinAlerts = async () => {
    if (proteinAlerts) { onSetProteinAlerts(false); return; }
    if (Notification.permission !== "granted") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      } catch (e) {
        return;
      }
    }
    onSetProteinAlerts(true);
  };

  const reset = () => {
    apply({ mode: null, draft: null, editingId: null, text: "", busy: false, error: "" });
  };

  // Load an already-logged meal back into the draft editor to fix its numbers.
  const startEdit = (m) => {
    setDraft({
      name: m.name || "",
      kcal: Math.round(num(m.kcal)),
      protein: Math.round(num(m.protein)),
      carbs: Math.round(num(m.carbs)),
      fat: Math.round(num(m.fat)),
      sugar: m.sugar != null ? Math.round(num(m.sugar)) : "",
      sodium: m.sodium != null ? Math.round(num(m.sodium)) : "",
      fiber: m.fiber != null ? Math.round(num(m.fiber)) : "",
      cholesterol: m.cholesterol != null ? Math.round(num(m.cholesterol)) : "",
      items: m.items || [],
      caveat: "",
      confidence: null,
      source: m.source || "manual",
    });
    setEditingId(m.id);
    setMode("draft");
    setError("");
  };

  // Whatever the model gives back is a *suggestion*. It lands in the form, not
  // in the log.
  const intoDraft = (est, source) => {
    setDraft({
      name: est.name || "",
      kcal: Math.round(num(est.kcal)),
      protein: Math.round(num(est.protein_g)),
      carbs: Math.round(num(est.carbs_g)),
      fat: Math.round(num(est.fat_g)),
      sugar: est.sugar_g != null ? Math.round(num(est.sugar_g)) : "",
      sodium: est.sodium_mg != null ? Math.round(num(est.sodium_mg)) : "",
      fiber: est.fiber_g != null ? Math.round(num(est.fiber_g)) : "",
      cholesterol: est.cholesterol_mg != null ? Math.round(num(est.cholesterol_mg)) : "",
      items: est.items || [],
      caveat: est.caveat || "",
      confidence: est.confidence || null,
      source,
    });
    setMode("draft");
  };

  const needKey = () => {
    if (apiKey) return false;
    setError("Add your Anthropic API key in Settings to estimate from a photo or a description. Manual entry works without one.");
    return true;
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same photo be picked twice
    if (!file) return;
    if (needKey()) return;

    setBusy(true);
    setBusyLabel("Reading the plate…");
    setError("");
    try {
      const image = await compressImage(file);
      const est = await estimateMealFromPhoto({ apiKey, model: model || DEFAULT_MODEL, image });
      intoDraft(est, "photo");
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  };

  const onDescribe = async () => {
    if (!text.trim()) return;
    if (needKey()) return;

    setBusy(true);
    setBusyLabel("Reading the plate…");
    setError("");
    try {
      const est = await estimateMealFromText({ apiKey, model: model || DEFAULT_MODEL, text });
      intoDraft(est, "text");
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  };

  // The chain / packaged-food path: search the web for the *published* numbers
  // rather than guessing. Same confirm-before-save draft as everything else.
  const onLookup = async () => {
    if (!text.trim()) return;
    if (needKey()) return;

    setBusy(true);
    setBusyLabel("Searching published nutrition…");
    setError("");
    try {
      const est = await lookupChainMeal({ apiKey, model: model || DEFAULT_MODEL, query: text });
      intoDraft(est, "web");
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  };

  // A scanned barcode goes straight to the free Open Food Facts database — no
  // Anthropic key needed, so this path works even with no key set. Same
  // confirm-before-save draft as every other method.
  const onScanResult = async (code) => {
    setShowScanner(false);
    if (!code) return;
    setBusy(true);
    setBusyLabel("Looking up the barcode…");
    setError("");
    try {
      const est = await lookupBarcode(code);
      intoDraft(est, "barcode");
    } catch (err) {
      setError(err?.message || "Couldn't look up that barcode.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!draft) return;
    // Editing an existing meal: patch its numbers in place, don't add a new one.
    if (editingId) {
      onEditMeal(editingId, {
        name: draft.name.trim() || "Meal",
        kcal: num(draft.kcal),
        protein: num(draft.protein),
        carbs: num(draft.carbs),
        fat: num(draft.fat),
        sugar: draft.sugar === "" ? undefined : num(draft.sugar),
        sodium: draft.sodium === "" ? undefined : num(draft.sodium),
        fiber: draft.fiber === "" ? undefined : num(draft.fiber),
        cholesterol: draft.cholesterol === "" ? undefined : num(draft.cholesterol),
      });
      reset();
      return;
    }
    onAddMeal({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toTimeString().slice(0, 5),
      name: draft.name.trim() || "Meal",
      kcal: num(draft.kcal),
      protein: num(draft.protein),
      carbs: num(draft.carbs),
      fat: num(draft.fat),
      sugar: draft.sugar === "" ? undefined : num(draft.sugar),
      sodium: draft.sodium === "" ? undefined : num(draft.sodium),
      fiber: draft.fiber === "" ? undefined : num(draft.fiber),
      cholesterol: draft.cholesterol === "" ? undefined : num(draft.cholesterol),
      source: draft.source,
      // Keep what the model said *and* the fact that you changed it. If the
      // TDEE estimate ever looks wrong, this is the audit trail.
      confidence: draft.confidence || null,
      items: draft.items?.length ? draft.items : undefined,
    });
    reset();
  };

  // One row of the "+ Meal" popup — an icon tile, a label and a one-line hint.
  // Picking one closes the sheet and runs the chosen add flow.
  const addItem = (icon, label, sub, fn) => (
    <button
      onClick={() => { setAddMenuOpen(false); fn(); }}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent",
        border: "none", borderRadius: 12, padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-hi)", display: "grid", placeItems: "center", color: "var(--text-2)", flex: "0 0 auto" }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)" }}>{sub}</span>
      </span>
    </button>
  );

  return (
    <div style={S.fuelCard}>
      <div style={S.fuelHead}>
        <span style={S.fuelTitle}>Fuel</span>
        <button
          style={{ ...S.statsBtn, marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}
          onClick={onOpenInsights}
        >
          <Icon name="chart" size={13} /> Insights
        </button>
      </div>

      <Hint id="fuel">
        Add meals by photo, a sentence, or by hand — tap <b>+ Meal</b> for every way in. Your intake
        here and your morning weigh-in on <b>Insights</b> both feed the numbers there.
      </Hint>

      {/* On Sunday this is a record, not a scoreboard. No bars, no targets, no
          implication that there's something left to finish. The intake still has
          to be logged — a missing Sunday would bias the TDEE estimate low — but
          it doesn't need to be nagged about. */}
      {restMode ? (
        <div style={S.fuelSection}>
          <div style={{ ...S.macroMini, marginTop: 0, fontSize: 13 }}>
            <span><b style={{ color: "var(--text)" }}>{Math.round(totals.kcal).toLocaleString()}</b> kcal</span>
            <span><b style={{ color: PROTEIN_COLOR }}>{Math.round(totals.protein)}</b> g protein</span>
            {totals.sodium > 0 && (
              <span><b style={{ color: totals.sodium > SODIUM_DV_MG ? OVER_COLOR : "var(--text)" }}>{Math.round(totals.sodium).toLocaleString()}</b> mg sodium</span>
            )}
            {!meals?.length && <span style={{ color: "var(--text-faint)" }}>nothing logged yet</span>}
          </div>
        </div>
      ) : (
        <div style={{ ...S.fuelSection, position: "relative", overflow: "hidden" }}>
          <FuelArt kind="protein" />
          <div style={{ position: "relative", zIndex: 1 }}>
          <Bar
            label="Protein"
            value={totals.protein}
            target={targets.protein}
            color={PROTEIN_COLOR}
            unit="g"
            hint="Log a weigh-in on Insights and your protein target — and this bar — appear."
          />

          {/* how protein is spread today + how much is left */}
          {targets.protein > 0 && (
            <>
              {pd.doses >= 2 && (
                <div style={{ display: "flex", gap: 2, height: 4, marginTop: -3, marginBottom: 7 }} aria-hidden>
                  {pd.meals.map((m, i) => (
                    <div
                      key={i}
                      title={`${m.name}: ${m.protein} g`}
                      style={{ flex: m.protein, background: PROTEIN_COLOR, borderRadius: 2, opacity: pd.backLoaded && m.protein === Math.round(pd.maxShare * pd.total) ? 1 : 0.55 }}
                    />
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", fontSize: 11.5, color: "var(--text-mute)", marginTop: pd.doses >= 2 ? 0 : -5, marginBottom: 3 }}>
                {pd.remaining > 0 ? (
                  <span>
                    <b style={{ color: PROTEIN_COLOR }}>{pd.remaining} g</b> to go
                    {pd.scoops >= 0.5 ? ` · ≈ ${pd.scoops} scoop${pd.scoops >= 1.5 ? "s" : ""} whey` : ""}
                  </span>
                ) : (
                  <span style={{ color: "#7a9a7a" }}>✓ protein target hit</span>
                )}
                {pd.doses > 0 && (
                  <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>{pd.doses} meal{pd.doses === 1 ? "" : "s"}</span>
                )}
              </div>
              {pd.backLoaded && (
                <div style={{ fontSize: 11, color: "#c9a86a", background: "rgba(224,180,74,.08)", border: "1px solid rgba(224,180,74,.2)", borderRadius: 8, padding: "6px 9px", lineHeight: 1.4, marginBottom: 3 }}>
                  {Math.round(pd.maxShare * 100)}% of today's protein is in one meal — the same grams build a little more muscle spread across 3–4 meals.
                </div>
              )}
            </>
          )}

          {/* protein cadence — a nudge on when the next dose is due, so protein
              is spread ~25–40 g every 2–3 hrs rather than crammed into one meal */}
          {cadence && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8, marginTop: targets.protein > 0 ? 7 : 6, marginBottom: 3,
                padding: "7px 10px", borderRadius: 9,
                background: cadenceHot ? "rgba(224,180,74,.12)" : "var(--surface-2)",
                border: `1px solid ${cadenceHot ? "rgba(224,180,74,.45)" : "var(--border-hi)"}`,
              }}
            >
              <span style={{ color: PROTEIN_COLOR, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="clock" size={14} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.45, color: cadenceHot ? "#d8b976" : "var(--text-mute)" }}>{cadence.text}</span>
              {canNotify && (
                <button
                  onClick={toggleProteinAlerts}
                  title={proteinAlerts ? "Protein reminders on — tap to turn off" : "Remind me when the next dose is due"}
                  aria-label={proteinAlerts ? "Turn off protein reminders" : "Turn on protein reminders"}
                  style={{
                    flex: "0 0 auto", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    display: "grid", placeItems: "center",
                    background: proteinAlerts ? "rgba(224,180,74,.16)" : "transparent",
                    border: `1px solid ${proteinAlerts ? "rgba(224,180,74,.5)" : "var(--border-hi)"}`,
                    color: proteinAlerts ? PROTEIN_COLOR : "var(--text-dim)",
                  }}
                >
                  <Icon name={proteinAlerts ? "bell" : "bellOff"} size={15} />
                </button>
              )}
            </div>
          )}
          {cadence && proteinAlerts && (
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2, marginBottom: 3, lineHeight: 1.4 }}>
              Reminders alert you while IronClad is open — keep it running in the background.
            </div>
          )}

          <Bar
            label="Calories"
            value={totals.kcal}
            target={targets.kcal}
            color={ACCENT}
            over
            unit="kcal"
            hint="Your calorie target appears once there's enough logged data to measure your TDEE."
          />
          <div style={S.macroMini}>
            <span>Carbs {Math.round(totals.carbs)} g</span>
            <span>Fat {Math.round(totals.fat)} g</span>
            {targets.derived && targets.kcal && (
              <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>target from your own TDEE</span>
            )}
          </div>

          {/* daily-value references — sodium/sugar/cholesterol as ceilings to
              stay under, fiber as a floor to reach. Each appears only once
              something you've logged carries that figure, so a stat we simply
              don't know for a meal never shows as a zero. These are neutral label
              references, not personal targets like protein and calories above. */}
          {(totals.fiber > 0 || totals.sugar > 0 || totals.sodium > 0 || totals.cholesterol > 0) && (
            <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 2 }}>
                Daily-value references
              </div>
              {totals.fiber > 0 && (
                <RefBar label="Fiber" value={totals.fiber} dv={FIBER_DV_G} color={FIBER_COLOR} unit="g" kind="floor" />
              )}
              {totals.sugar > 0 && (
                <RefBar label="Sugar" value={totals.sugar} dv={SUGAR_DV_G} color={SUGAR_COLOR} unit="g" kind="ceiling" />
              )}
              {totals.sodium > 0 && (
                <RefBar label="Sodium" value={totals.sodium} dv={SODIUM_DV_MG} color={SODIUM_COLOR} unit="mg" kind="ceiling" />
              )}
              {totals.cholesterol > 0 && (
                <RefBar label="Cholesterol" value={totals.cholesterol} dv={CHOLESTEROL_DV_MG} color={CHOL_COLOR} unit="mg" kind="ceiling" />
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* ---- trackers: water + supplements, each an enclosed bordered panel so
              they read as distinct widgets rather than blurring together ---- */}

      {/* water — a daily hydration tally against a bodyweight-based rec */}
      {onAddWater && (
        <div style={{ ...S.fuelSection, position: "relative", overflow: "hidden" }}>
          <FuelArt kind="waves" />
          <div style={{ position: "relative", zIndex: 1 }}>
          <div style={S.fuelSectionHead}>
            <Icon name="drop" size={13} style={{ color: WATER_COLOR }} /> Water
            <span style={S.fuelSectionCount}>
              {water}<span style={{ color: "var(--text-faint)", fontWeight: 400 }}> / {waterTarget} oz</span>
            </span>
          </div>
          <div style={S.macroBar}>
            <div style={{ ...S.macroFill, width: `${waterTarget ? Math.min(100, (water / waterTarget) * 100) : 0}%`, background: WATER_COLOR }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
            {[8, 16, 24].map((oz) => (
              <button
                key={oz}
                onClick={() => onAddWater(oz)}
                style={{ background: "rgba(86,182,217,.1)", border: "1px solid rgba(86,182,217,.4)", color: WATER_COLOR, borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                +{oz} oz
              </button>
            ))}
            {water > 0 && (
              <button
                onClick={() => onAddWater(-8)}
                style={{ background: "transparent", border: "1px solid var(--border-hi)", color: "var(--text-dim)", borderRadius: 999, padding: "6px 11px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
                aria-label="Remove 8 ounces"
              >
                −8
              </button>
            )}
            {water >= waterTarget ? (
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#7a9a7a" }}>✓ hydrated</span>
            ) : (
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-dim)" }}>
                {Math.max(0, Math.round((waterTarget - water) / 8))} cup{Math.round((waterTarget - water) / 8) === 1 ? "" : "s"} to go
              </span>
            )}
          </div>
          </div>
        </div>
      )}

      {/* supplements — a self-defined daily checklist, no recommendations */}
      {onToggleSupp && (
        <div style={S.fuelSection}>
          <div style={S.fuelSectionHead}>
            Supplements
            {supps.length > 0 && (
              <span style={S.fuelSectionCount}>
                {suppTaken.filter((id) => supps.some((s) => s.id === id)).length}/{supps.length} taken
              </span>
            )}
          </div>
          {supps.map((s) => {
            const taken = suppTaken.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => onToggleSupp(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, borderRadius: 10, cursor: "pointer",
                  background: taken ? "rgba(129,140,248,.1)" : "var(--surface-2)",
                  border: `1px solid ${taken ? "rgba(129,140,248,.4)" : "var(--border-hi)"}`,
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: taken ? ACCENT : "transparent", border: `2px solid ${taken ? ACCENT : "var(--border-hi)"}`, color: "#0B1020" }}>
                  {taken && <Icon name="check" size={14} strokeWidth={2.8} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, color: taken ? "var(--text)" : "var(--text-2)" }}>{s.name}</span>
                  {s.dose && <span style={{ fontSize: 12, color: "var(--text-dim)" }}> · {s.dose}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRemoveSupp(s.id); }} style={{ ...S.mealX }} aria-label={`Remove ${s.name}`}>×</button>
              </div>
            );
          })}
          {addingSupp ? (
            <div style={{ marginTop: 4 }}>
              <input autoFocus style={{ ...S.textInput, marginBottom: 6 }} placeholder="Name — e.g. Creatine" value={suppName} onChange={(e) => setSuppName(e.target.value)} />
              <input style={{ ...S.textInput, marginBottom: 8 }} placeholder="Dose (optional) — e.g. 5 g" value={suppDose} onChange={(e) => setSuppDose(e.target.value)} />
              <div style={S.addRow}>
                <button style={{ ...S.addBtn, ...S.addBtnPrimary, opacity: suppName.trim() ? 1 : 0.5 }} disabled={!suppName.trim()} onClick={() => { onAddSupp(suppName, suppDose); setSuppName(""); setSuppDose(""); setAddingSupp(false); }}>Add</button>
                <button style={S.addBtn} onClick={() => { setSuppName(""); setSuppDose(""); setAddingSupp(false); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              style={{ ...S.addBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={() => setAddingSupp(true)}
            >
              <Icon name="plus" size={14} /> {supps.length ? "Add another" : "Add a supplement to check off daily"}
            </button>
          )}
        </div>
      )}

      {/* ---- meal log ---- */}
      <div style={{ ...S.fuelSection, position: "relative", overflow: "hidden" }}>
        <FuelArt kind="food" />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={S.fuelSectionHead}>
          Meals
          {meals?.length > 0 && <span style={S.fuelSectionCount}>{meals.length} meal{meals.length === 1 ? "" : "s"}</span>}
        </div>

      {/* Active add/edit composer — kept at the TOP of the section, right under
          the header, so editing a logged meal (or adding a new one) never means
          scrolling past the whole list to reach the form. */}
      <div ref={composerRef}>
        {busy && (
          <div style={{ ...S.addRow, marginTop: 4, marginBottom: 4, alignItems: "center", gap: 10, color: "#8a9a8a", fontSize: 13 }}>
            <span style={S.spinner} />
            {busyLabel}
          </div>
        )}

        {mode === "text" && !busy && (
          <div style={{ marginBottom: 12 }}>
            <input
              autoFocus
              style={S.textInput}
              placeholder="two eggs, toast with butter — or 'Chipotle chicken bowl'"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onDescribe()}
            />
            <div style={{ ...S.addRow, marginTop: 8 }}>
              <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={onDescribe}>Estimate</button>
              <button style={S.addBtn} onClick={reset}>Cancel</button>
            </div>
            <button
              style={{ ...S.addBtn, width: "100%", marginTop: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              onClick={onLookup}
            >
              <Icon name="search" size={14} /> Look it up online — for chains &amp; packaged foods
            </button>
            <div style={S.note}>
              Describe home cooking for a quick estimate. For a named restaurant or packaged item, <b>Look
              it up online</b> pulls the brand's published nutrition instead of guessing.
            </div>
          </div>
        )}

        {/* the draft — always editable, always confirmed */}
        {mode === "draft" && draft && !busy && (
          <div style={{ ...S.draftCard, marginTop: 0, marginBottom: 12 }}>
            {editingId && <div style={{ ...S.label, marginBottom: 8 }}>Editing meal</div>}
            <input
              style={{ ...S.textInput, marginBottom: 2 }}
              placeholder="What was it?"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />

            {draft.items?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {draft.items.map((it, i) => (
                  <div key={i} style={S.draftItem}>
                    {it.food} · <span style={{ color: "var(--text-dim)" }}>{it.portion}</span> ·{" "}
                    {Math.round(num(it.kcal))} kcal, {Math.round(num(it.protein_g))}g protein
                  </div>
                ))}
              </div>
            )}

            <div style={S.macroGrid}>
              {[
                ["Kcal", "kcal"],
                ["Protein", "protein"],
                ["Carbs", "carbs"],
                ["Fat", "fat"],
              ].map(([label, key]) => (
                <div key={key} style={S.macroCell}>
                  <span style={S.macroCellLabel}>{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    style={S.macroCellInput}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {/* secondary stats — their own grid so the four energy macros above
                keep their tidy row. All optional; blank means "not known", not
                zero, so an unknown never drags a day's totals down. */}
            <div style={{ ...S.macroGrid, marginTop: 8 }}>
              {[
                ["Sugar (g)", "sugar"],
                ["Sodium (mg)", "sodium"],
                ["Fiber (g)", "fiber"],
                ["Chol. (mg)", "cholesterol"],
              ].map(([label, key]) => (
                <div key={key} style={S.macroCell}>
                  <span style={S.macroCellLabel}>{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    style={S.macroCellInput}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {draft.caveat && (
              <div style={S.caveat}>
                <b>{draft.confidence === "low" ? "Low confidence" : "Worth knowing"}</b> — {draft.caveat}
                {" "}Correct anything that's off before you save it.
              </div>
            )}

            <div style={{ ...S.addRow, marginTop: 12 }}>
              <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={save}>{editingId ? "Save changes" : "Save meal"}</button>
              <button style={S.addBtn} onClick={reset}>{editingId ? "Cancel" : "Discard"}</button>
            </div>
          </div>
        )}

        {error && <div style={{ ...S.err, marginTop: 0, marginBottom: 10 }}>{error}</div>}
      </div>

      {meals?.length > 0 && (
        <div>
          {meals.map((m) => {
            const savedFav = favorites.find((f) => (f.name || "").trim().toLowerCase() === (m.name || "").trim().toLowerCase());
            const saved = !!savedFav;
            const rgb = MEAL_TINT[m.source];
            const editing = editingId === m.id;
            const rowStyle = {
              ...(rgb
                ? { ...S.mealRow, background: `rgba(${rgb},.08)`, border: `1px solid rgba(${rgb},.35)` }
                : S.mealRow),
              // the meal currently loaded in the top editor gets an accent ring
              ...(editing ? { border: `1px solid ${ACCENT}`, boxShadow: `0 0 0 1px ${ACCENT} inset` } : {}),
            };
            return (
            <div key={m.id} style={rowStyle}>
              {/* tap the meal itself to edit it */}
              <button style={rowEditBtn} onClick={() => startEdit(m)} title="Edit meal" aria-label={`Edit ${m.name}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.mealName}>
                    {m.name}
                    {(m.source === "photo" || m.source === "text" || m.source === "web" || m.source === "barcode") && (
                      <span style={rgb ? { ...S.srcTag, color: `rgb(${rgb})`, borderColor: `rgba(${rgb},.55)` } : S.srcTag}>
                        {m.source === "photo" ? "photo" : m.source === "web" ? "web" : m.source === "barcode" ? "scan" : "ai"}
                      </span>
                    )}
                  </div>
                  <div style={S.mealMacros}>
                    {Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f
                    {m.sugar > 0 ? ` · ${Math.round(m.sugar)} sugar` : ""}
                    {m.sodium > 0 ? ` · ${Math.round(m.sodium).toLocaleString()} mg` : ""}
                    {m.fiber > 0 ? ` · ${Math.round(m.fiber)} fiber` : ""}
                    {m.cholesterol > 0 ? ` · ${Math.round(m.cholesterol)} chol` : ""}
                    {m.time ? ` · ${m.time}` : ""}
                  </div>
                </div>
                <div style={S.mealKcal}>{Math.round(m.kcal).toLocaleString()}</div>
              </button>
              {/* star toggles the meal in/out of Quick add — solid when saved */}
              <button
                style={{ ...rowActBtn, color: saved ? "#e0b44a" : "var(--text-dim)" }}
                onClick={() => (saved ? onRemoveFavorite?.(savedFav.id) : onSaveFavorite?.(m))}
                title={saved ? "In Quick add — tap to remove" : "Save to Quick add"}
                aria-label={saved ? `Remove ${m.name} from quick add` : `Save ${m.name} to quick add`}
              >
                <Icon name="star" size={16} filled={saved} />
              </button>
              <button
                style={rowActBtn}
                onClick={() => onRemoveMeal(m.id)}
                title="Remove meal"
                aria-label={`Remove ${m.name}`}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            );
          })}
        </div>
      )}

      {/* nothing logged yet — a quiet prompt above the button */}
      {!meals?.length && mode === null && !busy && (
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", padding: "1px 2px 2px" }}>Nothing logged yet.</div>
      )}

      {/* add / edit — one "+ Meal" button opens the how-to-add menu (keeps the
          section uncluttered); "Edit meals" moves the day's meals elsewhere. */}
      {mode === null && !busy && (
        <div style={{ ...S.addRow, marginTop: meals?.length ? 12 : 8 }}>
          <button
            style={{ ...S.addBtn, ...S.addBtnPrimary, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onClick={() => { setError(""); setAddMenuOpen(true); }}
          >
            <Icon name="plus" size={15} /> Meal
          </button>
          {meals?.length > 0 && onCopyDay && (
            <button
              style={{ ...S.addBtn, flex: "0 0 auto", padding: "10px 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={onCopyDay}
            >
              <Icon name="calendar" size={14} /> Move meals
            </button>
          )}
        </div>
      )}

      {/* No `capture` attribute on purpose: on a phone this lets the picker
          offer BOTH "Take Photo" and "Photo Library", so an existing picture
          can be uploaded and analysed — not only a shot taken on the spot. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPhoto}
        style={{ display: "none" }}
      />

        </div>
      </div>


      {showHistory && (
        <MealHistoryModal
          allMeals={allMeals}
          today={today}
          onRelog={(m) => onRelogMeal?.(m)}
          onSaveFavorite={onSaveFavorite}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showSaved && (
        <SavedMealsModal
          favorites={favorites}
          onLog={onLogFavorite}
          onRemove={onRemoveFavorite}
          onClose={() => setShowSaved(false)}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onResult={onScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* the "+ Meal" popup — a bottom sheet listing the ways to add, so the
          section shows one button instead of a wall of them. */}
      {addMenuOpen && (
        <div style={{ ...S.modalWrap, alignItems: "flex-end", padding: 0 }} onClick={() => setAddMenuOpen(false)}>
          <div
            style={{
              width: "100%", maxWidth: 520, margin: "0 auto", background: "var(--surface)",
              borderTop: "1px solid var(--border-hi)", borderRadius: "20px 20px 0 0",
              padding: "10px 12px calc(16px + env(safe-area-inset-bottom))",
              boxShadow: "0 -12px 40px -12px rgba(0,0,0,.5)", animation: "fade .18s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--border-hi)", margin: "2px auto 12px" }} />
            <div style={{ ...S.label, padding: "0 6px", marginBottom: 6 }}>Add a meal</div>
            {addItem("camera", "Photo", "Snap or upload a plate", () => fileRef.current?.click())}
            {addItem("pencil", "Describe it", "Type what you ate", () => { setMode("text"); setError(""); })}
            {addItem("barcode", "Scan a barcode", "For packaged foods", () => { setError(""); setShowScanner(true); })}
            {addItem("plus", "By hand", "Enter the numbers yourself", () => { setDraft({ ...EMPTY_DRAFT }); setMode("draft"); setError(""); })}
            {favorites.length > 0 && addItem("star", "Saved meals", "Re-log a favourite", () => setShowSaved(true))}
            {hasHistory && addItem("clock", "Past meals", "Re-log from history", () => setShowHistory(true))}
          </div>
        </div>
      )}
    </div>
  );
}

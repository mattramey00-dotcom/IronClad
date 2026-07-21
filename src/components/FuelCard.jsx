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

import React, { useState, useRef } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import Hint from "./Hint.jsx";
import MealHistoryModal from "./MealHistoryModal.jsx";
import SavedMealsModal from "./SavedMealsModal.jsx";
import BarcodeScanner from "./BarcodeScanner.jsx";
import FuelArt from "./FuelArt.jsx";
import { mealTotals, proteinDistribution, SODIUM_DV_MG } from "../lib/nutrition.js";
import { lookupBarcode } from "../lib/food.js";
import {
  compressImage, estimateMealFromPhoto, estimateMealFromText, lookupChainMeal, explainError, DEFAULT_MODEL,
} from "../lib/claude.js";

const PROTEIN_COLOR = "#e0b44a";
const WATER_COLOR = "#56b6d9";
const SODIUM_COLOR = "#8f9bb3"; // a cool slate — distinct from protein amber, calorie indigo, water blue
const OVER_COLOR = "#e08a6a";   // the same warm tone the calorie bar uses when past target
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Blank draft — what "add by hand" starts from, and the shape the model fills.
const EMPTY_DRAFT = {
  name: "", kcal: "", protein: "", carbs: "", fat: "", sodium: "",
  items: [], caveat: "", confidence: null, source: "manual",
};

function Bar({ label, value, target, color, over }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const past = target && value > target;
  return (
    <div style={S.macroRow}>
      <div style={S.macroTop}>
        <span style={S.macroName}>{label}</span>
        <span style={{ ...S.macroVal, color: past && over ? "#e08a6a" : "var(--text)" }}>
          {Math.round(value).toLocaleString()}
          {target ? <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> / {Math.round(target).toLocaleString()}</span> : null}
        </span>
      </div>
      {target ? (
        <div style={S.macroBar}>
          <div style={{ ...S.macroFill, width: `${pct}%`, background: past && over ? "#e08a6a" : color }} />
        </div>
      ) : null}
    </div>
  );
}

export default function FuelCard({
  meals, allMeals, today, weight, targets, apiKey, model, restMode, favorites = [],
  water = 0, waterTarget = 80, onAddWater,
  supps = [], suppTaken = [], onAddSupp, onRemoveSupp, onToggleSupp,
  compose, setCompose,
  onAddMeal, onRemoveMeal, onEditMeal, onRelogMeal, onLogFavorite, onSaveFavorite, onRemoveFavorite, onWeigh, onOpenInsights, onCopyDay,
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
  const [weighing, setWeighing] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false); // Quick-add chips start collapsed
  const [addingSupp, setAddingSupp] = useState(false);
  const [suppName, setSuppName] = useState("");
  const [suppDose, setSuppDose] = useState("");
  const fileRef = useRef(null);

  const hasHistory = Object.values(allMeals || {}).some((l) => l?.length);

  const totals = mealTotals(meals);
  const pd = proteinDistribution(meals, targets.protein);

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
      sodium: m.sodium != null ? Math.round(num(m.sodium)) : "",
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
      sodium: est.sodium_mg != null ? Math.round(num(est.sodium_mg)) : "",
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
        sodium: draft.sodium === "" ? undefined : num(draft.sodium),
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
      sodium: draft.sodium === "" ? undefined : num(draft.sodium),
      source: draft.source,
      // Keep what the model said *and* the fact that you changed it. If the
      // TDEE estimate ever looks wrong, this is the audit trail.
      confidence: draft.confidence || null,
      items: draft.items?.length ? draft.items : undefined,
    });
    reset();
  };

  const submitWeight = () => {
    const lb = parseFloat(weighing);
    if (Number.isFinite(lb) && lb > 0 && lb < 1000) {
      onWeigh(lb);
      setWeighing("");
    }
  };

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
        Add meals by photo, a sentence, or by hand — and tap <b>Log weight</b> at the bottom once a
        day, same time each morning. Both feed the numbers on Insights.
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
          <Bar label="Protein" value={totals.protein} target={targets.protein} color={PROTEIN_COLOR} />

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

          <Bar label="Calories" value={totals.kcal} target={targets.kcal} color={ACCENT} over />
          <div style={S.macroMini}>
            <span>Carbs {Math.round(totals.carbs)} g</span>
            <span>Fat {Math.round(totals.fat)} g</span>
            {targets.derived && targets.kcal && (
              <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>target from your own TDEE</span>
            )}
          </div>

          {/* sodium — a ceiling to watch, shown against the FDA daily value.
              Only appears once something you've logged carries a sodium figure,
              so it never implies "zero sodium" for foods we simply don't know. */}
          {totals.sodium > 0 && (
            <div style={{ marginTop: 9 }}>
              <div style={S.macroTop}>
                <span style={S.macroName}>Sodium</span>
                <span style={{ ...S.macroVal, color: totals.sodium > SODIUM_DV_MG ? OVER_COLOR : "var(--text)" }}>
                  {Math.round(totals.sodium).toLocaleString()}
                  <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> / {SODIUM_DV_MG.toLocaleString()} mg</span>
                </span>
              </div>
              <div style={S.macroBar}>
                <div style={{ ...S.macroFill, width: `${Math.min(100, (totals.sodium / SODIUM_DV_MG) * 100)}%`, background: totals.sodium > SODIUM_DV_MG ? OVER_COLOR : SODIUM_COLOR }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                {totals.sodium > SODIUM_DV_MG
                  ? `${Math.round(totals.sodium - SODIUM_DV_MG).toLocaleString()} mg over the 2,300 mg daily value`
                  : "of the 2,300 mg daily value"}
              </div>
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

      {meals?.length > 0 && (
        <div>
          {meals.map((m) => (
            <div key={m.id} style={S.mealRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.mealName}>
                  {m.name}
                  {(m.source === "photo" || m.source === "text" || m.source === "web" || m.source === "barcode") && (
                    <span style={S.srcTag}>{m.source === "photo" ? "photo" : m.source === "web" ? "web" : m.source === "barcode" ? "scan" : "ai"}</span>
                  )}
                </div>
                <div style={S.mealMacros}>
                  {Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f
                  {m.sodium > 0 ? ` · ${Math.round(m.sodium).toLocaleString()} mg` : ""}
                  {m.time ? ` · ${m.time}` : ""}
                </div>
              </div>
              <div style={S.mealKcal}>{Math.round(m.kcal).toLocaleString()}</div>
              <button
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px 2px", display: "grid", placeItems: "center", fontFamily: "inherit" }}
                onClick={() => startEdit(m)}
                title="Edit meal"
                aria-label={`Edit ${m.name}`}
              >
                <Icon name="pencil" size={14} />
              </button>
              <button
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px 2px", display: "grid", placeItems: "center", fontFamily: "inherit" }}
                onClick={() => onSaveFavorite?.(m)}
                title="Save to Quick add"
                aria-label={`Save ${m.name} to quick add`}
              >
                <Icon name="star" size={14} />
              </button>
              <button style={S.mealX} onClick={() => onRemoveMeal(m.id)} aria-label="remove meal">×</button>
            </div>
          ))}
          {/* logged on the wrong day? send the whole day elsewhere */}
          {onCopyDay && (
            <button
              style={{ ...S.addBtn, width: "100%", marginTop: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, color: "var(--text-mute)" }}
              onClick={onCopyDay}
            >
              <Icon name="calendar" size={14} /> Copy or move to another day
            </button>
          )}
        </div>
      )}

      {/* quick add — the meals you eat on repeat, one tap to re-log. Collapsed
          by default so a long list of saved meals doesn't crowd the section. */}
      {favorites.length > 0 && mode === null && !busy && (
        <div style={{ marginTop: meals?.length ? 12 : 14 }}>
          <button
            onClick={() => setQuickOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent",
              border: "none", padding: "2px 0", cursor: "pointer", fontFamily: "inherit",
              ...S.label, marginBottom: quickOpen ? 8 : 0,
            }}
            aria-expanded={quickOpen}
          >
            Quick add
            <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>{favorites.length}</span>
            <Icon
              name="chevron"
              size={14}
              style={{ marginLeft: "auto", color: "var(--text-dim)", transform: quickOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
            />
          </button>
          {quickOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {favorites.map((f) => (
              <div key={f.id} style={{ display: "inline-flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border-hi)", borderRadius: 99, overflow: "hidden" }}>
                <button
                  onClick={() => onLogFavorite(f)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "var(--text-2)", fontFamily: "inherit", fontSize: 12, padding: "7px 4px 7px 11px", cursor: "pointer", maxWidth: 200, minWidth: 0 }}
                >
                  <Icon name="plus" size={11} style={{ color: ACCENT }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{Math.round(f.kcal)}</span>
                </button>
                <button
                  onClick={() => onRemoveFavorite(f.id)}
                  style={{ background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: "6px 9px 6px 4px", fontSize: 13, fontFamily: "inherit" }}
                  aria-label={`Remove ${f.name} from quick add`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* add a meal */}
      {mode === null && !busy && (
        <>
          <div style={{ ...S.addRow, marginTop: meals?.length ? 10 : 13 }}>
            <button style={{ ...S.addBtn, ...S.addBtnPrimary, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={15} /> Photo
            </button>
            <button style={{ ...S.addBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => { setMode("text"); setError(""); }}>
              <Icon name="pencil" size={14} /> Describe
            </button>
            <button style={{ ...S.addBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => { setDraft({ ...EMPTY_DRAFT }); setMode("draft"); setError(""); }}>
              <Icon name="plus" size={14} /> By hand
            </button>
          </div>
          <button
            style={{ ...S.addBtn, width: "100%", marginTop: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            onClick={() => { setError(""); setShowScanner(true); }}
          >
            <Icon name="barcode" size={16} /> Scan a barcode — for packaged foods
          </button>
          {(favorites.length > 0 || hasHistory) && (
            <div style={{ ...S.addRow, marginTop: 8 }}>
              {favorites.length > 0 && (
                <button
                  style={{ ...S.addBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                  onClick={() => setShowSaved(true)}
                >
                  <Icon name="star" size={14} /> Saved meals
                </button>
              )}
              {hasHistory && (
                <button
                  style={{ ...S.addBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                  onClick={() => setShowHistory(true)}
                >
                  <Icon name="clock" size={14} /> Past meals
                </button>
              )}
            </div>
          )}
        </>
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

      {busy && (
        <div style={{ ...S.addRow, marginTop: 13, alignItems: "center", gap: 10, color: "#8a9a8a", fontSize: 13 }}>
          <span style={S.spinner} />
          {busyLabel}
        </div>
      )}

      {mode === "text" && !busy && (
        <div style={{ marginTop: 12 }}>
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
        <div style={S.draftCard}>
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

          {/* sodium — its own row so the four energy macros keep their tidy grid */}
          <div style={{ ...S.macroCell, marginTop: 8, maxWidth: 150 }}>
            <span style={S.macroCellLabel}>Sodium (mg)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              style={S.macroCellInput}
              value={draft.sodium}
              onChange={(e) => setDraft({ ...draft, sodium: e.target.value })}
            />
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

      {error && <div style={S.err}>{error}</div>}
        </div>
      </div>

      {/* ---- body weight — the other half of the TDEE math ---- */}
      <div style={S.fuelSection}>
        <div style={S.fuelSectionHead}>Body weight</div>
        <div style={S.weighRow}>
        <span style={{ color: "var(--text-mute)", display: "grid", placeItems: "center" }}><Icon name="scale" size={15} /></span>
        {weight ? (
          <>
            <span style={{ ...S.mealKcal, fontSize: 15 }}>{weight} lb</span>
            <button
              style={{ ...S.resetBtn, marginLeft: 0 }}
              onClick={() => { setWeighing(String(weight)); onWeigh(null); }}
            >
              change
            </button>
            <span style={S.weighDone}>logged today</span>
          </>
        ) : (
          <>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              style={S.weighInput}
              placeholder="lb"
              value={weighing}
              onChange={(e) => setWeighing(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitWeight()}
            />
            <button style={{ ...S.addBtn, flex: "0 0 auto", padding: "9px 14px" }} onClick={submitWeight}>
              Log weight
            </button>
            <span style={{ ...S.weighDone, marginLeft: "auto" }}>daily · same time</span>
          </>
        )}
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
    </div>
  );
}

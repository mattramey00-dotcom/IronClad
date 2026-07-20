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
import { mealTotals, proteinDistribution } from "../lib/nutrition.js";
import {
  compressImage, estimateMealFromPhoto, estimateMealFromText, lookupChainMeal, explainError, DEFAULT_MODEL,
} from "../lib/claude.js";

const PROTEIN_COLOR = "#e0b44a";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Blank draft — what "add by hand" starts from, and the shape the model fills.
const EMPTY_DRAFT = {
  name: "", kcal: "", protein: "", carbs: "", fat: "",
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
  onAddMeal, onRemoveMeal, onEditMeal, onRelogMeal, onLogFavorite, onSaveFavorite, onRemoveFavorite, onWeigh, onOpenInsights,
}) {
  const [mode, setMode] = useState(null); // null | "text" | "draft"
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null); // set when the draft is fixing an existing meal
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Reading the plate…");
  const [error, setError] = useState("");
  const [weighing, setWeighing] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const fileRef = useRef(null);

  const hasHistory = Object.values(allMeals || {}).some((l) => l?.length);

  const totals = mealTotals(meals);
  const pd = proteinDistribution(meals, targets.protein);

  const reset = () => {
    setMode(null);
    setDraft(null);
    setEditingId(null);
    setText("");
    setError("");
  };

  // Load an already-logged meal back into the draft editor to fix its numbers.
  const startEdit = (m) => {
    setDraft({
      name: m.name || "",
      kcal: Math.round(num(m.kcal)),
      protein: Math.round(num(m.protein)),
      carbs: Math.round(num(m.carbs)),
      fat: Math.round(num(m.fat)),
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
        <div style={{ ...S.macroMini, marginTop: 0, marginBottom: 8, fontSize: 13 }}>
          <span><b style={{ color: "var(--text)" }}>{Math.round(totals.kcal).toLocaleString()}</b> kcal</span>
          <span><b style={{ color: PROTEIN_COLOR }}>{Math.round(totals.protein)}</b> g protein</span>
          {!meals?.length && <span style={{ color: "var(--text-faint)" }}>nothing logged yet</span>}
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* meals */}
      {meals?.length > 0 && (
        <div style={{ marginTop: 13 }}>
          {meals.map((m) => (
            <div key={m.id} style={S.mealRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.mealName}>
                  {m.name}
                  {(m.source === "photo" || m.source === "text" || m.source === "web") && (
                    <span style={S.srcTag}>{m.source === "photo" ? "photo" : m.source === "web" ? "web" : "ai"}</span>
                  )}
                </div>
                <div style={S.mealMacros}>
                  {Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f
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
        </div>
      )}

      {/* quick add — the meals you eat on repeat, one tap to re-log */}
      {favorites.length > 0 && mode === null && !busy && (
        <div style={{ marginTop: meals?.length ? 12 : 14 }}>
          <div style={{ ...S.label, marginBottom: 7 }}>Quick add</div>
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

      {/* weigh-in — the other half of the TDEE math */}
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
    </div>
  );
}

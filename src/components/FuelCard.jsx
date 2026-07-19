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
import { mealTotals, proteinDistribution } from "../lib/nutrition.js";
import {
  compressImage, estimateMealFromPhoto, estimateMealFromText, explainError, DEFAULT_MODEL,
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
        <span style={{ ...S.macroVal, color: past && over ? "#e08a6a" : "#e8e8d8" }}>
          {Math.round(value).toLocaleString()}
          {target ? <span style={{ color: "#667", fontWeight: 400 }}> / {Math.round(target).toLocaleString()}</span> : null}
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
  meals, weight, targets, apiKey, model, restMode, favorites = [],
  onAddMeal, onRemoveMeal, onLogFavorite, onSaveFavorite, onRemoveFavorite, onWeigh, onOpenInsights,
}) {
  const [mode, setMode] = useState(null); // null | "text" | "draft"
  const [draft, setDraft] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [weighing, setWeighing] = useState("");
  const fileRef = useRef(null);

  const totals = mealTotals(meals);
  const pd = proteinDistribution(meals, targets.protein);

  const reset = () => {
    setMode(null);
    setDraft(null);
    setText("");
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

  const save = () => {
    if (!draft) return;
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
          <span><b style={{ color: "#e8e8d8" }}>{Math.round(totals.kcal).toLocaleString()}</b> kcal</span>
          <span><b style={{ color: PROTEIN_COLOR }}>{Math.round(totals.protein)}</b> g protein</span>
          {!meals?.length && <span style={{ color: "#556" }}>nothing logged yet</span>}
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
              <div style={{ display: "flex", alignItems: "center", fontSize: 11.5, color: "#8a8a9e", marginTop: pd.doses >= 2 ? 0 : -5, marginBottom: 3 }}>
                {pd.remaining > 0 ? (
                  <span>
                    <b style={{ color: PROTEIN_COLOR }}>{pd.remaining} g</b> to go
                    {pd.scoops >= 0.5 ? ` · ≈ ${pd.scoops} scoop${pd.scoops >= 1.5 ? "s" : ""} whey` : ""}
                  </span>
                ) : (
                  <span style={{ color: "#7a9a7a" }}>✓ protein target hit</span>
                )}
                {pd.doses > 0 && (
                  <span style={{ marginLeft: "auto", color: "#556" }}>{pd.doses} meal{pd.doses === 1 ? "" : "s"}</span>
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
              <span style={{ marginLeft: "auto", color: "#556" }}>target from your own TDEE</span>
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
                  {(m.source === "photo" || m.source === "text") && (
                    <span style={S.srcTag}>{m.source === "photo" ? "photo" : "ai"}</span>
                  )}
                </div>
                <div style={S.mealMacros}>
                  {Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f
                  {m.time ? ` · ${m.time}` : ""}
                </div>
              </div>
              <div style={S.mealKcal}>{Math.round(m.kcal).toLocaleString()}</div>
              <button
                style={{ background: "transparent", border: "none", color: "#6a6a80", cursor: "pointer", padding: "4px 2px", display: "grid", placeItems: "center", fontFamily: "inherit" }}
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
              <div key={f.id} style={{ display: "inline-flex", alignItems: "center", background: "#16171f", border: "1px solid #2a2c3b", borderRadius: 99, overflow: "hidden" }}>
                <button
                  onClick={() => onLogFavorite(f)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#c9c9d6", fontFamily: "inherit", fontSize: 12, padding: "7px 4px 7px 11px", cursor: "pointer", maxWidth: 200, minWidth: 0 }}
                >
                  <Icon name="plus" size={11} style={{ color: ACCENT }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ color: "#6a6a80", fontVariantNumeric: "tabular-nums" }}>{Math.round(f.kcal)}</span>
                </button>
                <button
                  onClick={() => onRemoveFavorite(f.id)}
                  style={{ background: "transparent", border: "none", color: "#5a5a70", cursor: "pointer", padding: "6px 9px 6px 4px", fontSize: 13, fontFamily: "inherit" }}
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
      )}

      {/* capture="environment" opens the rear camera straight away on a phone,
          while still allowing the library on desktop. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhoto}
        style={{ display: "none" }}
      />

      {busy && (
        <div style={{ ...S.addRow, marginTop: 13, alignItems: "center", gap: 10, color: "#8a9a8a", fontSize: 13 }}>
          <span style={S.spinner} />
          Reading the plate…
        </div>
      )}

      {mode === "text" && !busy && (
        <div style={{ marginTop: 12 }}>
          <input
            autoFocus
            style={S.textInput}
            placeholder="two eggs, toast with butter, black coffee"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onDescribe()}
          />
          <div style={{ ...S.addRow, marginTop: 8 }}>
            <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={onDescribe}>Estimate</button>
            <button style={S.addBtn} onClick={reset}>Cancel</button>
          </div>
          <div style={S.note}>
            Often better than a photo, and cheaper — you know what you ate and the camera doesn't.
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
                  {it.food} · <span style={{ color: "#667" }}>{it.portion}</span> ·{" "}
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
            <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={save}>Save meal</button>
            <button style={S.addBtn} onClick={reset}>Discard</button>
          </div>
        </div>
      )}

      {error && <div style={S.err}>{error}</div>}

      {/* weigh-in — the other half of the TDEE math */}
      <div style={S.weighRow}>
        <span style={{ color: "#8a8a9e", display: "grid", placeItems: "center" }}><Icon name="scale" size={15} /></span>
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
  );
}

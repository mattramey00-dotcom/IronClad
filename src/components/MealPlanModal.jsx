// ============================================================
//  IRONCLAD — import / generate a meal plan
// ============================================================
//  Four ways in — upload a document, paste text, generate with AI (guided by a
//  short questionnaire), or a photo of a printout. All land in the same
//  editable, confirm-before-save review: an imported number you never saw is a
//  number you can't trust, so every meal here is correctable before it saves,
//  and anything the source didn't state is flagged as estimated.
// ============================================================

import React, { useState, useRef } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import { parseMealPlan, generateMealPlan, compressImage, explainError, DEFAULT_MODEL } from "../lib/claude.js";
import { normalizePlan, dayTotals, SLOTS, SLOT_LABEL } from "../lib/mealplan.js";

// Read any file (a PDF, say) to raw base64 + media type for the API.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      resolve({ mediaType: file.type || "application/octet-stream", data: url.slice(url.indexOf(",") + 1) });
    };
    r.onerror = () => reject(new Error("That file couldn't be read."));
    r.readAsDataURL(file);
  });
}

// The macros the per-meal editor exposes, in two tidy rows.
const MACRO_FIELDS = [
  ["Kcal", "kcal"], ["Protein", "protein"], ["Carbs", "carbs"], ["Fat", "fat"],
  ["Sugar", "sugar"], ["Sodium", "sodium"], ["Fiber", "fiber"], ["Chol.", "cholesterol"],
];

export default function MealPlanModal({ apiKey, model, today, targets, bodyweight, onSave, onClose }) {
  const [step, setStep] = useState("choose"); // choose | text | generate | busy | review
  const [text, setText] = useState("");
  const [gen, setGen] = useState({ goalWeight: "", likes: "", onHand: "", avoid: "", snacks: true, effort: "quick" });
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // a normalized plan, mutated as it's edited
  const [name, setName] = useState("");
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState(null); // mealId whose editor is open
  const fileRef = useRef(null);

  const needKey = () => {
    if (apiKey) return false;
    setError("Add your Anthropic API key in Settings to read or generate a plan.");
    return true;
  };

  const toReview = (raw, source) => {
    const norm = normalizePlan(raw, { anchor: today, name: raw?.name, source, days: raw?.days?.length || 7 });
    setPreview(norm);
    setName(norm.name);
    setDay(0);
    setEditing(null);
    setStep("review");
  };

  const runParse = async ({ text: t, image }) => {
    if (needKey()) return;
    setStep("busy"); setBusyLabel("Reading your plan…"); setError("");
    try {
      const raw = await parseMealPlan({ apiKey, model: model || DEFAULT_MODEL, text: t, image });
      toReview(raw, "import");
    } catch (err) { setError(explainError(err)); setStep(image ? "choose" : "text"); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || needKey()) return;
    setStep("busy"); setBusyLabel("Reading your plan…"); setError("");
    try {
      const image = file.type === "application/pdf" ? await fileToBase64(file) : await compressImage(file, 1600);
      const raw = await parseMealPlan({ apiKey, model: model || DEFAULT_MODEL, image });
      toReview(raw, "import");
    } catch (err) { setError(explainError(err)); setStep("choose"); }
  };

  const runGenerate = async () => {
    if (needKey()) return;
    setStep("busy"); setBusyLabel("Building your plan…"); setError("");
    try {
      const raw = await generateMealPlan({
        apiKey, model: model || DEFAULT_MODEL,
        kcal: targets?.kcal, protein: targets?.protein, goal: targets?.goal?.label,
        currentWeight: bodyweight, goalWeight: Number(gen.goalWeight) || null,
        likes: gen.likes, onHand: gen.onHand, avoid: gen.avoid, snacks: gen.snacks, effort: gen.effort, days: 7,
      });
      toReview(raw, "generated");
    } catch (err) { setError(explainError(err)); setStep("generate"); }
  };

  // ---- editing the reviewed plan ----
  const patchMeal = (di, id, patch) =>
    setPreview((p) => ({ ...p, days: p.days.map((d, i) => i !== di ? d : { ...d, meals: d.meals.map((m) => m.id === id ? { ...m, ...patch } : m) }) }));
  const editMacro = (di, m, key, val) =>
    patchMeal(di, m.id, { [key]: val, estimated: (m.estimated || []).filter((k) => k !== key) }); // your number isn't an estimate
  const removeMeal = (di, id) =>
    setPreview((p) => ({ ...p, days: p.days.map((d, i) => i !== di ? d : { ...d, meals: d.meals.filter((m) => m.id !== id) }) }));
  const addMeal = (di) => {
    const id = `tmp-${Date.now()}`;
    setPreview((p) => ({ ...p, days: p.days.map((d, i) => i !== di ? d : { ...d, meals: [...d.meals, { id, slot: "snack", name: "", kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0, cholesterol: 0, estimated: [] }] }) }));
    setEditing(id);
  };

  // Commit: re-normalize so any macros typed as text are coerced to numbers and
  // ids are re-stamped stably (added meals get real ids), then save with a clock.
  const commit = () => {
    if (!preview) return;
    const norm = normalizePlan(preview, { anchor: today, name: name.trim() || preview.name, source: preview.source, days: preview.days.length });
    onSave({ ...norm, importedAt: new Date().toISOString() });
  };

  const method = (icon, label, sub, fn) => (
    <button onClick={fn} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", background: "var(--surface-2)", border: "1px solid var(--border-hi)", borderRadius: 14, padding: 13, marginBottom: 9, cursor: "pointer", fontFamily: "inherit", color: "inherit" }}>
      <span style={{ width: 40, height: 40, borderRadius: 11, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--border-hi)", color: ACCENT }}><Icon name={icon} size={19} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{sub}</span>
      </span>
      <Icon name="chevron" size={16} style={{ color: "var(--text-faint)" }} />
    </button>
  );

  const field = (label, node) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: .3, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>{label}</div>
      {node}
    </div>
  );
  const chip = (active, label, onClick) => (
    <button onClick={onClick} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 999, padding: "7px 13px", background: active ? "rgba(129,140,248,.12)" : "var(--surface-2)", border: `1px solid ${active ? "rgba(129,140,248,.45)" : "var(--border-hi)"}`, color: active ? ACCENT : "var(--text-dim)" }}>{label}</button>
  );

  const previewDay = preview?.days?.[day];
  const dt = previewDay ? dayTotals(previewDay) : null;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 460, textAlign: "left", padding: 0, height: "min(88vh, 720px)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="utensils" size={18} style={{ color: ACCENT }} />
          <div style={S.modalTitle}>{step === "review" ? "Review & edit" : step === "generate" ? "Personalize your plan" : "Meal plan"}</div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px 20px" }}>
          {step === "choose" && (
            <div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-mute)", margin: "0 0 16px" }}>
                Bring your own rigid plan, or have one built to your targets. You'll review and edit everything before it saves.
              </p>
              {method("download", "Upload a document", "PDF, image, or a photo of a printout", () => fileRef.current?.click())}
              {method("pencil", "Paste the text", "Copy your plan in from anywhere", () => { setError(""); setStep("text"); })}
              {method("sparkle", "Generate with AI", "Answer a few questions, get a tailored week", () => { setError(""); setStep("generate"); })}
              {error && <div style={{ ...S.err, marginTop: 4 }}>{error}</div>}
            </div>
          )}

          {step === "text" && (
            <div>
              <textarea autoFocus style={{ ...S.textInput, minHeight: 180, resize: "vertical", lineHeight: 1.5 }}
                placeholder={"Paste your full plan — e.g.\n\nDay 1\nBreakfast: 4 egg whites, 1 cup oats, blueberries\nLunch: 6oz chicken, 1 cup rice, broccoli\n…"}
                value={text} onChange={(e) => setText(e.target.value)} />
              <div style={{ ...S.addRow, marginTop: 10 }}>
                <button style={{ ...S.addBtn, ...S.addBtnPrimary, opacity: text.trim() ? 1 : 0.5 }} disabled={!text.trim()} onClick={() => runParse({ text })}>Read plan</button>
                <button style={S.addBtn} onClick={() => { setStep("choose"); setError(""); }}>Back</button>
              </div>
              {error && <div style={{ ...S.err, marginTop: 10 }}>{error}</div>}
            </div>
          )}

          {step === "generate" && (
            <div>
              <div style={{ fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.5, marginBottom: 16, background: "var(--surface-2)", border: "1px solid var(--border-hi)", borderRadius: 11, padding: "10px 12px" }}>
                Built to {targets?.kcal ? <b style={{ color: "var(--text-2)" }}>{Math.round(targets.kcal).toLocaleString()} kcal</b> : "a sensible calorie target"}
                {targets?.protein ? <> · <b style={{ color: "var(--text-2)" }}>{Math.round(targets.protein)} g protein</b></> : ""}
                {targets?.goal?.label ? <> · {targets.goal.label.toLowerCase()}</> : ""}. The more you answer, the better the fit.
              </div>

              {field(bodyweight ? `Goal weight (you're ~${Math.round(bodyweight)} lb now)` : "Goal weight",
                <input type="number" inputMode="numeric" style={S.textInput} placeholder="e.g. 180 — optional" value={gen.goalWeight} onChange={(e) => setGen({ ...gen, goalWeight: e.target.value })} />)}

              {field("Foods you enjoy",
                <textarea style={{ ...S.textInput, minHeight: 62, resize: "vertical", lineHeight: 1.5 }} placeholder="e.g. chicken, steak, rice, eggs, Greek yogurt, berries, peanut butter" value={gen.likes} onChange={(e) => setGen({ ...gen, likes: e.target.value })} />)}

              {field("What's in your fridge / on hand",
                <textarea style={{ ...S.textInput, minHeight: 62, resize: "vertical", lineHeight: 1.5 }} placeholder="What you already have — the plan will build around it. e.g. ground beef, oats, sweet potatoes, spinach" value={gen.onHand} onChange={(e) => setGen({ ...gen, onHand: e.target.value })} />)}

              {field("Anything to avoid",
                <textarea style={{ ...S.textInput, minHeight: 52, resize: "vertical", lineHeight: 1.5 }} placeholder="Allergies, dislikes, or a diet style — e.g. no shellfish, vegetarian, lactose-free" value={gen.avoid} onChange={(e) => setGen({ ...gen, avoid: e.target.value })} />)}

              {field("Meals", <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip(gen.snacks, "3 meals + snacks", () => setGen({ ...gen, snacks: true }))}
                {chip(!gen.snacks, "Just 3 meals", () => setGen({ ...gen, snacks: false }))}
              </div>)}

              {field("Cooking", <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip(gen.effort === "quick", "Quick & simple", () => setGen({ ...gen, effort: "quick" }))}
                {chip(gen.effort === "cook", "Happy to cook", () => setGen({ ...gen, effort: "cook" }))}
              </div>)}

              <div style={{ ...S.addRow, marginTop: 6 }}>
                <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={runGenerate}>Generate a 7-day plan</button>
                <button style={S.addBtn} onClick={() => { setStep("choose"); setError(""); }}>Back</button>
              </div>
              {error && <div style={{ ...S.err, marginTop: 10 }}>{error}</div>}
            </div>
          )}

          {step === "busy" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "28px 6px", color: "var(--text-mute)", fontSize: 14 }}>
              <span style={S.spinner} /> {busyLabel}
            </div>
          )}

          {step === "review" && preview && (
            <div>
              <input style={{ ...S.textInput, marginBottom: 12, fontWeight: 700 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name" />

              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
                {preview.days.map((d, i) => (
                  <button key={i} onClick={() => { setDay(i); setEditing(null); }}
                    style={{ flex: "0 0 auto", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", minWidth: 46, borderRadius: 10, padding: "8px 10px", background: i === day ? "rgba(129,140,248,.12)" : "var(--surface-2)", border: `1px solid ${i === day ? "rgba(129,140,248,.4)" : "var(--border-hi)"}`, color: i === day ? ACCENT : "var(--text-dim)" }}>
                    Day {i + 1}
                  </button>
                ))}
              </div>

              {previewDay?.meals?.length ? previewDay.meals.map((m) => {
                const open = editing === m.id;
                return (
                  <div key={m.id} style={{ background: "var(--surface-2)", border: `1px solid ${open ? "rgba(129,140,248,.45)" : "var(--border)"}`, borderRadius: 12, padding: open ? 12 : "10px 12px", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: "uppercase", color: "var(--text-faint)", width: 38, flex: "0 0 auto" }}>{(SLOT_LABEL[m.slot] || m.slot).slice(0, 6)}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--text-2)" }}>
                        {m.name || <span style={{ color: "var(--text-faint)" }}>New meal</span>}
                        {m.estimated?.length ? <span style={{ color: "#c98f6a", fontSize: 11 }}> · {m.estimated.length} est.</span> : null}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>{Math.round(Number(m.kcal) || 0).toLocaleString()}</span>
                      <button onClick={() => setEditing(open ? null : m.id)} style={{ flex: "0 0 auto", width: 30, height: 30, borderRadius: 8, background: "transparent", border: "1px solid var(--border-hi)", cursor: "pointer", display: "grid", placeItems: "center", color: open ? ACCENT : "var(--text-dim)" }} aria-label={open ? "Close editor" : `Edit ${m.name}`}>
                        <Icon name={open ? "check" : "pencil"} size={14} />
                      </button>
                    </div>

                    {open && (
                      <div style={{ marginTop: 12 }}>
                        <input style={{ ...S.textInput, marginBottom: 10 }} placeholder="Meal name" value={m.name} onChange={(e) => patchMeal(day, m.id, { name: e.target.value })} />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {SLOTS.map((s) => chip(m.slot === s.id, SLOT_LABEL[s.id], () => patchMeal(day, m.id, { slot: s.id })))}
                        </div>
                        <div style={S.macroGrid}>
                          {MACRO_FIELDS.map(([label, key]) => (
                            <div key={key} style={S.macroCell}>
                              <span style={S.macroCellLabel}>{label}</span>
                              <input type="number" inputMode="numeric" style={S.macroCellInput} value={m[key]} onChange={(e) => editMacro(day, m, key, e.target.value)} />
                            </div>
                          ))}
                        </div>
                        <button onClick={() => removeMeal(day, m.id)} style={{ marginTop: 10, background: "transparent", border: "1px solid var(--border-hi)", color: "#c98f6a", borderRadius: 9, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icon name="close" size={13} /> Remove meal
                        </button>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", padding: "8px 2px" }}>No meals on this day yet.</div>
              )}

              <button onClick={() => addMeal(day)} style={{ ...S.addBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
                <Icon name="plus" size={14} /> Add a meal to Day {day + 1}
              </button>

              {dt && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  {[["kcal", "kcal"], ["protein", "g protein"], ["carbs", "g carbs"], ["fat", "g fat"], ["sugar", "g sugar"], ["fiber", "g fiber"]].map(([k, unit]) => (
                    <span key={k} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mute)", background: "var(--surface-2)", border: "1px solid var(--border-hi)", borderRadius: 99, padding: "5px 10px" }}>
                      <b style={{ color: "var(--text-2)" }}>{Math.round(dt[k]).toLocaleString()}</b> {unit}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ ...S.addRow, marginTop: 16 }}>
                <button style={{ ...S.addBtn, ...S.addBtnPrimary }} onClick={commit}>Save {preview.days.length}-day plan</button>
                <button style={S.addBtn} onClick={() => { setStep("choose"); setPreview(null); setError(""); }}>Back</button>
              </div>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} style={{ display: "none" }} />
      </div>
    </div>
  );
}

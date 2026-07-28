// ============================================================
//  IRONCLAD — the active plan day
// ============================================================
//  Shown when a meal plan is active and the day is in "Plan" view. The day's
//  prescribed meals are checkable; checking one LOGS it into the normal meals
//  store (source "plan") so it feeds every existing number, and the eight
//  food-stat bars fill toward the day's prescribed totals as you go. Water is
//  the same manual widget as everywhere else — the plan never fills it.
//
//  Checked state is derived from the log, not stored here: a meal reads as
//  eaten because a logged meal carries its planMealId. Delete that meal from the
//  normal log and it un-checks itself — the two can't drift apart.
// ============================================================

import React, { useState } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import { mealTotals } from "../lib/nutrition.js";
import { groupBySlot, loggedPlanIds, planDayMeals, planDayTotals, planDayLabel, SLOT_LABEL } from "../lib/mealplan.js";

const WATER_COLOR = "#56b6d9";
const GOOD = "#7a9a7a";

// The eight stats and how each reads. Order matches the mockup.
const STATS = [
  { key: "kcal", label: "Calories", color: ACCENT, unit: "" },
  { key: "protein", label: "Protein", color: "#e0b44a", unit: "g" },
  { key: "carbs", label: "Carbs", color: "#7ab08a", unit: "g" },
  { key: "fat", label: "Fat", color: "#c98f6a", unit: "g" },
  { key: "sugar", label: "Sugar", color: "#d98fb0", unit: "g" },
  { key: "sodium", label: "Sodium", color: "#8f9bb3", unit: "mg" },
  { key: "fiber", label: "Fiber", color: "#9aa86a", unit: "g" },
  { key: "cholesterol", label: "Cholesterol", color: "#b58fae", unit: "mg" },
];

function StatBar({ label, value, target, color, unit }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div style={S.macroRow}>
      <div style={S.macroTop}>
        <span style={S.macroName}>{label}</span>
        <span style={S.macroVal}>
          {Math.round(value).toLocaleString()}
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> / {Math.round(target).toLocaleString()}{unit ? ` ${unit}` : ""}</span>
        </span>
      </div>
      <div style={S.macroBar}>
        <div style={{ ...S.macroFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MealPlanCard({
  plan, dayMeals = [], selected, isToday = true,
  water = 0, waterTarget = 80, onAddWater,
  onToggleMeal, onLogOffPlan, onRemoveOffPlan, onOpenLog, onManage, onOpenInsights,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const target = planDayTotals(plan, selected);
  const planMeals = planDayMeals(plan, selected);
  const checkedIds = loggedPlanIds(dayMeals);
  // The bars fill from the plan meals you've actually checked off.
  const eatenPlan = dayMeals.filter((m) => m.planMealId && planMeals.some((p) => p.id === m.planMealId));
  const eaten = mealTotals(eatenPlan);
  const offPlan = dayMeals.filter((m) => !m.planMealId);

  const eatenCount = checkedIds.size;
  const frac = target.kcal ? Math.min(1, eaten.kcal / target.kcal) : 0;
  const CIRC = 138.2;

  const groups = groupBySlot(planMeals);

  return (
    <div style={S.fuelCard}>
      <div style={S.fuelHead}>
        <span style={S.fuelTitle}>Meal Plan</span>
        <button
          style={{ ...S.statsBtn, marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}
          onClick={onOpenInsights}
        >
          <Icon name="chart" size={13} /> Insights
        </button>
        <button
          style={{ ...S.statsBtn, padding: "5px 9px", fontSize: 12 }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Manage plan"
          title="Manage plan"
        >
          <Icon name="settings" size={15} />
        </button>
      </div>

      {menuOpen && (
        <div style={{ ...S.fuelSection, padding: 8 }}>
          {[
            ["log", "clipboard", "Switch to normal log"],
            ["replace", "refresh", "Replace this plan"],
            ["remove", "close", "Turn off the plan"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => { setMenuOpen(false); id === "log" ? onOpenLog?.() : onManage?.(id); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "transparent", border: "none", borderRadius: 10, padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: id === "remove" ? "#c98f6a" : "var(--text-2)" }}
            >
              <Icon name={icon} size={15} /> <span style={{ fontSize: 14 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ ...S.fuelSection }}>
        <div style={{ ...S.fuelSectionHead, marginBottom: 12 }}>
          {plan.name || "Meal plan"}
          <span style={{ ...S.fuelSectionCount, color: ACCENT }}>{planDayLabel(plan, selected)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STATS.map((s) => (
            <StatBar key={s.key} label={s.label} value={eaten[s.key]} target={target[s.key]} color={s.color} unit={s.unit} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--border)" }}>
          <div style={{ position: "relative", width: 50, height: 50, flex: "0 0 auto" }}>
            <svg width="50" height="50" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="26" cy="26" r="22" fill="none" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} style={{ transition: "stroke-dashoffset .5s ease" }} />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800 }}>{Math.round(frac * 100)}%</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-mute)" }}>
            <b style={{ color: "var(--text-2)" }}>{eatenCount} of {planMeals.length} meals</b> eaten — each check logs to your day, so it still feeds your measured TDEE. Water is tracked below.
          </div>
        </div>
      </div>

      {/* the day's prescribed meals, grouped by slot, each checkable */}
      {groups.map((g) => (
        <div key={g.id} style={{ ...S.fuelSection }}>
          <div style={S.fuelSectionHead}>
            {g.label}
            {g.optional && <span style={{ fontSize: 10.5, color: "var(--text-faint)", border: "1px solid var(--border-hi)", borderRadius: 99, padding: "1px 7px", fontWeight: 600, marginLeft: 6 }}>optional</span>}
            <span style={S.fuelSectionCount}>{Math.round(mealTotals(g.meals).kcal).toLocaleString()} kcal</span>
          </div>
          {g.meals.map((m) => {
            const done = checkedIds.has(m.id);
            const rowStyle = done
              ? { ...S.mealRow, background: "rgba(129,140,248,.10)", border: "1px solid rgba(129,140,248,.4)" }
              : S.mealRow;
            return (
              <div key={m.id} style={rowStyle}>
                <button
                  onClick={() => onToggleMeal?.(m, !done)}
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, background: "transparent", border: "none", padding: "2px 0", margin: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit" }}
                  aria-label={done ? `Uncheck ${m.name}` : `Check off ${m.name}`}
                >
                  <span style={{ width: 24, height: 24, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: done ? ACCENT : "transparent", border: `2px solid ${done ? ACCENT : "var(--border-hi)"}`, color: "#0B1020" }}>
                    {done && <Icon name="check" size={14} strokeWidth={2.8} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.mealName}>{m.name}</div>
                    <div style={S.mealMacros}>
                      {Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f
                      {m.sugar > 0 ? ` · ${Math.round(m.sugar)} sugar` : ""}
                      {m.sodium > 0 ? ` · ${Math.round(m.sodium).toLocaleString()} mg` : ""}
                      {m.estimated?.length ? <span style={{ color: "#c98f6a" }}> · {m.estimated.length} est.</span> : null}
                    </div>
                  </div>
                  <div style={S.mealKcal}>{Math.round(m.kcal).toLocaleString()}</div>
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* off-plan meals logged today, and the way to add one */}
      <div style={{ ...S.fuelSection }}>
        <div style={S.fuelSectionHead}>
          Off-plan
          {offPlan.length > 0 && <span style={S.fuelSectionCount}>{offPlan.length}</span>}
        </div>
        {offPlan.map((m) => (
          <div key={m.id} style={S.mealRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.mealName}>{m.name}</div>
              <div style={S.mealMacros}>{Math.round(m.protein)}p · {Math.round(m.carbs)}c · {Math.round(m.fat)}f{m.time ? ` · ${m.time}` : ""}</div>
            </div>
            <div style={S.mealKcal}>{Math.round(m.kcal).toLocaleString()}</div>
            <button style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: 9, background: "transparent", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-dim)" }} onClick={() => onRemoveOffPlan?.(m.id)} aria-label={`Remove ${m.name}`}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
        <button
          style={{ ...S.addBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: offPlan.length ? 6 : 0 }}
          onClick={onLogOffPlan}
        >
          <Icon name="plus" size={14} /> Log something off-plan
        </button>
      </div>

      {/* water — the same manual widget as normal mode; the plan never fills it */}
      {onAddWater && (
        <div style={{ ...S.fuelSection }}>
          <div style={S.fuelSectionHead}>
            <Icon name="drop" size={13} style={{ color: WATER_COLOR }} /> Water
            <span style={S.fuelSectionCount}>{water}<span style={{ color: "var(--text-faint)", fontWeight: 400 }}> / {waterTarget} oz</span></span>
          </div>
          <div style={S.macroBar}>
            <div style={{ ...S.macroFill, width: `${waterTarget ? Math.min(100, (water / waterTarget) * 100) : 0}%`, background: WATER_COLOR }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
            {[8, 16, 24].map((oz) => (
              <button key={oz} onClick={() => onAddWater(oz)} style={{ background: "rgba(86,182,217,.1)", border: "1px solid rgba(86,182,217,.4)", color: WATER_COLOR, borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+{oz} oz</button>
            ))}
            {water > 0 && (
              <button onClick={() => onAddWater(-8)} style={{ background: "transparent", border: "1px solid var(--border-hi)", color: "var(--text-dim)", borderRadius: 999, padding: "6px 11px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }} aria-label="Remove 8 ounces">−8</button>
            )}
            {water >= waterTarget
              ? <span style={{ marginLeft: "auto", fontSize: 11.5, color: GOOD }}>✓ hydrated</span>
              : <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-dim)" }}>{Math.max(0, Math.round((waterTarget - water) / 8))} cup{Math.round((waterTarget - water) / 8) === 1 ? "" : "s"} to go</span>}
          </div>
        </div>
      )}
    </div>
  );
}

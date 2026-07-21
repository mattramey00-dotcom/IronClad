// ============================================================
//  IRONCLAD — metabolic insights
// ============================================================
//  Every number on this screen is measured from the user's own logs by
//  lib/nutrition.js. The one thing the model does here is read those numbers
//  back and say what they mean — and it only gets to do that after the data is
//  thick enough to support a conclusion.
//
//  When it isn't, this screen says so. That is the whole design: an app that
//  will tell you "I don't know yet" is one you can believe when it says it does.
// ============================================================

import React, { useState, useMemo } from "react";
import {
  ComposedChart, Line, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import Hint from "./Hint.jsx";
import {
  buildInsights, weeklySeries, bodyweightSeries, projectGoal, tdeeAdaptation, formulaTDEE, shiftKey,
  bmi, bmiBand, loggingStreak, mealTotals, liftE1rmSeries, trackedLifts, activityGrid,
  SODIUM_DV_MG, GOALS, MIN_DAYS, MIN_INTAKE_DAYS, MIN_WEIGH_INS,
} from "../lib/nutrition.js";

const TONE = { good: S.insightGood, warn: S.insightWarn, info: {} };

export default function InsightsView({
  meals, weights, logs, targets, today, who, apiKey, model, theme, onSetTargets, onOpenPhotos, onOpenWeekly, onWeigh,
  water = {}, waterTarget = 0,
}) {
  // Chart colours can't use CSS variables (Recharts writes them as SVG
  // attributes, where var() doesn't resolve), so derive concrete values here.
  const CH = theme === "light"
    ? { grid: "#e4e6ee", axis: "#8b8e9c", dot: "#9aa0b4", ref: "#d2d5e0" }
    : { grid: "#1c1d28", axis: "#6a6a80", dot: "#9a9ab0", ref: "#2c2e3d" };
  const [pendingGoal, setPendingGoal] = useState(null); // goal awaiting confirmation
  const [weighing, setWeighing] = useState(""); // the in-progress weigh-in entry
  const [wDate, setWDate] = useState(today);    // which day the weigh-in is for

  // The daily weigh-in lives here now — it's the other half of the TDEE math, so
  // it belongs next to the bodyweight trend and TDEE it feeds, not in Fuel. It
  // defaults to today but can step back a day at a time to backfill a missed
  // morning, so you're never locked out of fixing the record.
  const dayWeight = weights?.[wDate];
  const onWDateToday = wDate === today;
  const stepWDate = (delta) => {
    const next = shiftKey(wDate, delta);
    if (next > today) return; // a weigh-in can't be in the future
    setWDate(next);
    setWeighing("");
  };
  const submitWeight = () => {
    const lb = parseFloat(weighing);
    if (Number.isFinite(lb) && lb > 0 && lb < 1000) {
      onWeigh?.(wDate, lb);
      setWeighing("");
    }
  };

  const ins = useMemo(
    () => buildInsights({ meals, weights, logs, targets, endKey: today }),
    [meals, weights, logs, targets, today],
  );
  const series = useMemo(
    () => weeklySeries({ meals, weights, logs, endKey: today }),
    [meals, weights, logs, today],
  );

  const { tdee, strength, resolved, bodyweight } = ins;
  const hasChart = series.some((p) => p.weight !== null) || series.some((p) => p.strength !== null);

  const streak = useMemo(() => loggingStreak(meals, weights, today), [meals, weights, today]);
  const lifts = useMemo(() => trackedLifts(logs, today), [logs, today]);
  const [liftPick, setLiftPick] = useState("");
  // "About me" holds the personal facts, headline stats and BMI — collapsed by
  // default behind a clear Show button so the screen opens uncluttered.
  const [showAbout, setShowAbout] = useState(false);
  const activeLift = lifts.some((l) => l.name === liftPick) ? liftPick : (lifts[0]?.name || "");
  const liftSeries = useMemo(
    () => (activeLift ? liftE1rmSeries(logs, activeLift, today) : []),
    [logs, activeLift, today],
  );
  const grid = useMemo(() => activityGrid(meals, weights, logs, today), [meals, weights, logs, today]);
  const trend14 = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) days.push(shiftKey(today, -i));
    return {
      water: days.map((k) => ({ k, v: Number(water?.[k]) || 0 })),
      sodium: days.map((k) => ({ k, v: mealTotals(meals?.[k]).sodium })),
    };
  }, [water, meals, today]);
  const bw = useMemo(() => bodyweightSeries(weights, today), [weights, today]);
  const adapt = useMemo(
    () => tdeeAdaptation(meals, weights, today, resolved.goal.id),
    [meals, weights, today, resolved.goal.id],
  );
  const formula = useMemo(
    () => formulaTDEE({ sex: targets?.sex, heightIn: targets?.heightIn, age: targets?.age, weightLb: bodyweight }),
    [targets?.sex, targets?.heightIn, targets?.age, bodyweight],
  );
  const goalProj = useMemo(
    () => projectGoal({ smoothed: bw.smoothed, goalWeight: targets?.goalWeight, slopePerWeek: bw.slopePerWeek }),
    [bw.smoothed, bw.slopePerWeek, targets?.goalWeight],
  );
  // Widen the weight axis to include the goal, so its marker is actually on the
  // chart instead of scrolled off below the weigh-ins.
  const wDomain = useMemo(() => {
    const vals = bw.series.flatMap((p) => [p.raw, p.trend]).filter((v) => v != null);
    if (!vals.length) return ["dataMin - 1", "dataMax + 1"];
    const g = Number(targets?.goalWeight);
    const lo = Math.min(...vals, g > 0 ? g : Infinity);
    const hi = Math.max(...vals, g > 0 ? g : -Infinity);
    return [Math.floor(lo - 1), Math.ceil(hi + 1)];
  }, [bw.series, targets?.goalWeight]);

  const setT = (patch) => onSetTargets({ ...(targets || {}), ...patch });
  const fmtDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // A tiny 14-day bar strip — a lightweight trend for water & sodium that needs
  // no chart library and no second axis. Each bar is a day, scaled to its target;
  // days with nothing logged are gaps. Bars that top out are at/over the target.
  const MiniBars = ({ series, target, color, unit }) => {
    const logged = series.filter((d) => d.v > 0);
    if (!logged.length) return null;
    const avg = Math.round(logged.reduce((a, d) => a + d.v, 0) / logged.length);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40, borderTop: "1px dashed var(--border-hi)", paddingTop: 1 }}>
          {series.map((d, i) => {
            const pct = target ? Math.min(100, (d.v / target) * 100) : 0;
            const over = target && d.v > target;
            return (
              <div
                key={i}
                title={`${fmtDate(d.k)}: ${d.v ? `${Math.round(d.v).toLocaleString()} ${unit}` : "—"}`}
                style={{ flex: 1, minWidth: 0, alignSelf: "flex-end", borderRadius: 2, height: `${d.v > 0 ? Math.max(6, pct) : 0}%`, background: over ? "#e08a6a" : color }}
              />
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 6, display: "flex" }}>
          <span>avg <b style={{ color: "var(--text-2)" }}>{avg.toLocaleString()} {unit}</b> · {logged.length}/14 days</span>
          <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>target {Math.round(target).toLocaleString()} {unit}</span>
        </div>
      </div>
    );
  };

  const curFt = targets?.heightIn ? Math.floor(targets.heightIn / 12) : "";
  const curIn = targets?.heightIn ? targets.heightIn % 12 : "";
  const setHeight = (ft, inch) => {
    const hi = (Number(ft) || 0) * 12 + (Number(inch) || 0);
    setT({ heightIn: hi > 0 ? hi : null });
  };

  // One axis, not two. Bodyweight (lb) and the strength index live on wildly
  // different scales, so rather than a dual-axis chart — which lets you slide
  // one curve past the other just by choosing where each axis starts — both are
  // indexed to their own first data point (100 = start). Now a single axis reads
  // honestly: the two lines crossing *is* the recomposition, not an artifact of
  // scaling. Bodyweight keeps its real lb value in the tooltip.
  const STRENGTH_COLOR = ACCENT;      // indigo — the metric you want to climb
  const WEIGHT_COLOR = "#E0B44A";     // amber — the app's second data colour; CVD-distinct from indigo
  const wBase = series.find((p) => p.weight != null)?.weight || null;
  const chartData = series.map((p) => ({
    week: p.week,
    strength: p.strength,
    weightLb: p.weight,
    weightIdx: wBase && p.weight != null ? Math.round((p.weight / wBase) * 1000) / 10 : null,
  }));

  // Calorie-balance chart: weekly average intake against the maintenance line
  // (measured TDEE, or the formula estimate before it's ready). The gap between
  // each bar and the line is the deficit/surplus that actually moved the scale.
  const OVER_COLOR = "#e08a6a";
  const tdeeRef = tdee.ready ? tdee.tdee : (formula ? formula.tdee : null);
  const calShow = tdeeRef != null && series.some((p) => p.kcal != null);
  const calDomain = (() => {
    const vals = series.map((p) => p.kcal).filter((v) => v != null);
    if (tdeeRef != null) vals.push(tdeeRef);
    if (!vals.length) return [0, "auto"];
    return [Math.max(0, Math.floor((Math.min(...vals) - 150) / 100) * 100), Math.ceil((Math.max(...vals) + 150) / 100) * 100];
  })();
  const volShow = series.some((p) => p.volume > 0);
  const hasAnyChart =
    trend14.water.some((d) => d.v > 0) || trend14.sodium.some((d) => d.v > 0) ||
    calShow || bw.n >= 2 || hasChart || lifts.length > 0 || volShow ||
    grid.some((wk) => wk.some((d) => d.level > 0));

  const heatColor = (day) => {
    if (day.future) return "transparent";
    if (day.level === 0) return "var(--border)";
    return `rgba(129,140,248,${[0, 0.4, 0.68, 1][day.level]})`;
  };
  // Each chart's title carries a divider + generous top space, so the charts read
  // as separate blocks instead of running into one another.
  const chartLabel = { ...S.label, marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)" };

  return (
    <div style={{ textAlign: "left", animation: "fade .3s ease" }}>
        <div style={{ ...S.screenTitle, marginBottom: 3 }}>
          Insights
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>{who} · measured from your own logs</div>

        {/* streak + a one-tap link to last week's summary, on one row */}
        {(streak.current >= 2 || onOpenWeekly) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
            {streak.current >= 2 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(224,180,74,.1)", border: "1px solid rgba(224,180,74,.3)", color: "#e0b44a", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600 }}>
                <Icon name="flame" size={13} /> {streak.current}-day streak
                {!streak.loggedToday && <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· log today</span>}
              </div>
            )}
            {onOpenWeekly && (
              <button
                onClick={onOpenWeekly}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border-hi)", color: "var(--text-2)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Icon name="clock" size={13} style={{ color: ACCENT }} /> Last week's summary
              </button>
            )}
          </div>
        )}

        <Hint id="insights">
          Every number here is measured from what you log — no calculators. Log your weight below
          each morning and your meals on the Fuel tab, and over a couple of weeks the estimates
          sharpen into your real numbers.
        </Hint>

        {/* daily weigh-in — the second of the two TDEE inputs, kept next to the
            bodyweight trend and TDEE it feeds. Defaults to today; step back to
            backfill a missed morning. */}
        {onWeigh && (
          <div style={{ ...S.insightCard, marginBottom: 10, background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.4)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...S.label, color: ACCENT }}>Weigh-in</div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <button style={{ ...S.weekNav, width: 26, height: 26, fontSize: 15 }} onClick={() => stepWDate(-1)} aria-label="Previous day">‹</button>
                <span style={{ fontSize: 12, color: "var(--text-mute)", minWidth: 52, textAlign: "center" }}>{onWDateToday ? "Today" : fmtDate(wDate)}</span>
                <button style={{ ...S.weekNav, width: 26, height: 26, fontSize: 15, opacity: onWDateToday ? 0.35 : 1 }} onClick={() => stepWDate(1)} disabled={onWDateToday} aria-label="Next day">›</button>
              </div>
            </div>
            <div style={S.weighRow}>
              <span style={{ color: "var(--text-mute)", display: "grid", placeItems: "center" }}><Icon name="scale" size={15} /></span>
              {dayWeight ? (
                <>
                  <span style={{ ...S.statValue, fontSize: 17 }}>{dayWeight} lb</span>
                  <button
                    style={{ ...S.resetBtn, marginLeft: 0 }}
                    onClick={() => { setWeighing(String(dayWeight)); onWeigh(wDate, null); }}
                  >
                    change
                  </button>
                  <span style={S.weighDone}>logged {onWDateToday ? "today" : fmtDate(wDate)}</span>
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
                  <button style={{ ...S.btnGhost, flex: "0 0 auto", padding: "9px 14px" }} onClick={submitWeight}>
                    Log weight
                  </button>
                  <span style={{ ...S.weighDone, marginLeft: "auto" }}>{onWDateToday ? "daily · same time" : "backfilling"}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---- goal — below the weigh-in: the context the targets derive from.
            Changing it recalibrates the plan (confirmed below). */}
        <label style={{ ...S.label, marginTop: 16 }}>Goal</label>
        <div style={S.segRow}>
          {Object.values(GOALS).map((g) => (
            <button
              key={g.id}
              style={{ ...S.seg, ...(resolved.goal.id === g.id ? S.segActive : {}), fontSize: 12, padding: "9px 4px" }}
              onClick={() => { if (g.id !== resolved.goal.id) setPendingGoal(g); }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div style={S.note}>
          {resolved.kcal
            ? `Targets: ${resolved.kcal.toLocaleString()} kcal and ${resolved.protein} g protein a day${
                resolved.derived ? " — derived from your measured TDEE, not a calculator." : "."
              }`
            : "Calorie target appears once there's enough data to measure your TDEE. Protein target needs a weigh-in."}
        </div>

        {/* ---- TDEE ---- */}
        <label style={{ ...S.label, marginTop: 14 }}>Your measured TDEE</label>
        {tdee.ready ? (
          <>
            <div style={S.bigStat}>
              <span style={S.bigNum}>{tdee.tdee.toLocaleString()}</span>
              <span style={S.bigUnit}>kcal/day · likely {tdee.lo.toLocaleString()}–{tdee.hi.toLocaleString()}</span>
            </div>
            <div style={S.note}>
              Not a formula — this is what your body actually did. You averaged{" "}
              {Math.round(tdee.intake.avgKcal).toLocaleString()} kcal a day while your weight moved{" "}
              {tdee.trend.slopePerWeek >= 0 ? "+" : ""}
              {tdee.trend.slopePerWeek.toFixed(2)} lb a week, and the gap between those two things is
              your metabolism. It's only as honest as your logging: under-report by 300 a day and this
              reads 300 low, with total confidence.
            </div>
          </>
        ) : (
          <>
            {formula && (
              <>
                <div style={S.bigStat}>
                  <span style={S.bigNum}>~{formula.tdee.toLocaleString()}</span>
                  <span style={S.bigUnit}>kcal/day · formula estimate</span>
                </div>
                <div style={S.note}>
                  A <b>population guess</b> (Mifflin–St Jeor × activity), not a measurement — a
                  starting point so your targets aren't blank on day one. It's replaced by your
                  <b> measured</b> TDEE, below, as soon as there's enough logged data.
                </div>
              </>
            )}
            <div style={{ ...S.insightCard, ...S.insightWarn }}>
              <div style={S.insightTitle}>{formula ? "Measuring your real TDEE" : "Not enough data yet"}</div>
              <div style={S.insightBody}>
                Still short on: {tdee.reasons.join(", ")}. It takes about {MIN_DAYS} days —{" "}
                {MIN_INTAKE_DAYS} of them with meals logged and {MIN_WEIGH_INS} weigh-ins — before a
                bodyweight trend can be separated from water weight.{" "}
                {formula ? "Until then, the estimate above stands in." : "Anything sooner would be a number made up to fill the space."}
              </div>
            </div>

          </>
        )}

        {/* ---- metabolic adaptation (right under the TDEE it's about) ---- */}
        {adapt.ready && adapt.adapting && (
          <div style={{ ...S.insightCard, ...S.insightWarn, marginTop: 12 }}>
            <div style={S.insightTitle}>Your metabolism is adapting</div>
            <div style={S.insightBody}>
              Your measured TDEE has slid from ~{adapt.prior.toLocaleString()} to ~{adapt.now.toLocaleString()} kcal
              ({adapt.delta} kcal · {adapt.pct}%) over the last few weeks of dieting. That's adaptive
              thermogenesis — your body meeting the lower intake, and the reason a cut stalls even when
              the food hasn't changed. A <b>3–5 day break at maintenance</b> (or a couple of higher-carb
              refeed days) usually restores it and makes the next stretch work again. Cutting harder here
              tends to backfire.
            </div>
          </div>
        )}

        {/* ---- about me (collapsible): the personal facts (sex/height/age) plus
            your headline stats and BMI, folded into one section you can tuck away.
            Sex/height/age feed the formula TDEE and BMI. ---- */}
        <button
          onClick={() => setShowAbout((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "var(--surface-2)", border: "1px solid var(--border-hi)", borderRadius: 12,
            padding: "11px 13px", cursor: "pointer", fontFamily: "inherit", marginTop: 18, marginBottom: showAbout ? 10 : 0,
          }}
          aria-expanded={showAbout}
        >
          <span style={{ ...S.label, margin: 0 }}>About me</span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>stats &amp; details</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: ACCENT, fontWeight: 700 }}>
            {showAbout ? "Hide" : "Show"}
            <Icon name="chevron" size={14} style={{ transform: showAbout ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
          </span>
        </button>
        {showAbout && (
          <>
            <div style={S.segRow}>
              {["male", "female"].map((s) => (
                <button
                  key={s}
                  style={{ ...S.seg, ...(targets?.sex === s ? S.segActive : {}), fontSize: 12 }}
                  onClick={() => setT({ sex: s })}
                >
                  {s === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 60 }} placeholder="ft" value={curFt} onChange={(e) => setHeight(e.target.value, curIn)} />
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>ft</span>
              <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 60 }} placeholder="in" value={curIn} onChange={(e) => setHeight(curFt, e.target.value)} />
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>in</span>
              <input type="number" inputMode="numeric" style={{ ...S.textInput, width: 64, marginLeft: "auto" }} placeholder="age" value={targets?.age || ""} onChange={(e) => setT({ age: Number(e.target.value) || null })} />
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>yrs</span>
            </div>
            <div style={S.note}>Sex, height and age let the app estimate your TDEE before there's enough logged data to measure it — and height drives BMI.</div>

        {/* ---- headline stats ---- */}
        <div style={{ ...S.statGrid, marginTop: 14 }}>
          <div style={S.statBox}>
            <div style={S.statLabel}>Bodyweight</div>
            <div style={S.statValue}>{bodyweight ? `${bodyweight.toFixed(1)} lb` : "—"}</div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {tdee.trend.slopePerWeek !== null
                ? `${tdee.trend.slopePerWeek >= 0 ? "+" : ""}${tdee.trend.slopePerWeek.toFixed(2)} lb/wk`
                : "log a few weigh-ins"}
            </div>
          </div>
          <div style={S.statBox}>
            <div style={S.statLabel}>Strength · 28d</div>
            <div
              style={{
                ...S.statValue,
                color: strength.pct === null ? "var(--text)" : strength.pct > 0 ? ACCENT : "#e08a6a",
              }}
            >
              {strength.pct !== null ? `${strength.pct >= 0 ? "+" : ""}${strength.pct.toFixed(1)}%` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {strength.n ? `est. 1RM across ${strength.n} lift${strength.n === 1 ? "" : "s"}` : "log some sets"}
            </div>
          </div>
          <div style={S.statBox}>
            <div style={S.statLabel}>Protein</div>
            <div style={S.statValue}>
              {tdee.intake.avgProtein ? `${Math.round(tdee.intake.avgProtein)} g` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {ins.proteinPerLb ? `${ins.proteinPerLb.toFixed(2)} g/lb · aim 0.7–1.0` : "daily average"}
            </div>
          </div>
          <div style={S.statBox}>
            <div style={S.statLabel}>Intake</div>
            <div style={S.statValue}>
              {tdee.intake.avgKcal ? Math.round(tdee.intake.avgKcal).toLocaleString() : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
              {tdee.intake.daysLogged}/{tdee.intake.days} days logged
            </div>
          </div>
          {/* only surfaces once meals actually carry sodium figures */}
          {tdee.intake.sodiumDays > 0 && (
            <div style={S.statBox}>
              <div style={S.statLabel}>Sodium</div>
              <div style={S.statValue}>{Math.round(tdee.intake.avgSodium).toLocaleString()} mg</div>
              <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                avg · daily value 2,300 mg
              </div>
            </div>
          )}
        </div>

        {/* BMI — reference only, with the muscle caveat spelled out */}
        {(() => {
          const bmiVal = bmi(bodyweight, targets?.heightIn);
          if (bmiVal == null) return null;
          return (
            <div style={{ ...S.insightCard, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.3 }}>{bmiVal}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-mute)" }}>BMI · {bmiBand(bmiVal)}</span>
              </div>
              <div style={{ ...S.insightBody, marginTop: 5 }}>
                A rough height-to-weight ratio — it can't tell muscle from fat, so it reads high for
                people who lift. Trust your bodyweight trend and the weight-vs-strength chart over this.
              </div>
            </div>
          );
        })()}
          </>
        )}

        {/* progress photos — the check the scale can't give you */}
        {onOpenPhotos && (
          <button
            style={{ ...S.btnGhost, width: "100%", marginTop: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={onOpenPhotos}
          >
            <Icon name="camera" size={15} /> Progress photos
          </button>
        )}

        {/* ---- what it means (coach's read, above the charts) ---- */}
        {ins.notes.length > 0 && (
          <>
            <label style={{ ...S.label, marginTop: 20 }}>What that means</label>
            {ins.notes.map((n, i) => (
              <div key={i} style={{ ...S.insightCard, ...(TONE[n.kind] || {}) }}>
                <div style={S.insightTitle}>{n.title}</div>
                <div style={S.insightBody}>{n.body}</div>
              </div>
            ))}
          </>
        )}

        {/* ================= CHARTS — its own defined section ================= */}
        {hasAnyChart && (
          <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <div style={{ ...S.label, fontSize: 13.5, color: "var(--text-2)", margin: 0, letterSpacing: 1 }}>Charts</div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>Trends measured from your logs.</div>
          </div>
        )}

        {/* hydration & sodium — a light 14-day strip so these two get a trend of
            their own, matching the bodyweight/strength charts below. */}
        {(trend14.water.some((d) => d.v > 0) || trend14.sodium.some((d) => d.v > 0)) && (
          <>
            <label style={chartLabel}>Hydration &amp; sodium · 14 days</label>
            <div style={S.insightCard}>
              {trend14.water.some((d) => d.v > 0) && (
                <div style={{ marginBottom: trend14.sodium.some((d) => d.v > 0) ? 16 : 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="drop" size={12} style={{ color: "#56b6d9" }} /> Water
                  </div>
                  <MiniBars series={trend14.water} target={waterTarget || 80} color="#56b6d9" unit="oz" />
                </div>
              )}
              {trend14.sodium.some((d) => d.v > 0) && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 7 }}>Sodium</div>
                  <MiniBars series={trend14.sodium} target={SODIUM_DV_MG} color="#8f9bb3" unit="mg" />
                </div>
              )}
            </div>
          </>
        )}

        {/* ---- calorie balance: weekly intake vs maintenance ---- */}
        {calShow && (
          <>
            <label style={chartLabel}>Calorie balance · 8 weeks</label>
            <div style={{ height: 175, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -2 }}>
                  <CartesianGrid stroke={CH.grid} vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={calDomain} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "var(--text-mute)" }} itemStyle={{ padding: 0 }} cursor={{ fill: "rgba(129,140,248,.06)" }}
                    formatter={(v) => [`${Math.round(v).toLocaleString()} kcal/day`, v > tdeeRef ? "Surplus" : "Deficit"]}
                  />
                  <ReferenceLine y={tdeeRef} stroke={WEIGHT_COLOR} strokeDasharray="4 4" strokeOpacity={0.8} />
                  <Bar dataKey="kcal" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false}>
                    {series.map((p, i) => <Cell key={i} fill={p.kcal > tdeeRef ? OVER_COLOR : ACCENT} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={S.legendRow}>
              <span><i style={{ ...S.dot, background: ACCENT }} />Under maintenance</span>
              <span><i style={{ ...S.dot, background: OVER_COLOR }} />Over maintenance</span>
              <span><i style={{ ...S.dot, background: WEIGHT_COLOR }} />Your {tdee.ready ? "" : "est. "}TDEE</span>
            </div>
            <div style={S.note}>
              Weekly average intake against maintenance ({Math.round(tdeeRef).toLocaleString()} kcal{tdee.ready ? "" : ", still an estimate"}). The gap is the deficit or surplus that's actually moving your weight.
            </div>
          </>
        )}

        {/* ---- bodyweight trend (raw dots + regression line) ---- */}
        {bw.n >= 2 && (
          <>
            <label style={chartLabel}>Bodyweight trend</label>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.4 }}>
                {bw.smoothed?.toFixed(1)} lb
              </span>
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>
                trend · {bw.slopePerWeek >= 0 ? "+" : ""}{bw.slopePerWeek?.toFixed(2)} lb/wk
              </span>
            </div>
            <div style={{ height: 170, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bw.series} margin={{ top: 6, right: 6, bottom: 0, left: -2 }}>
                  <CartesianGrid stroke={CH.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={26} />
                  <YAxis domain={wDomain} allowDecimals={false} tickFormatter={(v) => Math.round(v)} tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "var(--text-mute)" }}
                    itemStyle={{ padding: 0 }}
                    formatter={(v, n) => [`${v} lb`, n]}
                  />
                  {Number(targets?.goalWeight) > 0 && (
                    <ReferenceLine y={Number(targets.goalWeight)} stroke={ACCENT} strokeDasharray="4 4" strokeOpacity={0.55} />
                  )}
                  <Line name="Trend" type="monotone" dataKey="trend" stroke={WEIGHT_COLOR} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  <Line name="Weigh-in" dataKey="raw" stroke="transparent" connectNulls={false} isAnimationActive={false} dot={{ r: 2.6, fill: CH.dot, strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={S.legendRow}>
              <span><i style={{ ...S.dot, background: "var(--text-mute)" }} />Daily weigh-in</span>
              <span><i style={{ ...S.dot, background: WEIGHT_COLOR }} />Trend line</span>
              {Number(targets?.goalWeight) > 0 && <span><i style={{ ...S.dot, background: ACCENT }} />Goal</span>}
            </div>

            {/* goal weight + projected arrival */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>Goal weight</span>
              <input
                type="number" inputMode="decimal" step="0.1"
                style={{ ...S.weighInput, width: 84 }}
                placeholder="lb"
                value={targets?.goalWeight || ""}
                onChange={(e) => setT({ goalWeight: Number(e.target.value) || null })}
              />
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>lb</span>
            </div>
            <div style={S.note}>
              {!goalProj
                ? "Set a goal weight and this projects when your trend line reaches it."
                : goalProj.reached
                  ? "You're at your goal weight — hold here or set a new one."
                  : goalProj.stalled
                    ? `At the current trend you aren't moving toward ${Number(targets.goalWeight)} lb (${goalProj.remaining > 0 ? "+" : ""}${goalProj.remaining} lb away). If that's still the goal, the intake gap needs to change.`
                    : `${goalProj.remaining > 0 ? "+" : ""}${goalProj.remaining} lb to go. At ${bw.slopePerWeek >= 0 ? "+" : ""}${bw.slopePerWeek} lb/wk you'd reach ${Number(targets.goalWeight)} lb around ${fmtDate(shiftKey(today, goalProj.etaDays))} — likely ${fmtDate(shiftKey(today, goalProj.etaLoDays))} to ${fmtDate(shiftKey(today, goalProj.etaHiDays))}.`}
            </div>
          </>
        )}

        {/* ---- the recomp chart ---- */}
        {hasChart && (
          <>
            <label style={chartLabel}>Weight vs strength</label>
            <div style={{ height: 190, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -2 }}>
                  <CartesianGrid stroke={CH.grid} vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={["dataMin - 2", "dataMax + 2"]}
                    allowDecimals={false}
                    tickFormatter={(v) => Math.round(v)}
                    tick={{ fill: CH.axis, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "var(--text-mute)" }}
                    itemStyle={{ padding: 0 }}
                    formatter={(v, n, item) =>
                      n === "Bodyweight"
                        ? [item?.payload?.weightLb != null ? `${item.payload.weightLb} lb · ${v}` : `${v}`, n]
                        : [`${v} · 100 = start`, n]
                    }
                  />
                  {/* 100 = where both lines started. Above it is progress. */}
                  <ReferenceLine y={100} stroke={CH.ref} strokeDasharray="2 3" />
                  <Line
                    name="Strength" type="monotone" dataKey="strength"
                    stroke={STRENGTH_COLOR} strokeWidth={2} connectNulls
                    dot={{ r: 3, fill: STRENGTH_COLOR, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    name="Bodyweight" type="monotone" dataKey="weightIdx"
                    stroke={WEIGHT_COLOR} strokeWidth={2} strokeDasharray="5 4" connectNulls
                    dot={{ r: 3, fill: WEIGHT_COLOR, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={S.legendRow}>
              <span><i style={{ ...S.dot, background: STRENGTH_COLOR }} />Strength · 100 = start</span>
              <span><i style={{ ...S.dot, background: WEIGHT_COLOR }} />Bodyweight · indexed</span>
            </div>
            <div style={S.note}>
              Both lines start at 100 and move relative to that, so they share one axis honestly:
              strength up while bodyweight drifts down — the two crossing — is a recomposition. Each
              lift is scored against its own starting point, so the rotation putting squats in one week
              and presses in the next doesn't move the line. Bodyweight keeps its real lb in the tooltip.
            </div>
          </>
        )}

        {/* ---- per-lift strength curve ---- */}
        {lifts.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)", marginBottom: 6 }}>
              <label style={{ ...S.label, margin: 0 }}>Lift progression</label>
              <select
                value={activeLift}
                onChange={(e) => setLiftPick(e.target.value)}
                style={{ ...S.select, width: "auto", maxWidth: 200, marginLeft: "auto", padding: "6px 8px", fontSize: 12.5 }}
              >
                {lifts.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            {liftSeries.length >= 2 ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.4 }}>{liftSeries[liftSeries.length - 1].e1rm} lb</span>
                  <span style={{ fontSize: 12, color: "var(--text-mute)" }}>
                    est. 1RM · {(() => { const d = liftSeries[liftSeries.length - 1].e1rm - liftSeries[0].e1rm; return `${d >= 0 ? "+" : ""}${d} lb since ${liftSeries[0].date}`; })()}
                  </span>
                </div>
                <div style={{ height: 165, marginTop: 4 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={liftSeries} margin={{ top: 6, right: 6, bottom: 0, left: -2 }}>
                      <CartesianGrid stroke={CH.grid} vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis domain={["dataMin - 10", "dataMax + 10"]} allowDecimals={false} tickFormatter={(v) => Math.round(v)} tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                      <Tooltip
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                        labelStyle={{ color: "var(--text-mute)" }} itemStyle={{ padding: 0 }}
                        formatter={(v, n, item) => [`${v} lb${item?.payload?.w ? ` · best set ${item.payload.w}×${item.payload.r}` : ""}`, "est. 1RM"]}
                      />
                      <Line name="est. 1RM" type="monotone" dataKey="e1rm" stroke={STRENGTH_COLOR} strokeWidth={2} dot={{ r: 3, fill: STRENGTH_COLOR, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.note}>
                  Estimated 1RM (Epley) from each session's best set. It reads high above ~10 reps, but it's a fair take on whether this lift is trending up.
                </div>
              </>
            ) : (
              <div style={S.note}>Log {activeLift} at least twice to draw its curve.</div>
            )}
          </>
        )}

        {/* ---- weekly training volume ---- */}
        {volShow && (
          <>
            <label style={chartLabel}>Training volume · 8 weeks</label>
            <div style={{ height: 155, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -2 }}>
                  <CartesianGrid stroke={CH.grid} vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} tick={{ fill: CH.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "var(--text-mute)" }} itemStyle={{ padding: 0 }} cursor={{ fill: "rgba(129,140,248,.06)" }}
                    formatter={(v) => [`${Math.round(v).toLocaleString()} lb`, "Volume"]}
                  />
                  <Bar dataKey="volume" radius={[4, 4, 0, 0]} maxBarSize={34} fill={STRENGTH_COLOR} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={S.note}>
              Total weight moved each week — every set's load × reps, added up. Rising volume is the other half of progress besides a climbing 1RM.
            </div>
          </>
        )}

        {/* ---- consistency heatmap ---- */}
        {grid.some((wk) => wk.some((d) => d.level > 0)) && (
          <>
            <label style={chartLabel}>Consistency · {grid.length} weeks</label>
            <div style={S.insightCard}>
              <div style={{ display: "flex", gap: 3 }}>
                {grid.map((wk, wi) => (
                  <div key={wi} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    {wk.map((day, di) => (
                      <div key={di} title={day.future ? "" : `${day.key}: ${day.level}/3 logged`} style={{ width: "100%", aspectRatio: "1", borderRadius: 3, background: heatColor(day) }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--text-faint)" }}>
                <span>Less</span>
                {[0, 1, 2, 3].map((l) => (
                  <span key={l} style={{ width: 11, height: 11, borderRadius: 3, background: l === 0 ? "var(--border)" : `rgba(129,140,248,${[0, 0.4, 0.68, 1][l]})` }} />
                ))}
                <span>More</span>
                <span style={{ marginLeft: "auto" }}>a meal · a weigh-in · a workout</span>
              </div>
            </div>
          </>
        )}

        {/* Changing the goal is a deliberate act — it resets the nutrition plan,
            so confirm it rather than firing on the first tap. */}
        {pendingGoal && (
          <div style={S.modalWrap} onClick={() => setPendingGoal(null)}>
            <div style={{ ...S.modalCard, maxWidth: 380, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.3, marginBottom: 8 }}>
                Change goal to “{pendingGoal.label}”?
              </div>
              <div style={{ ...S.insightBody, marginBottom: 16 }}>
                This <b>resets your nutrition plan</b> — your calorie and protein targets are
                recalculated for {pendingGoal.label.toLowerCase()}. Your logged history, weigh-ins
                and workouts stay exactly as they are.
              </div>
              <button
                style={{ ...S.btnAccent, width: "100%", marginBottom: 8 }}
                onClick={() => { onSetTargets({ ...(targets || {}), goal: pendingGoal.id }); setPendingGoal(null); }}
              >
                Yes, change to {pendingGoal.label}
              </button>
              <button style={{ ...S.btnGhost, width: "100%" }} onClick={() => setPendingGoal(null)}>
                Keep {resolved.goal.label}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

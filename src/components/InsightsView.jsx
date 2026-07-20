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
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import Hint from "./Hint.jsx";
import CoachModal from "./CoachModal.jsx";
import {
  buildInsights, weeklySeries, bodyweightSeries, projectGoal, tdeeAdaptation, formulaTDEE, shiftKey,
  GOALS, MIN_DAYS, MIN_INTAKE_DAYS, MIN_WEIGH_INS,
} from "../lib/nutrition.js";

const TONE = { good: S.insightGood, warn: S.insightWarn, info: {} };

export default function InsightsView({
  meals, weights, logs, targets, today, who, apiKey, model, theme, onSetTargets, onOpenPhotos,
}) {
  // Chart colours can't use CSS variables (Recharts writes them as SVG
  // attributes, where var() doesn't resolve), so derive concrete values here.
  const CH = theme === "light"
    ? { grid: "#e4e6ee", axis: "#8b8e9c", dot: "#9aa0b4", ref: "#d2d5e0" }
    : { grid: "#1c1d28", axis: "#6a6a80", dot: "#9a9ab0", ref: "#2c2e3d" };
  const [showCoach, setShowCoach] = useState(false);
  const [pendingGoal, setPendingGoal] = useState(null); // goal awaiting confirmation

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

  // The coach is handed the *computed* figures, never the raw logs. It has
  // nothing to do but interpret — which is the only part it's better at than
  // the arithmetic already on this screen. This snapshot is the whole of what it
  // sees; the conversation and the timeline tool live in CoachModal / claude.js.
  const snapshot = useMemo(
    () => ({
      goal: resolved.goal.label,
      bodyweight_lb: bodyweight,
      measured_tdee_kcal: tdee.tdee,
      tdee_plausible_range: tdee.ready ? [tdee.lo, tdee.hi] : null,
      avg_daily_intake_kcal: Math.round(tdee.intake.avgKcal) || null,
      avg_daily_protein_g: Math.round(tdee.intake.avgProtein) || null,
      protein_g_per_lb: ins.proteinPerLb ? Number(ins.proteinPerLb.toFixed(2)) : null,
      bodyweight_change_lb_per_week:
        tdee.trend.slopePerWeek !== null ? Number(tdee.trend.slopePerWeek.toFixed(2)) : null,
      est_1rm_change_pct_28d: strength.pct !== null ? Number(strength.pct.toFixed(1)) : null,
      lifts_tracked: strength.n,
      training_volume_lb_28d: strength.volume,
      per_lift_change_pct: strength.moves.slice(0, 6).map((m) => ({
        lift: m.name,
        change_pct: Number(m.pct.toFixed(1)),
        sessions: m.sessions,
      })),
      days_of_meals_logged: tdee.intake.daysLogged,
      days_of_weigh_ins: tdee.trend.n,
      data_is_sufficient_for_tdee: tdee.ready,
      formula_tdee_estimate_kcal: !tdee.ready && formula ? formula.tdee : null,
      tdee_trend: adapt.ready
        ? { recent_kcal: adapt.now, prior_kcal: adapt.prior, change_kcal: adapt.delta, metabolic_adaptation: adapt.adapting }
        : null,
      goal_weight_lb: Number(targets?.goalWeight) || null,
      weeks_to_goal_at_current_rate:
        goalProj && !goalProj.reached && !goalProj.stalled ? goalProj.weeks : null,
    }),
    [resolved.goal.label, bodyweight, tdee, ins.proteinPerLb, strength, formula, adapt, targets?.goalWeight, goalProj],
  );

  // What the timeline tool computes against: current smoothed weight, the best
  // TDEE we have (measured if ready, else the formula estimate), and the trend.
  const planCtx = useMemo(
    () => ({
      currentLb: bw.smoothed ?? bodyweight,
      tdee: tdee.ready ? tdee.tdee : formula ? formula.tdee : null,
      tdeeMeasured: tdee.ready,
      ratePerWeek: bw.slopePerWeek,
      today,
    }),
    [bw.smoothed, bw.slopePerWeek, bodyweight, tdee.ready, tdee.tdee, formula, today],
  );

  return (
    <div style={{ textAlign: "left", animation: "fade .3s ease" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: -0.6, fontSize: 26, marginBottom: 3 }}>
          Insights
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 18 }}>{who} · measured from your own logs</div>

        <Hint id="insights">
          Every number here is measured from what you log — no calculators. Log your weight on the
          Fuel tab and your meals over a couple of weeks, and the estimates sharpen into your real
          numbers.
        </Hint>

        {/* ---- TDEE ---- */}
        <label style={S.label}>Your measured TDEE</label>
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

            {/* About you — the three facts the logs can't supply, for the estimate. */}
            <label style={{ ...S.label, marginTop: 14 }}>About you {formula ? "" : "· unlocks a starting estimate"}</label>
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
          </>
        )}

        {/* ---- metabolic adaptation ---- */}
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

        {/* ---- headline stats ---- */}
        <div style={S.statGrid}>
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
        </div>

        {/* progress photos — the check the scale can't give you */}
        {onOpenPhotos && (
          <button
            style={{ ...S.btnGhost, width: "100%", marginTop: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={onOpenPhotos}
          >
            <Icon name="camera" size={15} /> Progress photos
          </button>
        )}

        {/* ---- bodyweight trend (raw dots + regression line) ---- */}
        {bw.n >= 2 && (
          <>
            <label style={{ ...S.label, marginTop: 20 }}>Bodyweight trend</label>
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
            <label style={{ ...S.label, marginTop: 20 }}>Weight vs strength</label>
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

        {/* ---- what it means ---- */}
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

        {/* ---- goal ---- */}
        {/* Chosen at setup; changing it here recalibrates the calorie/protein
            plan, so it's gated behind a confirmation. */}
        <label style={{ ...S.label, marginTop: 18 }}>Goal</label>
        <div style={S.segRow}>
          {Object.values(GOALS).map((g) => (
            <button
              key={g.id}
              style={{
                ...S.seg,
                ...(resolved.goal.id === g.id ? S.segActive : {}),
                fontSize: 12, padding: "9px 4px",
              }}
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

        {/* ---- the coach ---- */}
        <button
          style={{ ...S.btnAccent, width: "100%", marginTop: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          onClick={() => setShowCoach(true)}
        >
          <Icon name="sparkle" size={15} /> Talk to your coach
        </button>
        <div style={{ ...S.note, textAlign: "center" }}>
          Ask anything — including how long it'd take to lose or gain a given amount. It answers off the
          numbers above.
        </div>

        {showCoach && (
          <CoachModal
            apiKey={apiKey}
            model={model}
            snapshot={snapshot}
            planCtx={planCtx}
            who={who}
            onClose={() => setShowCoach(false)}
          />
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

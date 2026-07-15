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
import {
  buildInsights, weeklySeries, GOALS, MIN_DAYS, MIN_INTAKE_DAYS, MIN_WEIGH_INS,
} from "../lib/nutrition.js";
import { coachNote, explainError, DEFAULT_MODEL } from "../lib/claude.js";

const TONE = { good: S.insightGood, warn: S.insightWarn, info: {} };

export default function InsightsView({
  meals, weights, logs, targets, today, who, apiKey, model, onSetTargets,
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  // The coach is handed the *computed* figures, never the raw logs. It has
  // nothing to do but interpret — which is the only part it's better at than
  // the arithmetic already on this screen.
  const askCoach = async () => {
    if (!apiKey) {
      setError("Add your Anthropic API key in Settings to get a read on this.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const text = await coachNote({
        apiKey,
        model: model || DEFAULT_MODEL,
        snapshot: {
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
        },
      });
      setNote(text);
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ textAlign: "left", animation: "fade .3s ease" }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, marginBottom: 3 }}>
          Insights
        </div>
        <div style={{ fontSize: 12, color: "#667", marginBottom: 18 }}>{who} · measured from your own logs</div>

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
          <div style={{ ...S.insightCard, ...S.insightWarn }}>
            <div style={S.insightTitle}>Not enough data yet</div>
            <div style={S.insightBody}>
              Still short on: {tdee.reasons.join(", ")}. It takes about {MIN_DAYS} days —{" "}
              {MIN_INTAKE_DAYS} of them with meals logged and {MIN_WEIGH_INS} weigh-ins — before a
              bodyweight trend can be separated from water weight. Anything sooner would be a number
              made up to fill the space.
            </div>
          </div>
        )}

        {/* ---- headline stats ---- */}
        <div style={S.statGrid}>
          <div style={S.statBox}>
            <div style={S.statLabel}>Bodyweight</div>
            <div style={S.statValue}>{bodyweight ? `${bodyweight.toFixed(1)} lb` : "—"}</div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
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
                color: strength.pct === null ? "#eaeaea" : strength.pct > 0 ? ACCENT : "#e08a6a",
              }}
            >
              {strength.pct !== null ? `${strength.pct >= 0 ? "+" : ""}${strength.pct.toFixed(1)}%` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
              {strength.n ? `est. 1RM across ${strength.n} lift${strength.n === 1 ? "" : "s"}` : "log some sets"}
            </div>
          </div>
          <div style={S.statBox}>
            <div style={S.statLabel}>Protein</div>
            <div style={S.statValue}>
              {tdee.intake.avgProtein ? `${Math.round(tdee.intake.avgProtein)} g` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
              {ins.proteinPerLb ? `${ins.proteinPerLb.toFixed(2)} g/lb · aim 0.7–1.0` : "daily average"}
            </div>
          </div>
          <div style={S.statBox}>
            <div style={S.statLabel}>Intake</div>
            <div style={S.statValue}>
              {tdee.intake.avgKcal ? Math.round(tdee.intake.avgKcal).toLocaleString() : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
              {tdee.intake.daysLogged}/{tdee.intake.days} days logged
            </div>
          </div>
        </div>

        {/* ---- the recomp chart ---- */}
        {hasChart && (
          <>
            <label style={{ ...S.label, marginTop: 20 }}>Weight vs strength</label>
            <div style={{ height: 190, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 6, right: 4, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="#1a201a" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#667", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="w"
                    domain={["dataMin - 3", "dataMax + 3"]}
                    tick={{ fill: "#667", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="s"
                    orientation="right"
                    domain={["dataMin - 4", "dataMax + 4"]}
                    tick={{ fill: "#667", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0e120e", border: "1px solid #232a23", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#8a9a8a" }}
                    formatter={(v, n) => [n === "Strength" ? `${v} (100 = start)` : `${v} lb`, n]}
                  />
                  {/* 100 = where every lift started. Above the line is progress. */}
                  <ReferenceLine yAxisId="s" y={100} stroke="#2a322a" strokeDasharray="2 3" />
                  <Line
                    yAxisId="w" name="Bodyweight" type="monotone" dataKey="weight"
                    stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} connectNulls
                  />
                  <Line
                    yAxisId="s" name="Strength" type="monotone" dataKey="strength"
                    stroke="#5aa9ff" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#5aa9ff" }} connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={S.legendRow}>
              <span><i style={{ ...S.dot, background: ACCENT }} />Bodyweight (lb)</span>
              <span><i style={{ ...S.dot, background: "#5aa9ff" }} />Strength index (100 = start)</span>
            </div>
            <div style={S.note}>
              Green down and blue up at the same time is a recomposition — losing weight while getting
              stronger. Each lift is scored against its own starting point, so the rotation putting
              squats in one week and presses in the next doesn't move the line.
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
              onClick={() => onSetTargets({ ...(targets || {}), goal: g.id })}
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
          style={{ ...S.btnGhost, width: "100%", marginTop: 18 }}
          onClick={askCoach}
          disabled={busy}
        >
          {busy ? "Reading…" : note ? "Ask again" : "✨ What does this say about my training?"}
        </button>
        {note && <div style={S.coachBox}>{note}</div>}
        {error && <div style={S.err}>{error}</div>}
    </div>
  );
}

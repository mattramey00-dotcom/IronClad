// ============================================================
//  IRONCLAD — weekly summary
// ============================================================
//  A recap of the week that just finished, shown once on the first launch of a
//  new week and re-openable any time from the Insights tab. Every figure is
//  measured from your own logs (lib/nutrition.js → weeklySummary). It closes on
//  a tap and also nudges you to grab a progress photo — the check the scale
//  can't give you.
// ============================================================

import React from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";

const fmt = (k) => {
  try { return new Date(`${k}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return k; }
};

function Row({ label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text-mute)" }}>{label}</span>
      <span style={{ textAlign: "right", marginLeft: 12, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: accent ? ACCENT : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {sub && <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: "var(--text-dim)", marginTop: 1 }}>{sub}</span>}
      </span>
    </div>
  );
}

export default function WeeklySummaryModal({ summary, who, onAddPhoto, onClose }) {
  const s = summary;
  const bw = s.bwChange != null
    ? `${s.bwStart} → ${s.bwEnd} lb (${s.bwChange > 0 ? "+" : ""}${s.bwChange})`
    : null;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 440, textAlign: "left", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header + the week it covers, up top */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={S.modalTitle}>Your week</div>
            <div style={{ fontSize: 12.5, color: ACCENT, fontWeight: 600, marginTop: 2 }}>
              {fmt(s.startKey)} – {fmt(s.endKey)}
            </div>
            {who && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>{who}</div>}
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        {!s.hasActivity ? (
          <div style={{ color: "var(--text-mute)", fontSize: 13.5, lineHeight: 1.6, padding: "18px 2px" }}>
            Nothing was logged last week. Log your workouts, meals and weigh-ins and next week's recap
            will have your numbers in it.
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <Row label="Workouts trained" value={`${s.workouts} day${s.workouts === 1 ? "" : "s"}`} accent />
            {s.prs.length > 0 && (
              <Row label={`New PR${s.prs.length === 1 ? "" : "s"}`} value={s.prs.slice(0, 3).join(", ") + (s.prs.length > 3 ? ` +${s.prs.length - 3}` : "")} accent />
            )}

            {/* Strength trend — is the board going up? Shown when there's prior
                history to compare this week's lifts against. */}
            {s.strengthPct != null && (
              <Row
                label="Strength trend"
                accent={s.strengthPct > 0}
                value={`${s.strengthPct > 0 ? "+" : ""}${s.strengthPct}%`}
                sub="est. 1RM vs before"
              />
            )}

            {/* Volume load — the big number, now readable as a trend (progressive
                overload) and labelled for what it actually is. */}
            {s.volume > 0 && (
              <Row
                label="Volume load"
                value={
                  <>
                    {s.volume.toLocaleString()} lb
                    {s.volumeDeltaPct != null && (
                      <span style={{ marginLeft: 6, fontSize: 12.5, fontWeight: 700, color: s.volumeDeltaPct >= 0 ? ACCENT : "var(--text-mute)" }}>
                        {s.volumeDeltaPct >= 0 ? "+" : ""}{s.volumeDeltaPct}%
                      </span>
                    )}
                  </>
                }
                sub={`${s.sets ? `${s.sets} sets · ` : ""}weight × reps, all sets`}
              />
            )}

            {bw && <Row label="Bodyweight" value={bw} />}
            {s.avgKcal && <Row label="Avg intake" value={`${s.avgKcal.toLocaleString()} kcal`} />}

            {/* Calorie balance — average intake against your target, and the weekly
                move that gap is worth. */}
            {s.kcalBalance != null && (
              <Row
                label="Calorie balance"
                accent={s.kcalBalance === 0}
                value={s.kcalBalance === 0 ? "on target" : `${Math.abs(s.kcalBalance).toLocaleString()} ${s.kcalBalance > 0 ? "over" : "under"}`}
                sub={`${s.kcalTarget.toLocaleString()} kcal target${s.kcalImpliedLb ? ` · ~${Math.abs(s.kcalImpliedLb)} lb/wk` : ""}`}
              />
            )}

            {s.avgProtein != null && s.mealDays > 0 && <Row label="Avg protein" value={`${s.avgProtein} g`} />}

            {/* Protein adherence — the days you actually cleared the goal, the
                habit that drives the results. */}
            {s.proteinDaysHit != null && s.proteinTarget > 0 && (
              <Row
                label="Protein goal"
                accent={s.proteinDaysHit >= 6}
                value={`${s.proteinDaysHit}/7 days`}
                sub={`hit ${Math.round(s.proteinTarget)} g`}
              />
            )}

            <Row label="Logged" value={`${s.mealDays}/7 meal days · ${s.weighIns} weigh-in${s.weighIns === 1 ? "" : "s"}`} />
          </div>
        )}

        {/* progress-photo reminder */}
        <div style={{ ...S.insightCard, marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: ACCENT, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <Icon name="camera" size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Add a progress photo</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.45, marginTop: 1 }}>
              A monthly front/side/back shows recomposition the scale hides.
            </div>
          </div>
          <button style={{ ...S.btnAccent, padding: "8px 12px", fontSize: 12.5, flex: "0 0 auto" }} onClick={onAddPhoto}>
            Add
          </button>
        </div>

        <div style={{ ...S.note, textAlign: "center" }}>
          You can reopen this summary any time from the <b>Insights</b> tab.
        </div>

        <button style={{ ...S.btnAccent, width: "100%", marginTop: 12 }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

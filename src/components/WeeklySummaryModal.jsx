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

function Row({ label, value, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text-mute)" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: accent ? ACCENT : "var(--text)", fontVariantNumeric: "tabular-nums", textAlign: "right", marginLeft: 12 }}>{value}</span>
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
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.4 }}>Your week</div>
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
            {s.volume > 0 && <Row label="Total volume" value={`${s.volume.toLocaleString()} lb`} />}
            {bw && <Row label="Bodyweight" value={bw} />}
            {s.avgKcal && <Row label="Avg intake" value={`${s.avgKcal.toLocaleString()} kcal`} />}
            {s.avgProtein != null && s.mealDays > 0 && <Row label="Avg protein" value={`${s.avgProtein} g`} />}
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

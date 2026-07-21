// ============================================================
//  IRONCLAD — copy / move a day's meals
// ============================================================
//  The escape hatch for the classic mistake: logging a whole day of meals on the
//  wrong date. Pick the day they belong on and either COPY them there (leaving
//  the originals in place) or MOVE them (clearing the wrong day). Moving is the
//  usual fix, so it's the primary action — and afterwards the app jumps you to
//  the corrected day so you can see they landed.
// ============================================================

import React, { useState } from "react";
import { S } from "../styles.js";
import { ACCENT } from "../data/program.js";
import Icon from "./Icon.jsx";
import { mondayOf, addDays, isoWeekday } from "../lib/schedule.js";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayOf = (key) => Number(key.slice(8, 10));
const monOf = (key) => MON[Number(key.slice(5, 7)) - 1];
const niceDate = (key) => `${DOW[isoWeekday(key) - 1]}, ${monOf(key)} ${dayOf(key)}`;

export default function CopyMealsModal({ sourceKey, allMeals, today, onSubmit, onClose }) {
  const [anchor, setAnchor] = useState(sourceKey);
  const [target, setTarget] = useState(null);

  const weekStart = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const count = (allMeals[sourceKey] || []).length;

  const weekLabel =
    monOf(weekStart) === monOf(weekEnd)
      ? `${monOf(weekStart)} ${dayOf(weekStart)}–${dayOf(weekEnd)}`
      : `${monOf(weekStart)} ${dayOf(weekStart)} – ${monOf(weekEnd)} ${dayOf(weekEnd)}`;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 420, padding: 20, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <Icon name="calendar" size={18} style={{ color: "var(--text-mute)" }} />
          <div style={S.modalTitle}>Copy or move meals</div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: "var(--text-mute)", lineHeight: 1.5, marginBottom: 14 }}>
          <b style={{ color: "var(--text-2)" }}>{count} meal{count === 1 ? "" : "s"}</b> logged on {niceDate(sourceKey)}. Pick the day they belong on.
        </div>

        {/* week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button style={S.weekNav} onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">‹</button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: "var(--text-mute)" }}>{weekLabel}</div>
          <button style={S.weekNav} onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">›</button>
        </div>

        {/* day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {days.map((key) => {
            const isSource = key === sourceKey;
            const isTarget = key === target;
            const n = (allMeals[key] || []).length;
            return (
              <button
                key={key}
                disabled={isSource}
                onClick={() => setTarget(key)}
                style={{
                  minWidth: 0, position: "relative", borderRadius: 11, padding: "8px 2px 9px",
                  cursor: isSource ? "default" : "pointer", fontFamily: "inherit", textAlign: "center",
                  background: isTarget ? "rgba(129,140,248,.14)" : "var(--surface-2)",
                  border: `1px solid ${isTarget ? ACCENT : "var(--border-hi)"}`,
                  opacity: isSource ? 0.45 : 1,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--text-dim)" }}>{DOW[isoWeekday(key) - 1]}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: isTarget ? ACCENT : "var(--text)", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{dayOf(key)}</div>
                {isSource ? (
                  <div style={{ fontSize: 8.5, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-faint)", marginTop: 1 }}>from</div>
                ) : n > 0 ? (
                  <div style={{ fontSize: 9, color: "#e0b44a", marginTop: 1 }}>{n} logged</div>
                ) : (
                  <div style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 1 }}>—</div>
                )}
                {key === today && <span style={{ position: "absolute", top: 3, right: 4, width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.5, marginTop: 12 }}>
          A day that already shows meals will have these <b>added</b> to it, not replaced.
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ ...S.btnGhost, flex: "0 0 auto" }} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.btnGhost, flex: 1, opacity: target ? 1 : 0.4, cursor: target ? "pointer" : "default" }}
            disabled={!target}
            onClick={() => target && onSubmit(target, false)}
          >
            Copy
          </button>
          <button
            style={{ ...S.btnAccent, flex: 1, opacity: target ? 1 : 0.4, cursor: target ? "pointer" : "default" }}
            disabled={!target}
            onClick={() => target && onSubmit(target, true)}
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  IRONCLAD — meal history
// ============================================================
//  Everything you've ever logged, newest first, searchable by name. Quick add
//  (the starred chips on Fuel) is for the five meals you eat on repeat; this is
//  the long tail — that thing you had three Tuesdays ago and want back without
//  re-photographing it. One tap re-logs it onto today, timestamped now; the
//  star promotes it to Quick add.
// ============================================================

import React, { useMemo, useState } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtDate = (d) => {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return d; }
};

export default function MealHistoryModal({ allMeals = {}, today, onRelog, onSaveFavorite, onClose }) {
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState(null); // row key that just got re-logged

  // Flatten { date: [meal] } → one list, each meal carrying its date, newest
  // first (and within a day, latest logged first).
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const byDate = Object.entries(allMeals || {})
      .map(([date, list]) => [
        date,
        (list || []).filter((m) => !query || (m.name || "").toLowerCase().includes(query)),
      ])
      .filter(([, list]) => list.length)
      .sort((a, b) => b[0].localeCompare(a[0]));
    return byDate;
  }, [allMeals, q]);

  const total = useMemo(
    () => Object.values(allMeals || {}).reduce((n, l) => n + (l?.length || 0), 0),
    [allMeals],
  );

  const relog = (m, key) => {
    onRelog(m);
    setFlash(key);
    setTimeout(() => setFlash((k) => (k === key ? null : k)), 1300);
  };

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 460, textAlign: "left", padding: 0, height: "min(88vh, 720px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 20px 12px", borderBottom: "1px solid #1c1d28" }}>
          <Icon name="clock" size={18} style={{ color: ACCENT }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>Meal history</div>
            <div style={{ fontSize: 11, color: "#6a6a80" }}>{total} logged · tap + to re-log onto today</div>
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        {/* search */}
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #14151d" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#6a6a80", display: "grid", placeItems: "center" }}>
              <Icon name="search" size={15} />
            </span>
            <input
              autoFocus
              style={{ ...S.textInput, paddingLeft: 34, fontSize: 15 }}
              placeholder="Search your meals…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
          {total === 0 ? (
            <div style={{ color: "#8a8a9e", fontSize: 13.5, lineHeight: 1.6, padding: "26px 8px", textAlign: "center" }}>
              Nothing logged yet. Once you start adding meals on the Fuel tab, they'll all be here to
              scroll back through and re-log.
            </div>
          ) : groups.length === 0 ? (
            <div style={{ color: "#8a8a9e", fontSize: 13.5, padding: "26px 8px", textAlign: "center" }}>
              No meals match “{q}”.
            </div>
          ) : (
            groups.map(([date, list]) => (
              <div key={date} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "#6a6a80", padding: "0 4px 4px" }}>
                  {fmtDate(date)}{date === today ? " · today" : ""}
                </div>
                {list.map((m) => {
                  const key = `${date}:${m.id}`;
                  const added = flash === key;
                  return (
                    <div key={key} style={{ ...S.mealRow, opacity: 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.mealName}>
                          {m.name}
                          {(m.source === "photo" || m.source === "text" || m.source === "web") && (
                            <span style={S.srcTag}>{m.source === "photo" ? "photo" : m.source === "web" ? "web" : "ai"}</span>
                          )}
                        </div>
                        <div style={S.mealMacros}>
                          {Math.round(num(m.protein))}p · {Math.round(num(m.carbs))}c · {Math.round(num(m.fat))}f
                        </div>
                      </div>
                      <div style={S.mealKcal}>{Math.round(num(m.kcal)).toLocaleString()}</div>
                      <button
                        style={{ background: "transparent", border: "none", color: "#6a6a80", cursor: "pointer", padding: "4px 2px", display: "grid", placeItems: "center", fontFamily: "inherit" }}
                        onClick={() => onSaveFavorite?.(m)}
                        title="Save to Quick add"
                        aria-label={`Save ${m.name} to quick add`}
                      >
                        <Icon name="star" size={14} />
                      </button>
                      <button
                        onClick={() => relog(m, key)}
                        title="Re-log onto today"
                        aria-label={`Re-log ${m.name}`}
                        style={{ background: added ? "rgba(129,140,248,.16)" : "transparent", border: "none", color: added ? ACCENT : "#8a8a9e", cursor: "pointer", padding: "5px 7px", display: "grid", placeItems: "center", fontFamily: "inherit", borderRadius: 8 }}
                      >
                        <Icon name={added ? "check" : "plus"} size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #1c1d28" }}>
          <button style={{ ...S.btnGhost, width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

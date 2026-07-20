import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";

// Est. 1RM shares the app's amber second-data colour — clearly distinct from the
// indigo top-set line for colour-blind readers (and dashed as a second cue).
const E1RM_COLOR = "#E0B44A";

// ============================================================
//  History + progression chart modal
// ============================================================
//  Reads only the signed-in profile's logs, so your chart is yours — before
//  profiles existed, both people's sets landed in one bucket and dragged each
//  other's curves around.
export default function HistoryModal({ logs, exercises, who, theme, onClose, onExport }) {
  // Chart colours must be concrete (Recharts renders them as SVG attributes,
  // where CSS var() doesn't resolve).
  const CH = theme === "light"
    ? { grid: "#e4e6ee", axis: "#8b8e9c" }
    : { grid: "#1c1d28", axis: "#6a6a80" };
  const [sel, setSel] = useState(exercises[0] || null);

  // Build chart data: for each session date, plot top set weight & est. 1RM
  const data = (() => {
    if (!sel || !logs[sel]) return [];
    return [...logs[sel]]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const numericSets = entry.sets
          .map((s) => ({ w: parseFloat(s.w), r: parseFloat(s.r) }))
          .filter((s) => !isNaN(s.w) && !isNaN(s.r));
        const topWeight = numericSets.length ? Math.max(...numericSets.map((s) => s.w)) : 0;
        // Epley estimated 1RM from the heaviest set
        const best = numericSets.reduce(
          (acc, s) => {
            const e = s.w * (1 + s.r / 30);
            return e > acc.e ? { e, w: s.w, r: s.r } : acc;
          },
          { e: 0, w: 0, r: 0 }
        );
        return {
          date: entry.date.slice(5),
          top: topWeight,
          e1rm: Math.round(best.e),
        };
      });
  })();

  const hasNumbers = data.some((d) => d.top > 0);

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 460, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: -0.4, fontSize: 20 }}>Progression</div>
            {who && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{who}</div>}
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onExport}>
            <Icon name="download" size={14} /> CSV
          </button>
        </div>

        {exercises.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
            No logged sets yet. Start logging weights and your progression will chart here.
          </div>
        ) : (
          <>
            <select value={sel || ""} onChange={(e) => setSel(e.target.value)} style={S.select}>
              {exercises.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>

            {hasNumbers ? (
              <div style={{ height: 230, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, left: -2, bottom: 0 }}>
                    <CartesianGrid stroke={CH.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={CH.axis} fontSize={11} tickLine={false} axisLine={{ stroke: CH.grid }} />
                    <YAxis stroke={CH.axis} fontSize={11} tickLine={false} axisLine={false} width={40} domain={["dataMin - 15", "dataMax + 15"]} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "var(--text-mute)" }}
                      itemStyle={{ padding: 0 }}
                      formatter={(v, n) => [`${v} lb`, n]}
                    />
                    <Line type="monotone" dataKey="top" name="Top set" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="e1rm" name="Est. 1RM" stroke={E1RM_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: E1RM_COLOR, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                This movement only has timed/bodyweight entries — log some weights to see a curve.
              </div>
            )}

            <div style={S.legendRow}>
              <span><span style={{ ...S.dot, background: ACCENT }} /> Heaviest set</span>
              <span><span style={{ ...S.dot, background: E1RM_COLOR }} /> Est. 1-rep max</span>
            </div>

            <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 12 }}>
              {[...(logs[sel] || [])].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
                <div key={i} style={S.histRow}>
                  <span style={{ color: "var(--text-mute)", fontSize: 12, minWidth: 48 }}>{entry.date.slice(5)}</span>
                  <span style={{ fontSize: 13 }}>
                    {entry.sets.map((s, j) => (
                      <span key={j} style={S.histTag}>{s.w}×{s.r}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <button style={{ ...S.btnAccent, width: "100%", marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

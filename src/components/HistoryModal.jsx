import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";

// ============================================================
//  History + progression chart modal
// ============================================================
//  Reads only the signed-in profile's logs, so your chart is yours — before
//  profiles existed, both people's sets landed in one bucket and dragged each
//  other's curves around.
export default function HistoryModal({ logs, exercises, who, onClose, onExport }) {
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
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>Progression</div>
            {who && <div style={{ fontSize: 11, color: "#6a7a6a", marginTop: 2 }}>{who}</div>}
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onExport}>⬇ CSV</button>
        </div>

        {exercises.length === 0 ? (
          <div style={{ color: "#889", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
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
                  <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#1c241c" vertical={false} />
                    <XAxis dataKey="date" stroke="#667" fontSize={11} tickLine={false} />
                    <YAxis stroke="#667" fontSize={11} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={{ background: "#0e120e", border: "1px solid #2a322a", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Line type="monotone" dataKey="top" name="Top set (lb)" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
                    <Line type="monotone" dataKey="e1rm" name="Est. 1RM" stroke="#7a8aff" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ color: "#889", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                This movement only has timed/bodyweight entries — log some weights to see a curve.
              </div>
            )}

            <div style={S.legendRow}>
              <span><span style={{ ...S.dot, background: ACCENT }} /> Heaviest set</span>
              <span><span style={{ ...S.dot, background: "#7a8aff" }} /> Est. 1-rep max</span>
            </div>

            <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 12 }}>
              {[...(logs[sel] || [])].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
                <div key={i} style={S.histRow}>
                  <span style={{ color: "#7a8a7a", fontSize: 12, minWidth: 48 }}>{entry.date.slice(5)}</span>
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

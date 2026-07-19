import React, { useState } from "react";
import { S } from "../styles.js";
import { prescription } from "../data/program.js";

// ============================================================
//  Set logging panel (per exercise)
// ============================================================
export default function LogPanel({ exName, prescription: presc, today, last, onAdd, onRemove }) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");

  const plan = prescription(presc);         // { sets, restSecs } or null
  const done = today?.sets.length || 0;
  const target = plan?.sets || 0;

  const add = () => {
    if (w === "" && r === "") return;
    // Hand the derived rest up so the sticky timer can start on this set.
    onAdd(exName, w === "" ? "—" : w, r === "" ? "—" : r, plan?.restSecs || null);
    setR("");
    // keep weight prefilled for the next set — common to repeat
  };

  return (
    <div style={S.logPanel}>
      {target > 0 && (
        <div style={S.setTrack}>
          <span style={{ ...S.setTrackLabel, ...(done >= target ? S.setTrackLabelDone : {}) }}>
            {done >= target ? `${done} set${done === 1 ? "" : "s"} done` : `Set ${done + 1} of ${target}`}
          </span>
          <div style={S.setDots}>
            {Array.from({ length: Math.max(target, done) }).map((_, i) => {
              const isDone = i < done;
              const isExtra = isDone && i >= target;
              const isNext = i === done && done < target;
              return (
                <span
                  key={i}
                  style={{
                    ...S.setDot,
                    ...(isDone ? S.setDotDone : {}),
                    ...(isExtra ? S.setDotExtra : {}),
                    ...(isNext ? S.setDotNext : {}),
                  }}
                >
                  {isDone ? "✓" : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {last && (
        <div style={S.lastRow}>
          <span style={{ color: "#6a6a80" }}>Last ({last.date.slice(5)}): </span>
          {last.sets.map((s, i) => (
            <span key={i} style={S.lastTag}>{s.w}×{s.r}</span>
          ))}
        </div>
      )}

      {today && today.sets.length > 0 && (
        <div style={S.todaySets}>
          {today.sets.map((s, i) => (
            <div key={i} style={S.setChip}>
              <span style={{ color: "#888", fontSize: 11 }}>{i + 1}</span>
              <span style={{ fontWeight: 700 }}>{s.w}</span>
              <span style={{ color: "#6a6a80", fontSize: 12 }}>lb ×</span>
              <span style={{ fontWeight: 700 }}>{s.r}</span>
              <button style={S.setX} onClick={() => onRemove(exName, i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={S.logInputs}>
        <div style={S.inputWrap}>
          <input
            type="number" inputMode="decimal" placeholder="0" value={w}
            onChange={(e) => setW(e.target.value)} style={S.numInput}
          />
          <span style={S.inputUnit}>lb</span>
        </div>
        <span style={{ color: "#556", fontSize: 18 }}>×</span>
        <div style={S.inputWrap}>
          <input
            type="number" inputMode="numeric" placeholder="0" value={r}
            onChange={(e) => setR(e.target.value)} style={S.numInput}
          />
          <span style={S.inputUnit}>reps</span>
        </div>
        <button style={S.addSetBtn} onClick={add}>
          + Log set{target || done ? ` ${done + 1}` : ""}
        </button>
      </div>
    </div>
  );
}

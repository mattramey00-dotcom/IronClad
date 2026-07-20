// ============================================================
//  IRONCLAD — saved meals
// ============================================================
//  The meals you starred to Quick add, in one roomy list you can actually read
//  and manage — re-log any onto today, or drop the ones you've stopped eating.
//  The chips on the Fuel screen are the fast path; this is the full drawer.
// ============================================================

import React, { useMemo, useState } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function SavedMealsModal({ favorites = [], onLog, onRemove, onClose }) {
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState(null); // fav id that just got re-logged

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return favorites.filter((f) => !query || (f.name || "").toLowerCase().includes(query));
  }, [favorites, q]);

  const relog = (fav) => {
    onLog(fav);
    setFlash(fav.id);
    setTimeout(() => setFlash((k) => (k === fav.id ? null : k)), 1300);
  };

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 460, textAlign: "left", padding: 0, height: "min(80vh, 640px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 20px 12px", borderBottom: "1px solid #1c1d28" }}>
          <Icon name="star" size={18} style={{ color: ACCENT }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>Saved meals</div>
            <div style={{ fontSize: 11, color: "#6a6a80" }}>{favorites.length} saved · tap + to log onto today</div>
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        {/* search — only worth showing once there are a few */}
        {favorites.length > 6 && (
          <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #14151d" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#6a6a80", display: "grid", placeItems: "center" }}>
                <Icon name="search" size={15} />
              </span>
              <input
                style={{ ...S.textInput, paddingLeft: 34, fontSize: 15 }}
                placeholder="Search saved meals…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
          {favorites.length === 0 ? (
            <div style={{ color: "#8a8a9e", fontSize: 13.5, lineHeight: 1.6, padding: "26px 8px", textAlign: "center" }}>
              No saved meals yet. Tap the <Icon name="star" size={13} style={{ display: "inline", verticalAlign: "-2px", color: "#8a8a9e" }} /> on
              any logged meal to save it here for one-tap re-logging.
            </div>
          ) : list.length === 0 ? (
            <div style={{ color: "#8a8a9e", fontSize: 13.5, padding: "26px 8px", textAlign: "center" }}>
              No saved meals match “{q}”.
            </div>
          ) : (
            list.map((f) => {
              const added = flash === f.id;
              return (
                <div key={f.id} style={S.mealRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.mealName}>{f.name}</div>
                    <div style={S.mealMacros}>
                      {Math.round(num(f.protein))}p · {Math.round(num(f.carbs))}c · {Math.round(num(f.fat))}f
                    </div>
                  </div>
                  <div style={S.mealKcal}>{Math.round(num(f.kcal)).toLocaleString()}</div>
                  <button
                    onClick={() => relog(f)}
                    title="Log onto today"
                    aria-label={`Log ${f.name}`}
                    style={{ background: added ? "rgba(129,140,248,.16)" : "transparent", border: "none", color: added ? ACCENT : "#8a8a9e", cursor: "pointer", padding: "5px 7px", display: "grid", placeItems: "center", fontFamily: "inherit", borderRadius: 8 }}
                  >
                    <Icon name={added ? "check" : "plus"} size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(f.id)}
                    title="Remove from saved"
                    aria-label={`Remove ${f.name} from saved`}
                    style={{ ...S.mealX }}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #1c1d28" }}>
          <button style={{ ...S.btnGhost, width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

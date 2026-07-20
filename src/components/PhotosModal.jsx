// ============================================================
//  IRONCLAD — progress photos
// ============================================================
//  A front / side / back shot, once a month or so. The scale lies week to week
//  — water, sodium, the time of day — but a photo doesn't, and side-by-side is
//  where a recomposition you can't see on the number becomes obvious. Every
//  byte stays on this phone (IndexedDB); nothing is ever uploaded.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import { getPhoto } from "../lib/photos.js";

const ANGLES = [
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

// Object URLs, kept for the life of the page so re-renders don't re-read IDB.
const urlCache = new Map();

function PhotoImg({ id, style, fit = "cover", onClick }) {
  const [src, setSrc] = useState(() => urlCache.get(id) || null);
  useEffect(() => {
    if (urlCache.has(id)) { setSrc(urlCache.get(id)); return undefined; }
    let alive = true;
    getPhoto(id)
      .then((blob) => {
        if (!alive || !blob) return;
        const url = URL.createObjectURL(blob);
        urlCache.set(id, url);
        setSrc(url);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);

  return (
    <div
      onClick={onClick}
      style={{ ...style, background: "var(--sunken)", overflow: "hidden", cursor: onClick ? "pointer" : "default" }}
    >
      {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }} />}
    </div>
  );
}

const fmt = (d) => {
  try { return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
};

export default function PhotosModal({ photos = [], onAdd, onRemove, onClose }) {
  const fileRef = useRef(null);
  const angleRef = useRef("front");
  const [enlarge, setEnlarge] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (angle) => { angleRef.current = angle; setError(""); fileRef.current?.click(); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { await onAdd(angleRef.current, file); }
    catch (err) { setError(err?.message || "Couldn't save that photo."); }
    finally { setBusy(false); }
  };

  const byDate = {};
  photos.forEach((p) => { (byDate[p.date] = byDate[p.date] || []).push(p); });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)); // newest first
  const asc = [...dates].reverse();
  const rep = (d) => byDate[d].find((p) => p.angle === "front") || byDate[d][0];
  const canCompare = dates.length >= 2;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 460, textAlign: "left", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.4 }}>Progress photos</div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...S.note, marginTop: 0 }}>Stored on this phone only — never uploaded. One set a month is plenty.</div>

        {/* capture */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 6 }}>
          {ANGLES.map((a) => (
            <button
              key={a.key}
              style={{ ...S.btnGhost, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 4px", fontSize: 13 }}
              onClick={() => pick(a.key)}
              disabled={busy}
            >
              <Icon name="camera" size={14} /> {a.label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
        {busy && <div style={{ fontSize: 12, color: "#8a9a8a", padding: "6px 0" }}>Saving…</div>}
        {error && <div style={S.err}>{error}</div>}

        {/* then -> now */}
        {canCompare && (
          <>
            <label style={{ ...S.label, marginTop: 16 }}>Then → now</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6, marginBottom: 4 }}>
              {[asc[0], asc[asc.length - 1]].map((d, i) => (
                <div key={i}>
                  <PhotoImg id={rep(d).id} style={{ aspectRatio: "3 / 4", borderRadius: 12 }} onClick={() => setEnlarge(rep(d).id)} />
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 5, textAlign: "center" }}>{fmt(d)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* gallery */}
        {dates.length === 0 ? (
          <div style={{ color: "var(--text-mute)", fontSize: 13.5, lineHeight: 1.6, padding: "22px 0", textAlign: "center" }}>
            No photos yet. Take a front, side and back shot today — same spot, same light — and that's
            your baseline to measure everything against.
          </div>
        ) : (
          <>
            <label style={{ ...S.label, marginTop: 18 }}>All sets</label>
            {dates.map((d) => (
              <div key={d} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 6 }}>{fmt(d)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {ANGLES.map((a) => {
                    const p = byDate[d].find((x) => x.angle === a.key);
                    return p ? (
                      <PhotoImg key={a.key} id={p.id} style={{ flex: 1, aspectRatio: "3 / 4", borderRadius: 10 }} onClick={() => setEnlarge(p.id)} />
                    ) : (
                      <div key={a.key} style={{ flex: 1, aspectRatio: "3 / 4", borderRadius: 10, background: "var(--sunken)", border: "1px dashed var(--border-hi)", display: "grid", placeItems: "center", color: "var(--text-faint)", fontSize: 11 }}>
                        {a.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        <button style={{ ...S.btnAccent, width: "100%", marginTop: 20 }} onClick={onClose}>Done</button>

        {/* enlarge + delete */}
        {enlarge && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 200, display: "grid", placeItems: "center", padding: 20 }}
            onClick={() => setEnlarge(null)}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(92vw, 460px)" }}>
              <PhotoImg id={enlarge} fit="contain" style={{ width: "100%", maxHeight: "72vh", borderRadius: 12 }} />
              <button
                style={{ ...S.btnGhost, width: "100%", marginTop: 12, color: "#e08a6a", border: "1px solid rgba(224,138,106,.5)" }}
                onClick={() => { onRemove(enlarge); setEnlarge(null); }}
              >
                Delete this photo
              </button>
              <button style={{ ...S.btnGhost, width: "100%", marginTop: 8 }} onClick={() => setEnlarge(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

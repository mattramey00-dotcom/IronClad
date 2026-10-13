import React from "react";
import { S } from "../styles.js";

// ============================================================
//  Video demo modal — streams a hand-picked YouTube form tutorial
// ============================================================
export function VideoModal({ video, name, onClose }) {
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 480, padding: 14, textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Demo · {video.by} · via YouTube</div>
          </div>
          <button style={{ ...S.btnGhost, padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`}
            title={`${name} demo`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
          Requires internet · animation stays available offline
        </div>
      </div>
    </div>
  );
}

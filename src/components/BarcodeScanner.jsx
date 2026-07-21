// ============================================================
//  IRONCLAD — barcode scanner
// ============================================================
//  Opens the rear camera and decodes a product barcode with ZXing, which works
//  in iOS Safari where the native BarcodeDetector doesn't. ZXing is a heavy
//  library, so it's loaded on demand (dynamic import) the first time you scan —
//  someone who never scans never downloads it. The camera stream is stopped the
//  moment a code is read or the modal closes.
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let controls;
    let alive = true;
    let handled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!alive) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (result && alive && !handled) {
              handled = true;
              const text = result.getText();
              try { controls?.stop(); } catch { /* already stopped */ }
              onResult(text);
            }
          },
        );
        if (alive) setStarting(false);
      } catch (e) {
        if (!alive) return;
        setStarting(false);
        setError(
          e?.name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera for this site in your browser settings, then try again."
            : "Couldn't start the camera on this device. You can still add the item by hand.",
        );
      }
    })();

    return () => {
      alive = false;
      try { controls?.stop(); } catch { /* already stopped */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 460, padding: 0, textAlign: "left", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 18px 12px" }}>
          <Icon name="barcode" size={18} style={{ color: "var(--text-mute)" }} />
          <div style={S.modalTitle}>Scan a barcode</div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        {error ? (
          <div style={{ padding: "4px 18px 16px" }}>
            <div style={S.err}>{error}</div>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", background: "#000", height: "min(56vh, 380px)" }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* aiming frame */}
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                <div style={{ width: "72%", height: 96, border: "2px solid rgba(255,255,255,.9)", borderRadius: 12, boxShadow: "0 0 0 2000px rgba(0,0,0,.25)" }} />
              </div>
              {starting && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontSize: 13 }}>
                  Starting camera…
                </div>
              )}
            </div>
            <div style={{ padding: "12px 18px 4px", fontSize: 12.5, color: "var(--text-mute)", textAlign: "center", lineHeight: 1.5 }}>
              Hold the product's barcode inside the frame. It logs the moment it reads.
            </div>
          </>
        )}

        <div style={{ padding: 12 }}>
          <button style={{ ...S.btnGhost, width: "100%" }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

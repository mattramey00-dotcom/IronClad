// ============================================================
//  IRONCLAD — the coach, as a conversation
// ============================================================
//  You can ask it anything — "how long to lose 10 lb?", "am I losing muscle?",
//  "what should I change?" — and it answers off your own measured numbers. The
//  arithmetic never happens here or in the model: any timeline question is routed
//  through lib/nutrition.js via a tool (see lib/claude.js), so what the coach
//  tells you always matches what the rest of the Insights screen says.
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { ACCENT } from "../data/program.js";
import { S } from "../styles.js";
import Icon from "./Icon.jsx";
import { coachChat, explainError, DEFAULT_MODEL } from "../lib/claude.js";

// The opening turn is a real user message the model sees, but we don't show it —
// it just asks for a read so the conversation starts with something on the table.
const OPENER = "Give me a short read on where I'm at right now and the one thing to focus on. Keep it to a few sentences.";

const SUGGESTIONS = [
  "How long to lose 10 lb?",
  "What should I change first?",
  "Am I losing muscle on this cut?",
];

export default function CoachModal({ apiKey, model, snapshot, planCtx, who, onClose }) {
  // Each turn: { role: "user" | "assistant", content, hidden? }. Hidden turns are
  // sent to the model but kept out of the transcript (the opener).
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const startedRef = useRef(false);

  const send = async (text, { hidden = false } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError("");
    setInput("");
    const next = [...history, { role: "user", content: trimmed, hidden }];
    setHistory(next);
    setBusy(true);
    try {
      const reply = await coachChat({
        apiKey,
        model: model || DEFAULT_MODEL,
        snapshot,
        planCtx,
        messages: next.map(({ role, content }) => ({ role, content })),
      });
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(false);
    }
  };

  // Kick off the opening read once, on mount, if there's a key to do it with.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (apiKey) send(OPENER, { hidden: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, busy]);

  const shown = history.filter((h) => !h.hidden);

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{
          ...S.modalCard,
          maxWidth: 460,
          textAlign: "left",
          padding: 0,
          height: "min(88vh, 720px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="sparkle" size={18} style={{ color: ACCENT }} />
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>Coach</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{who} · reads your measured data</div>
          </div>
          <button style={{ ...S.btnGhost, marginLeft: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        {/* transcript */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!apiKey && (
            <div style={{ ...S.insightCard, ...S.insightWarn }}>
              <div style={S.insightTitle}>Add your API key first</div>
              <div style={S.insightBody}>
                The coach uses Claude to talk through your numbers. Paste your Anthropic key in Settings
                and it'll be ready — everything it reads is computed on this phone.
              </div>
            </div>
          )}

          {apiKey && shown.length === 0 && !busy && (
            <div style={{ fontSize: 13, color: "var(--text-mute)", lineHeight: 1.6, padding: "8px 2px" }}>
              Reading your numbers…
            </div>
          )}

          {shown.map((m, i) =>
            m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "82%", background: "rgba(129,140,248,.14)", border: "1px solid rgba(129,140,248,.28)", color: "var(--text)", borderRadius: 14, borderBottomRightRadius: 5, padding: "9px 12px", fontSize: 13.5, lineHeight: 1.55 }}>
                {m.content}
              </div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--sunken)", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: 14, borderBottomLeftRadius: 5, padding: "10px 13px", fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
            ),
          )}

          {busy && (
            <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-mute)", fontSize: 12.5, padding: "4px 2px" }}>
              <span style={S.spinner} /> thinking…
            </div>
          )}

          {error && <div style={S.err}>{error}</div>}
        </div>

        {/* suggestion chips — only before the user has typed anything of their own */}
        {apiKey && !busy && shown.filter((m) => m.role === "user").length === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 8px" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{ ...S.btnGhost, padding: "7px 11px", fontSize: 12.5, borderRadius: 999 }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* composer */}
        {apiKey && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "10px 14px 14px", borderTop: "1px solid var(--border)" }}>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="Ask your coach…"
              style={{ ...S.textInput, resize: "none", flex: 1, maxHeight: 96, fontSize: 15 }}
              disabled={busy}
            />
            <button
              style={{ ...S.btnAccent, padding: "11px 16px", opacity: busy || !input.trim() ? 0.5 : 1 }}
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { ACCENT, ACCENT_DIM } from "./data/program.js";

// The design-token sheet. Colors, spacing, radii and type all live here —
// change ACCENT / ACCENT_DIM in data/program.js to recolor the whole app.
export const S = {
  app: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 600px at 80% -10%, #14241a 0%, #0a0d0b 55%, #060807 100%)",
    color: "#eaeaea",
    fontFamily: "'Outfit', sans-serif",
    // viewport-fit=cover draws content under the notch/status bar, so pad by
    // the safe-area insets to keep the header clear of it on mobile.
    paddingTop: "calc(16px + env(safe-area-inset-top))",
    paddingRight: "calc(14px + env(safe-area-inset-right))",
    // clear the fixed tab bar at the bottom
    paddingBottom: "calc(86px + env(safe-area-inset-bottom))",
    paddingLeft: "calc(14px + env(safe-area-inset-left))",
    maxWidth: 520,
    margin: "0 auto",
  },

  // ---- bottom tab bar ----
  //  Train / Fuel / Insights as peers. Fixed to the bottom, matching the app's
  //  centered 520px column, with a blurred translucent ground so content scrolls
  //  under it rather than being boxed off by an opaque slab.
  tabBar: {
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
    margin: "0 auto", maxWidth: 520, width: "100%",
    display: "flex", justifyContent: "space-around",
    background: "rgba(7,10,8,.86)", backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid #1c241c",
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  tabItem: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
    color: "#6a7a6a", padding: "9px 4px 11px", fontSize: 11, fontWeight: 600, letterSpacing: .3,
  },
  tabItemActive: { color: ACCENT },
  tabIcon: { fontSize: 20, lineHeight: 1, filter: "grayscale(1) opacity(.55)" },
  tabIconActive: { filter: "none" },
  fuelDayHead: {
    fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#7a8a7a",
    margin: "2px 2px 12px", display: "flex", alignItems: "center", gap: 8,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brand: { fontFamily: "'Archivo Black', sans-serif", fontSize: 30, letterSpacing: -1, lineHeight: 1 },
  tagline: { fontSize: 11, color: "#777", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },
  countdown: { textAlign: "right", background: "rgba(57,255,106,.06)", border: "1px solid rgba(57,255,106,.2)", borderRadius: 12, padding: "8px 12px" },
  cdLabel: { fontSize: 10, color: "#7aa", letterSpacing: 1, textTransform: "uppercase" },
  cdTime: { fontSize: 20, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  statsBtn: { background: "#121613", border: "1px solid #2a322a", color: "#ccc", borderRadius: 10, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },

  // ---- profile ----
  whoRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  whoChip: {
    display: "flex", alignItems: "center", gap: 7, background: "rgba(57,255,106,.08)",
    border: "1px solid rgba(57,255,106,.28)", color: ACCENT, borderRadius: 99,
    padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  whoChipPartner: {
    display: "flex", alignItems: "center", gap: 7, background: "#121613",
    border: "1px solid #2a322a", color: "#8a9a8a", borderRadius: 99,
    padding: "6px 12px", fontSize: 13, fontFamily: "inherit",
  },

  // ---- week strip ----
  weekRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 14 },
  weekCell: {
    flex: "0 0 auto", width: 62, background: "#121613", border: "1px solid #1f261f",
    borderRadius: 12, padding: "8px 6px", cursor: "pointer", position: "relative",
    fontFamily: "inherit", color: "#bbb", textAlign: "center",
  },
  weekCellActive: { border: `1px solid ${ACCENT}`, background: "rgba(57,255,106,.09)" },
  weekCellYours: { background: "#16211a", border: "1px solid #2c3d31" },
  weekDow: { fontSize: 11, color: "#7a8a7a", letterSpacing: 1, textTransform: "uppercase" },
  weekWorkout: { fontSize: 12, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  weekMeta: { fontSize: 10, color: "#6a7a6a", marginTop: 2, height: 12 },
  todayDot: { width: 5, height: 5, borderRadius: "50%", background: ACCENT, position: "absolute", top: 4, right: 5 },

  // ---- day card ----
  dayCard: { background: "linear-gradient(135deg,#10160f,#0b0f0c)", border: "1px solid #1c241c", borderRadius: 18, padding: 18, marginBottom: 18 },
  dayTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 26, lineHeight: 1.1 },
  daySub: { color: ACCENT, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  warmup: { fontSize: 13, color: "#9aa", marginTop: 10 },
  progBar: { height: 8, background: "#1a1f1a", borderRadius: 99, overflow: "hidden", marginTop: 14 },
  progFill: { height: "100%", background: `linear-gradient(90deg,${ACCENT_DIM},${ACCENT})`, transition: "width .4s ease", borderRadius: 99 },
  progText: { fontSize: 12, color: "#888", marginTop: 8, display: "flex", alignItems: "center", gap: 8 },
  resetBtn: { marginLeft: "auto", background: "none", border: "1px solid #2a322a", color: "#888", borderRadius: 8, fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" },

  // ---- machine + partner ----
  machineChip: {
    display: "inline-flex", alignItems: "center", gap: 5, background: "#0e120e",
    border: "1px solid #2a322a", borderRadius: 99, padding: "4px 10px", fontSize: 12, color: "#9aa", marginTop: 10,
  },
  partnerCard: {
    display: "flex", alignItems: "center", gap: 10, background: "#0c0f0c",
    border: "1px solid #181d18", borderRadius: 14, padding: "11px 13px", marginBottom: 14,
  },
  partnerName: { fontSize: 13, fontWeight: 600, color: "#cfc" },
  partnerWhat: { fontSize: 12, color: "#7a8a7a", marginTop: 1 },

  // ---- blocks ----
  block: { marginBottom: 16 },
  blockName: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#6a7a6a", marginBottom: 8, paddingLeft: 4 },
  blockNameTogether: { color: ACCENT },
  blockNote: { fontSize: 12, color: "#6a7a6a", marginBottom: 8, paddingLeft: 4 },
  exRow: { display: "flex", alignItems: "center", gap: 12, background: "#0e120e", border: "1px solid #181d18", borderRadius: 14, padding: 10, marginBottom: 8, transition: "all .25s ease" },
  exRowDone: { background: "rgba(57,255,106,.05)", border: "1px solid rgba(57,255,106,.25)" },
  exRowTogether: { border: "1px solid rgba(57,255,106,.2)", background: "rgba(57,255,106,.03)" },
  demoWrap: { flex: "0 0 auto", width: 56, height: 56, borderRadius: 12, background: "#0a0d0a", display: "grid", placeItems: "center", border: "1px solid #161b16" },
  exName: { fontSize: 15, fontWeight: 600 },
  exSets: { fontSize: 13, color: "#8a9a8a", marginTop: 2 },
  // ---- target-muscle sub-row ----
  muscleRow: {
    display: "flex", alignItems: "center", gap: 11, marginTop: 8,
    padding: "7px 9px", background: "#0a0d0a", border: "1px solid #161b16", borderRadius: 10,
  },
  muscleText: { minWidth: 0 },
  muscleLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a6a5a", marginBottom: 2 },
  muscleList: { fontSize: 12.5, color: "#b8c8b8", lineHeight: 1.35 },
  musclePrimary: { color: ACCENT, fontWeight: 600 },
  timerBtn: { background: "rgba(57,255,106,.1)", border: "1px solid rgba(57,255,106,.3)", color: ACCENT, borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  demoBtn: { background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,90,90,.3)", color: "#ff7a7a", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  logToggle: { background: "#161b16", border: "1px solid #2a322a", color: "#bbb", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  logToggleOpen: { background: "rgba(57,255,106,.12)", border: "1px solid rgba(57,255,106,.35)", color: ACCENT },
  check: {
    flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%", border: "2px solid #2a322a",
    background: "transparent", color: ACCENT, fontSize: 20, fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center",
  },
  checkDone: { background: ACCENT, border: `2px solid ${ACCENT}`, color: "#06140b" },

  // ---- set tracker (header of the log panel) ----
  setTrack: {
    display: "flex", alignItems: "center", gap: 9, marginBottom: 10,
    paddingBottom: 10, borderBottom: "1px solid #161b16",
  },
  setTrackLabel: { fontSize: 13, fontWeight: 700, color: "#cfe0cf", whiteSpace: "nowrap" },
  setTrackLabelDone: { color: ACCENT },
  setDots: { display: "flex", gap: 5, flexWrap: "wrap" },
  setDot: {
    width: 15, height: 15, borderRadius: "50%", border: "2px solid #2a322a",
    display: "grid", placeItems: "center", fontSize: 9, color: "#06140b", fontWeight: 800,
  },
  setDotDone: { background: ACCENT, border: `2px solid ${ACCENT}` },
  setDotNext: { border: `2px solid ${ACCENT}`, boxShadow: `0 0 0 3px rgba(57,255,106,.12)` },
  setDotExtra: { background: ACCENT_DIM, border: `2px solid ${ACCENT_DIM}` },

  // ---- between-sets rest timer (sticky, above the tab bar) ----
  restBar: {
    position: "fixed", left: 0, right: 0, zIndex: 60,
    bottom: "calc(62px + env(safe-area-inset-bottom))",
    margin: "0 auto", maxWidth: 520, width: "100%",
    background: "rgba(12,17,12,.94)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
    borderTop: "1px solid #223a26", boxShadow: "0 -8px 24px -12px rgba(0,0,0,.6)",
    animation: "fade .25s ease",
  },
  restBarDone: { background: "rgba(15,32,18,.96)", borderTop: `1px solid ${ACCENT}` },
  restProgTrack: { height: 3, background: "#182018", overflow: "hidden" },
  restProgFill: { height: "100%", transition: "width 1s linear" },
  restRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" },
  restKicker: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#7a8a7a" },
  restGo: {
    fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: ACCENT, letterSpacing: 1,
  },
  restTime: { fontSize: 24, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums", lineHeight: 1 },
  restLabel: { fontSize: 12, color: "#8a9a8a", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  restControls: { display: "flex", gap: 6, flex: "0 0 auto" },
  restBtn: {
    background: "#161b16", border: "1px solid #2a322a", color: "#cfe0cf", borderRadius: 8,
    fontSize: 13, fontWeight: 600, padding: "6px 9px", cursor: "pointer", fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
  },
  restSkip: {
    background: "none", border: "1px solid #2a322a", color: "#8a9a8a", borderRadius: 8,
    fontSize: 12, padding: "6px 11px", cursor: "pointer", fontFamily: "inherit",
  },

  // ---- log panel ----
  logPanel: { marginTop: 10, padding: 12, background: "#0a0d0a", border: "1px solid #181d18", borderRadius: 12 },
  lastRow: { fontSize: 12, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" },
  lastTag: { background: "#131813", border: "1px solid #222", borderRadius: 6, padding: "2px 7px", color: "#9aa", fontSize: 12 },
  todaySets: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  setChip: { display: "flex", alignItems: "center", gap: 8, background: "rgba(57,255,106,.06)", border: "1px solid rgba(57,255,106,.18)", borderRadius: 8, padding: "6px 10px" },
  setX: { marginLeft: "auto", background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" },
  logInputs: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center", flex: "1 1 80px", minWidth: 70 },
  numInput: { width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 8, color: "#eee", fontSize: 16, padding: "8px 34px 8px 10px", fontFamily: "inherit", outline: "none" },
  inputUnit: { position: "absolute", right: 9, fontSize: 11, color: "#667" },
  addSetBtn: { flex: "0 0 auto", background: ACCENT, color: "#06140b", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit" },

  // ---- history ----
  select: { width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 10, color: "#eee", fontSize: 15, padding: "10px 12px", fontFamily: "inherit", outline: "none" },
  legendRow: { display: "flex", gap: 16, fontSize: 12, color: "#99a", marginTop: 10 },
  dot: { display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: "middle" },
  histRow: { display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #141914" },
  histTag: { display: "inline-block", background: "#131813", border: "1px solid #222", borderRadius: 6, padding: "2px 7px", marginRight: 5, color: "#9aa", fontSize: 12 },

  footer: { fontSize: 12, color: "#667", lineHeight: 1.6, marginTop: 22, padding: 14, background: "#0c0f0c", borderRadius: 12, border: "1px solid #161b16" },

  // ---- modals ----
  modalWrap: { position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 },
  modalCard: { background: "#0e120e", border: "1px solid #1f261f", borderRadius: 22, padding: 26, textAlign: "center", width: "100%", maxWidth: 320 },
  btnGhost: { background: "#161b16", border: "1px solid #2a322a", color: "#ccc", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 14 },
  btnAccent: { background: ACCENT, border: "none", color: "#06140b", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 14 },

  // ---- setup ----
  setupWrap: { maxWidth: 460, margin: "0 auto", paddingTop: 8 },
  setupTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 6 },
  setupBody: { fontSize: 14, color: "#8a9a8a", lineHeight: 1.6, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#6a7a6a", marginBottom: 6, display: "block" },
  textInput: { width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 10, color: "#eee", fontSize: 16, padding: "11px 12px", fontFamily: "inherit", outline: "none" },
  segRow: { display: "flex", gap: 8 },
  seg: { flex: 1, background: "#121613", border: "1px solid #232a23", color: "#bbb", borderRadius: 10, padding: "11px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  segActive: { background: "rgba(57,255,106,.12)", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 700 },
  codeBox: {
    width: "100%", background: "#0a0d0a", border: "1px dashed #2a4a32", borderRadius: 10,
    color: ACCENT, fontSize: 12, padding: 12, fontFamily: "ui-monospace, monospace",
    wordBreak: "break-all", lineHeight: 1.5, minHeight: 84, resize: "vertical", outline: "none",
  },
  note: { fontSize: 12, color: "#667", lineHeight: 1.6, marginTop: 10 },
  err: { fontSize: 13, color: "#ff7a7a", marginTop: 8 },

  // ---- nutrition ----
  //  Protein gets its own colour (amber) because it's a different *kind* of
  //  number from calories: you're trying to clear a floor, not stay under a
  //  ceiling. Painting both green would say they behave the same way.
  fuelCard: {
    background: "linear-gradient(135deg,#12140f,#0b0f0c)", border: "1px solid #262a1c",
    borderRadius: 18, padding: 16, marginBottom: 16,
  },
  fuelHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  fuelTitle: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#8a8a6a", fontWeight: 600 },
  macroRow: { marginBottom: 10 },
  macroTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginBottom: 5 },
  macroName: { color: "#9aa090", fontWeight: 500 },
  macroVal: { fontVariantNumeric: "tabular-nums", fontWeight: 600 },
  macroBar: { height: 7, background: "#1a1d17", borderRadius: 99, overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: 99, transition: "width .45s ease" },
  macroMini: { display: "flex", gap: 14, fontSize: 12, color: "#7a8a7a", marginTop: 4 },

  weighRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  weighInput: {
    width: 92, background: "#0e120e", border: "1px solid #232a23", borderRadius: 9,
    color: "#eee", fontSize: 16, padding: "8px 10px", fontFamily: "inherit", outline: "none",
  },
  weighDone: { fontSize: 12, color: "#7a8a7a" },

  mealRow: {
    display: "flex", alignItems: "center", gap: 10, background: "#0e120e",
    border: "1px solid #181d18", borderRadius: 12, padding: "9px 11px", marginBottom: 7,
  },
  mealName: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  mealMacros: { fontSize: 12, color: "#7a8a7a", marginTop: 2, fontVariantNumeric: "tabular-nums" },
  mealKcal: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#e8e8d8" },
  mealX: { background: "none", border: "none", color: "#556", fontSize: 19, cursor: "pointer", lineHeight: 1, fontFamily: "inherit", padding: "0 2px" },
  srcTag: {
    fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#667",
    border: "1px solid #232a23", borderRadius: 5, padding: "1px 4px", marginLeft: 6, verticalAlign: "middle",
  },

  addRow: { display: "flex", gap: 7, marginTop: 4 },
  addBtn: {
    flex: 1, background: "#161b16", border: "1px solid #2a322a", color: "#ccc", borderRadius: 10,
    padding: "10px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
  },
  addBtnPrimary: { background: "rgba(57,255,106,.1)", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 600 },

  // ---- the meal draft (the review-before-save step) ----
  draftCard: { background: "#0a0d0a", border: "1px dashed #2a4a32", borderRadius: 12, padding: 13, marginTop: 10 },
  draftItem: { fontSize: 12, color: "#8a9a8a", padding: "3px 0", borderBottom: "1px solid #141914" },
  caveat: {
    fontSize: 12, color: "#c8b06a", background: "rgba(200,176,106,.07)",
    border: "1px solid rgba(200,176,106,.2)", borderRadius: 9, padding: "8px 10px", marginTop: 10, lineHeight: 1.5,
  },
  macroGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginTop: 10 },
  macroCell: { display: "flex", flexDirection: "column", gap: 3 },
  macroCellLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#667" },
  macroCellInput: {
    width: "100%", background: "#0e120e", border: "1px solid #232a23", borderRadius: 8,
    color: "#eee", fontSize: 15, padding: "7px 8px", fontFamily: "inherit", outline: "none",
    fontVariantNumeric: "tabular-nums",
  },
  spinner: {
    width: 15, height: 15, borderRadius: "50%", border: `2px solid rgba(57,255,106,.25)`,
    borderTopColor: ACCENT, display: "inline-block", animation: "spin .7s linear infinite",
  },

  // ---- insights ----
  insightCard: { border: "1px solid #1f261f", borderRadius: 14, padding: 13, marginBottom: 9, background: "#0c0f0c" },
  insightGood: { border: "1px solid rgba(57,255,106,.3)", background: "rgba(57,255,106,.05)" },
  insightWarn: { border: "1px solid rgba(220,150,80,.3)", background: "rgba(220,150,80,.05)" },
  insightTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  insightBody: { fontSize: 13, color: "#8a9a8a", lineHeight: 1.6 },
  bigStat: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 },
  bigNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 1, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  bigUnit: { fontSize: 13, color: "#7a8a7a" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 },
  statBox: { background: "#0c0f0c", border: "1px solid #1a201a", borderRadius: 12, padding: 11 },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#667", marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  coachBox: {
    background: "rgba(57,255,106,.05)", border: "1px solid rgba(57,255,106,.22)",
    borderRadius: 14, padding: 14, marginTop: 14, fontSize: 13, color: "#c8d8c8", lineHeight: 1.65,
  },
};

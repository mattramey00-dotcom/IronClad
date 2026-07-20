import { ACCENT, ACCENT_DIM } from "./data/program.js";

// The design-token sheet. Colors, spacing, radii and type all live here —
// change ACCENT / ACCENT_DIM in data/program.js to recolor the whole app.
//
// Palette: a refined, dark "athletic" system — cool neutral charcoals (no
// warm/green tint) with a single electric-indigo accent. The accent's rgb is
// 129,140,248, so translucent accent washes read `rgba(129,140,248, a)`.
// ON_ACCENT is the near-black text that sits on a filled accent surface.
const ON_ACCENT = "#0B1020";
export const S = {
  app: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 600px at 80% -10%, #1a1c2e 0%, #0c0d13 55%, #08090d 100%)",
    color: "#eaeaf0",
    fontFamily: "'Inter', system-ui, sans-serif",
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
    background: "rgba(10,11,16,.82)", backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid #1c1d28",
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  tabItem: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
    color: "#64647a", padding: "9px 4px 11px", fontSize: 11, fontWeight: 600, letterSpacing: .3,
  },
  tabItemActive: { color: ACCENT },
  tabIcon: { lineHeight: 1, opacity: .6, display: "grid", placeItems: "center" },
  tabIconActive: { opacity: 1 },
  fuelDayHead: {
    fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#7a7a90",
    margin: "2px 2px 12px", display: "flex", alignItems: "center", gap: 8,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brand: { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: -1.5, lineHeight: 1 },
  tagline: { fontSize: 11, color: "#6a6a80", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },
  countdown: { textAlign: "right", background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.22)", borderRadius: 12, padding: "8px 12px" },
  cdLabel: { fontSize: 10, color: "#8a8aa0", letterSpacing: 1, textTransform: "uppercase" },
  cdTime: { fontSize: 20, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  statsBtn: { background: "#16171f", border: "1px solid #2a2c3b", color: "#cbcbd8", borderRadius: 10, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },

  // ---- profile ----
  whoRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  whoChip: {
    display: "flex", alignItems: "center", gap: 7, background: "rgba(129,140,248,.1)",
    border: "1px solid rgba(129,140,248,.3)", color: ACCENT, borderRadius: 99,
    padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  whoChipPartner: {
    display: "flex", alignItems: "center", gap: 7, background: "#16171f",
    border: "1px solid #2a2c3b", color: "#8a8a9e", borderRadius: 99,
    padding: "6px 12px", fontSize: 13, fontFamily: "inherit",
  },

  // ---- week strip ----
  // All seven days share the width evenly (a 7-col grid), so the whole week is
  // visible at once on a phone instead of scrolling sideways.
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 14 },
  weekCell: {
    minWidth: 0, background: "#14151d", border: "1px solid #22232f",
    borderRadius: 11, padding: "7px 2px", cursor: "pointer", position: "relative",
    fontFamily: "inherit", color: "#b0b0c0", textAlign: "center",
  },
  weekCellActive: { border: `1px solid ${ACCENT}`, background: "rgba(129,140,248,.1)" },
  weekCellYours: { background: "#191b28", border: "1px solid #2f3244" },
  weekDow: { fontSize: 10, color: "#7a7a90", letterSpacing: 0.3, textTransform: "uppercase" },
  weekWorkout: { fontSize: 10.5, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  weekMeta: { fontSize: 9, color: "#64647a", marginTop: 2, height: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  todayDot: { width: 5, height: 5, borderRadius: "50%", background: ACCENT, position: "absolute", top: 3, right: 4 },

  // ---- day card ----
  dayCard: { background: "linear-gradient(135deg,#16172040,#0e0f16), #12131b", border: "1px solid #22232f", borderRadius: 18, padding: 18, marginBottom: 18 },
  dayTitle: { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: -.6, lineHeight: 1.1 },
  daySub: { color: ACCENT, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  warmup: { fontSize: 13, color: "#9a9aae", marginTop: 10 },
  progBar: { height: 8, background: "#1c1d28", borderRadius: 99, overflow: "hidden", marginTop: 14 },
  progFill: { height: "100%", background: `linear-gradient(90deg,${ACCENT_DIM},${ACCENT})`, transition: "width .4s ease", borderRadius: 99 },
  progText: { fontSize: 12, color: "#8484a0", marginTop: 8, display: "flex", alignItems: "center", gap: 8 },
  resetBtn: { marginLeft: "auto", background: "none", border: "1px solid #2a2c3b", color: "#8484a0", borderRadius: 8, fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" },

  // ---- machine + partner ----
  machineChip: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#111219",
    border: "1px solid #2a2c3b", borderRadius: 99, padding: "4px 10px", fontSize: 12, color: "#9a9aae", marginTop: 10,
  },
  partnerCard: {
    display: "flex", alignItems: "center", gap: 10, background: "#0e0f16",
    border: "1px solid #1c1d28", borderRadius: 14, padding: "11px 13px", marginBottom: 14,
  },
  partnerName: { fontSize: 13, fontWeight: 600, color: "#cbcbd8" },
  partnerWhat: { fontSize: 12, color: "#7a7a90", marginTop: 1 },

  // ---- blocks ----
  block: { marginBottom: 16 },
  blockName: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#6a6a80", marginBottom: 8, paddingLeft: 4 },
  blockNameTogether: { color: ACCENT },
  blockNote: { fontSize: 12, color: "#6a6a80", marginBottom: 8, paddingLeft: 4 },
  exRow: { display: "flex", alignItems: "center", gap: 12, background: "#111219", border: "1px solid #1c1d28", borderRadius: 14, padding: 10, marginBottom: 8, transition: "all .25s ease" },
  exRowDone: { background: "rgba(84,179,126,.11)", border: "1px solid rgba(84,179,126,.45)" },
  exRowTogether: { border: "1px solid rgba(129,140,248,.22)", background: "rgba(129,140,248,.04)" },
  demoWrap: { flex: "0 0 auto", width: 56, height: 56, borderRadius: 12, background: "#0b0c11", display: "grid", placeItems: "center", border: "1px solid #1a1b24" },
  exName: { fontSize: 15, fontWeight: 600 },
  exSets: { fontSize: 13, color: "#8a8a9e", marginTop: 2 },
  // ---- target-muscle sub-row ----
  muscleRow: {
    display: "flex", alignItems: "center", gap: 11, marginTop: 8,
    padding: "7px 9px", background: "#0b0c11", border: "1px solid #1a1b24", borderRadius: 10,
  },
  muscleText: { minWidth: 0 },
  muscleLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a5a70", marginBottom: 2 },
  muscleList: { fontSize: 12.5, color: "#b8b8c8", lineHeight: 1.35 },
  musclePrimary: { color: ACCENT, fontWeight: 600 },
  timerBtn: { background: "rgba(129,140,248,.1)", border: "1px solid rgba(129,140,248,.32)", color: ACCENT, borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 },
  demoBtn: { background: "#16171f", border: "1px solid #2a2c3b", color: "#c8c8d4", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 },
  logToggle: { background: "#1a1b24", border: "1px solid #2a2c3b", color: "#b0b0c0", borderRadius: 8, fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 },
  logToggleOpen: { background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.38)", color: ACCENT },
  check: {
    flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%", border: "2px solid #2a2c3b",
    background: "transparent", color: ACCENT, fontSize: 20, fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center",
  },
  checkDone: { background: "#54b37e", border: "2px solid #54b37e", color: "#06130b" },

  // ---- set tracker (header of the log panel) ----
  setTrack: {
    display: "flex", alignItems: "center", gap: 9, marginBottom: 10,
    paddingBottom: 10, borderBottom: "1px solid #1a1b24",
  },
  setTrackLabel: { fontSize: 13, fontWeight: 700, color: "#cbcbd8", whiteSpace: "nowrap" },
  setTrackLabelDone: { color: ACCENT },
  setDots: { display: "flex", gap: 5, flexWrap: "wrap" },
  setDot: {
    width: 15, height: 15, borderRadius: "50%", border: "2px solid #2a2c3b",
    display: "grid", placeItems: "center", fontSize: 9, color: ON_ACCENT, fontWeight: 800,
  },
  setDotDone: { background: ACCENT, border: `2px solid ${ACCENT}` },
  setDotNext: { border: `2px solid ${ACCENT}`, boxShadow: `0 0 0 3px rgba(129,140,248,.14)` },
  setDotExtra: { background: ACCENT_DIM, border: `2px solid ${ACCENT_DIM}` },

  // ---- between-sets rest timer (sticky, above the tab bar) ----
  restBar: {
    position: "fixed", left: 0, right: 0, zIndex: 60,
    bottom: "calc(62px + env(safe-area-inset-bottom))",
    margin: "0 auto", maxWidth: 520, width: "100%",
    background: "rgba(14,15,22,.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid #2c2e3d", boxShadow: "0 -8px 24px -12px rgba(0,0,0,.6)",
    animation: "fade .25s ease",
  },
  restBarDone: { background: "rgba(20,22,40,.96)", borderTop: `1px solid ${ACCENT}` },
  restProgTrack: { height: 3, background: "#1c1d28", overflow: "hidden" },
  restProgFill: { height: "100%", transition: "width 1s linear" },
  restRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" },
  restKicker: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#7a7a90" },
  restGo: {
    fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: ACCENT, letterSpacing: .5,
  },
  restTime: { fontSize: 24, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums", lineHeight: 1 },
  restLabel: { fontSize: 12, color: "#8a8a9e", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  restControls: { display: "flex", gap: 6, flex: "0 0 auto" },
  restBtn: {
    background: "#1a1b24", border: "1px solid #2a2c3b", color: "#cbcbd8", borderRadius: 8,
    fontSize: 13, fontWeight: 600, padding: "6px 9px", cursor: "pointer", fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
  },
  restSkip: {
    background: "none", border: "1px solid #2a2c3b", color: "#8a8a9e", borderRadius: 8,
    fontSize: 12, padding: "6px 11px", cursor: "pointer", fontFamily: "inherit",
  },
  restChips: {
    display: "flex", alignItems: "center", gap: 6, padding: "0 14px 10px",
    marginTop: -2, flexWrap: "wrap",
  },
  restChipsLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a5a70", marginRight: 2 },
  restChip: {
    background: "#16171f", border: "1px solid #2a2c3b", color: "#b0b0c0", borderRadius: 99,
    fontSize: 12, fontWeight: 600, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
  },
  restChipActive: { background: "rgba(129,140,248,.14)", border: `1px solid ${ACCENT}`, color: ACCENT },

  // ---- log panel ----
  logPanel: { marginTop: 10, padding: 12, background: "#0b0c11", border: "1px solid #1c1d28", borderRadius: 12 },
  lastRow: { fontSize: 12, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" },
  lastTag: { background: "#16171f", border: "1px solid #2a2c3b", borderRadius: 6, padding: "2px 7px", color: "#9a9aae", fontSize: 12 },
  todaySets: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  setChip: { display: "flex", alignItems: "center", gap: 8, background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 8, padding: "6px 10px" },
  setX: { marginLeft: "auto", background: "none", border: "none", color: "#8484a0", fontSize: 18, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" },
  logInputs: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center", flex: "1 1 80px", minWidth: 70 },
  numInput: { width: "100%", background: "#111219", border: "1px solid #262838", borderRadius: 8, color: "#eaeaf0", fontSize: 16, padding: "8px 34px 8px 10px", fontFamily: "inherit", outline: "none" },
  inputUnit: { position: "absolute", right: 9, fontSize: 11, color: "#6a6a80" },
  addSetBtn: { flex: "0 0 auto", background: ACCENT, color: ON_ACCENT, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit" },

  // ---- history ----
  select: { width: "100%", background: "#111219", border: "1px solid #262838", borderRadius: 10, color: "#eaeaf0", fontSize: 15, padding: "10px 12px", fontFamily: "inherit", outline: "none" },
  legendRow: { display: "flex", gap: 16, fontSize: 12, color: "#9a9aae", marginTop: 10 },
  dot: { display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: "middle" },
  histRow: { display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #17181f" },
  histTag: { display: "inline-block", background: "#16171f", border: "1px solid #2a2c3b", borderRadius: 6, padding: "2px 7px", marginRight: 5, color: "#9a9aae", fontSize: 12 },

  footer: { fontSize: 12, color: "#6a6a80", lineHeight: 1.6, marginTop: 22, padding: 14, background: "#0e0f16", borderRadius: 12, border: "1px solid #1a1b24" },

  // ---- modals ----
  modalWrap: { position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 },
  modalCard: { background: "#111219", border: "1px solid #22232f", borderRadius: 22, padding: 26, textAlign: "center", width: "100%", maxWidth: 320 },
  btnGhost: { background: "#1a1b24", border: "1px solid #2a2c3b", color: "#cbcbd8", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 14 },
  btnAccent: { background: ACCENT, border: "none", color: ON_ACCENT, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 14 },

  // ---- setup ----
  setupWrap: { maxWidth: 460, margin: "0 auto", paddingTop: 8 },
  setupTitle: { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -.4, marginBottom: 6 },
  setupBody: { fontSize: 14, color: "#8a8a9e", lineHeight: 1.6, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#6a6a80", marginBottom: 6, display: "block" },
  textInput: { width: "100%", background: "#111219", border: "1px solid #262838", borderRadius: 10, color: "#eaeaf0", fontSize: 16, padding: "11px 12px", fontFamily: "inherit", outline: "none" },
  segRow: { display: "flex", gap: 8 },
  seg: { flex: 1, background: "#16171f", border: "1px solid #262838", color: "#b0b0c0", borderRadius: 10, padding: "11px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  segActive: { background: "rgba(129,140,248,.12)", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 700 },
  codeBox: {
    width: "100%", background: "#0b0c11", border: "1px dashed #33364a", borderRadius: 10,
    color: ACCENT, fontSize: 12, padding: 12, fontFamily: "ui-monospace, monospace",
    wordBreak: "break-all", lineHeight: 1.5, minHeight: 84, resize: "vertical", outline: "none",
  },
  note: { fontSize: 12, color: "#6a6a80", lineHeight: 1.6, marginTop: 10 },
  err: { fontSize: 13, color: "#ff7a7a", marginTop: 8 },

  // ---- nutrition ----
  //  Protein gets its own colour (amber) because it's a different *kind* of
  //  number from calories: you're trying to clear a floor, not stay under a
  //  ceiling. Painting both indigo would say they behave the same way.
  fuelCard: {
    background: "linear-gradient(135deg,#16172040,#0e0f16), #12131b", border: "1px solid #22232f",
    borderRadius: 18, padding: 16, marginBottom: 16,
  },
  fuelHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  fuelTitle: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#8a8a9e", fontWeight: 600 },
  macroRow: { marginBottom: 10 },
  macroTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginBottom: 5 },
  macroName: { color: "#9a9aae", fontWeight: 500 },
  macroVal: { fontVariantNumeric: "tabular-nums", fontWeight: 600 },
  macroBar: { height: 7, background: "#1c1d28", borderRadius: 99, overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: 99, transition: "width .45s ease" },
  macroMini: { display: "flex", gap: 14, fontSize: 12, color: "#7a7a90", marginTop: 4 },

  weighRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  weighInput: {
    width: 92, background: "#111219", border: "1px solid #262838", borderRadius: 9,
    color: "#eaeaf0", fontSize: 16, padding: "8px 10px", fontFamily: "inherit", outline: "none",
  },
  weighDone: { fontSize: 12, color: "#7a7a90" },

  mealRow: {
    display: "flex", alignItems: "center", gap: 10, background: "#111219",
    border: "1px solid #1c1d28", borderRadius: 12, padding: "9px 11px", marginBottom: 7,
  },
  mealName: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  mealMacros: { fontSize: 12, color: "#7a7a90", marginTop: 2, fontVariantNumeric: "tabular-nums" },
  mealKcal: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#e6e6ee" },
  mealX: { background: "none", border: "none", color: "#55556a", fontSize: 19, cursor: "pointer", lineHeight: 1, fontFamily: "inherit", padding: "0 2px" },
  srcTag: {
    fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#6a6a80",
    border: "1px solid #262838", borderRadius: 5, padding: "1px 4px", marginLeft: 6, verticalAlign: "middle",
  },

  addRow: { display: "flex", gap: 7, marginTop: 4 },
  addBtn: {
    flex: 1, background: "#1a1b24", border: "1px solid #2a2c3b", color: "#cbcbd8", borderRadius: 10,
    padding: "10px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
  },
  addBtnPrimary: { background: "rgba(129,140,248,.1)", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 600 },

  // ---- the meal draft (the review-before-save step) ----
  draftCard: { background: "#0b0c11", border: "1px dashed #33364a", borderRadius: 12, padding: 13, marginTop: 10 },
  draftItem: { fontSize: 12, color: "#8a8a9e", padding: "3px 0", borderBottom: "1px solid #17181f" },
  caveat: {
    fontSize: 12, color: "#c8b06a", background: "rgba(200,176,106,.07)",
    border: "1px solid rgba(200,176,106,.2)", borderRadius: 9, padding: "8px 10px", marginTop: 10, lineHeight: 1.5,
  },
  macroGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginTop: 10 },
  macroCell: { display: "flex", flexDirection: "column", gap: 3 },
  macroCellLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#6a6a80" },
  macroCellInput: {
    width: "100%", background: "#111219", border: "1px solid #262838", borderRadius: 8,
    color: "#eaeaf0", fontSize: 15, padding: "7px 8px", fontFamily: "inherit", outline: "none",
    fontVariantNumeric: "tabular-nums",
  },
  spinner: {
    width: 15, height: 15, borderRadius: "50%", border: `2px solid rgba(129,140,248,.25)`,
    borderTopColor: ACCENT, display: "inline-block", animation: "spin .7s linear infinite",
  },

  // ---- insights ----
  insightCard: { border: "1px solid #22232f", borderRadius: 14, padding: 13, marginBottom: 9, background: "#0e0f16" },
  insightGood: { border: "1px solid rgba(129,140,248,.3)", background: "rgba(129,140,248,.05)" },
  insightWarn: { border: "1px solid rgba(220,150,80,.3)", background: "rgba(220,150,80,.05)" },
  insightTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  insightBody: { fontSize: 13, color: "#8a8a9e", lineHeight: 1.6 },
  bigStat: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 },
  bigNum: { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 34, letterSpacing: -1, lineHeight: 1, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  bigUnit: { fontSize: 13, color: "#7a7a90" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 },
  statBox: { background: "#0e0f16", border: "1px solid #22232f", borderRadius: 12, padding: 11 },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#6a6a80", marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  coachBox: {
    background: "rgba(129,140,248,.05)", border: "1px solid rgba(129,140,248,.22)",
    borderRadius: 14, padding: 14, marginTop: 14, fontSize: 13, color: "#c8c8d8", lineHeight: 1.65,
  },
  backupBanner: {
    display: "flex", alignItems: "center", gap: 11,
    background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.28)",
    borderRadius: 14, padding: "11px 13px", margin: "0 0 14px",
  },
  weekNav: {
    flex: "0 0 auto", width: 30, height: 30, borderRadius: 9,
    background: "#16171f", border: "1px solid #2a2c3b", color: "#c9c9d6",
    cursor: "pointer", fontFamily: "inherit", fontSize: 17, lineHeight: 1,
    display: "grid", placeItems: "center",
  },
  prBadge: {
    display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 7,
    padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    background: "rgba(224,180,74,.14)", border: "1px solid rgba(224,180,74,.42)",
    color: "#E0B44A", verticalAlign: "middle", whiteSpace: "nowrap",
  },
};

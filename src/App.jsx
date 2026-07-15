// ============================================================
//  IRONCLAD — Progressive Workout PWA
//  Two people, one garage gym, one treadmill.
//
//  The program is no longer keyed to weekdays. Each person cycles the same six
//  workouts one per training day, so splitting the calendar between two people
//  no longer amputates the program (Mon/Wed/Fri used to mean two leg days and
//  no pull day, forever). See lib/schedule.js for how the calendar is derived.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ACCENT, DEMOS, EX_VIDEO, TOGETHER, REST_DAY, forMachine } from "./data/program.js";
import {
  agendaFor, weekAgenda, blocksFor, exercisesFor, dateKey,
  personById, partnerOf, WORKOUT_SHORTS,
} from "./lib/schedule.js";
import {
  loadPlan, savePlan, loadMe, saveMe, loadProgress, saveProgress,
  loadLogs, saveLogs, migrateLegacy, encodePlan, resetEverything,
  loadMeals, saveMeals, loadWeights, saveWeights, loadTargets, saveTargets,
  loadApiKey, saveApiKey, loadModel, saveModel,
} from "./lib/storage.js";
import { estimateTDEE, resolveTargets, weightTrend, DEFAULT_TARGETS } from "./lib/nutrition.js";
import { MODELS, DEFAULT_MODEL } from "./lib/claude.js";
import { S } from "./styles.js";
import Demo from "./components/Demo.jsx";
import { TimerModal, VideoModal } from "./components/Modals.jsx";
import LogPanel from "./components/LogPanel.jsx";
import HistoryModal from "./components/HistoryModal.jsx";
import Setup from "./components/Setup.jsx";
import FuelCard from "./components/FuelCard.jsx";
import InsightsView from "./components/InsightsView.jsx";
import TabBar from "./components/TabBar.jsx";
import RestTimer from "./components/RestTimer.jsx";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MACHINE_ICON = { treadmill: "🏃", bike: "🚴" };
const MACHINE_NAME = { treadmill: "Treadmill", bike: "Bike" };

export default function App() {
  const [plan, setPlan] = useState(() => loadPlan());
  const [me, setMe] = useState(() => loadMe());
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [progress, setProgress] = useState({});
  const [logs, setLogs] = useState({});
  const [meals, setMeals] = useState({});
  const [weights, setWeights] = useState({});
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [model, setModel] = useState(() => loadModel() || DEFAULT_MODEL);
  const [openLog, setOpenLog] = useState(null);
  const [timer, setTimer] = useState(null);
  const [video, setVideo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(new Date());

  // live clock for the midnight countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // load this profile's data whenever the signed-in person changes
  useEffect(() => {
    if (!me) return;
    migrateLegacy(me); // pull the old single-user logs into this profile, once
    setProgress(loadProgress(me));
    setLogs(loadLogs(me));
    setMeals(loadMeals(me));
    setWeights(loadWeights(me));
    setTargets(loadTargets(me) || DEFAULT_TARGETS);
  }, [me]);

  const finishSetup = (newPlan, personId) => {
    savePlan(newPlan);
    saveMe(personId);
    setPlan(newPlan);
    setMe(personId);
  };

  if (!plan || !me) return <Shell><Setup onReady={finishSetup} /></Shell>;

  return (
    <Trainer
      plan={plan}
      me={me}
      selected={selected}
      setSelected={setSelected}
      progress={progress}
      setProgress={setProgress}
      logs={logs}
      setLogs={setLogs}
      meals={meals}
      setMeals={setMeals}
      weights={weights}
      setWeights={setWeights}
      targets={targets}
      setTargets={setTargets}
      apiKey={apiKey}
      model={model}
      onSetApiKey={(k) => { saveApiKey(k); setApiKey(k); }}
      onSetModel={(m) => { saveModel(m); setModel(m); }}
      openLog={openLog}
      setOpenLog={setOpenLog}
      timer={timer}
      setTimer={setTimer}
      video={video}
      setVideo={setVideo}
      showHistory={showHistory}
      setShowHistory={setShowHistory}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      now={now}
      onSwitchPerson={(id) => { saveMe(id); setMe(id); }}
    />
  );
}

// The page chrome — fonts, keyframes, background. Shared by setup and the app.
function Shell({ children }) {
  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Outfit:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{height:0;width:0}
        @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flip{0%,38%{opacity:0}50%,88%{opacity:1}100%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      {children}
    </div>
  );
}

function Trainer({
  plan, me, selected, setSelected, progress, setProgress, logs, setLogs,
  meals, setMeals, weights, setWeights, targets, setTargets,
  apiKey, model, onSetApiKey, onSetModel,
  openLog, setOpenLog, timer, setTimer, video, setVideo,
  showHistory, setShowHistory,
  showSettings, setShowSettings, now, onSwitchPerson,
}) {
  const [tab, setTab] = useState("train");
  const [rest, setRest] = useState(null); // { id, secs, label } — the sticky rest timer
  const today = dateKey(now);
  const person = personById(plan, me);
  const other = partnerOf(plan, me);

  const agenda = useMemo(() => agendaFor(plan, me, selected), [plan, me, selected]);
  const week = useMemo(() => weekAgenda(plan, me, selected), [plan, me, selected]);
  const blocks = useMemo(() => blocksFor(agenda), [agenda]);
  const allExercises = useMemo(() => exercisesFor(agenda), [agenda]);

  // ---- persistence ----
  const persistProgress = useCallback((next) => {
    setProgress(next);
    saveProgress(me, next);
  }, [me, setProgress]);

  const persistLogs = useCallback((next) => {
    setLogs(next);
    saveLogs(me, next);
  }, [me, setLogs]);

  // Completion is keyed by date (and block, so a Plank in the Together block
  // and a Plank inside the day's workout are tracked separately).
  const doneKey = (block, name) => `${selected}::${block}::${name}`;
  const isDone = (block, name) => !!progress[doneKey(block, name)];
  const toggle = (block, name) => {
    const k = doneKey(block, name);
    persistProgress({ ...progress, [k]: !progress[k] });
  };

  const logSet = (exName, weight, reps, restSecs) => {
    const next = { ...logs };
    const entries = next[exName] ? [...next[exName]] : [];
    let entry = entries.find((e) => e.date === selected);
    if (!entry) {
      entry = { date: selected, sets: [] };
    } else {
      entries.splice(entries.indexOf(entry), 1);
    }
    entry = { ...entry, sets: [...entry.sets, { w: weight, r: reps }] };
    entries.unshift(entry);
    next[exName] = entries;
    persistLogs(next);

    // Start the rest clock. Only for real strength sets logged on today — a
    // rest countdown for a workout you're back-filling from Tuesday is noise.
    if (restSecs && selected === today) {
      setRest({ id: `${exName}-${entry.sets.length}-${Date.now()}`, secs: restSecs, label: exName });
    }
  };

  const removeSet = (exName, setIdx) => {
    const next = { ...logs };
    const entries = [...(next[exName] || [])];
    const entry = entries.find((e) => e.date === selected);
    if (!entry) return;
    const sets = entry.sets.filter((_, i) => i !== setIdx);
    next[exName] = sets.length
      ? entries.map((e) => (e.date === selected ? { ...e, sets } : e))
      : entries.filter((e) => e.date !== selected);
    persistLogs(next);
  };

  // ---- nutrition ----
  const persistMeals = (next) => { setMeals(next); saveMeals(me, next); };
  const persistWeights = (next) => { setWeights(next); saveWeights(me, next); };
  const persistTargets = (next) => { setTargets(next); saveTargets(me, next); };

  const addMeal = (meal) =>
    persistMeals({ ...meals, [selected]: [...(meals[selected] || []), meal] });

  const removeMeal = (id) => {
    const rest = (meals[selected] || []).filter((m) => m.id !== id);
    const next = { ...meals };
    // Drop the key entirely rather than leaving an empty array behind — an empty
    // day and an unlogged day must not look the same to the TDEE math, which
    // averages only the days you actually logged.
    if (rest.length) next[selected] = rest;
    else delete next[selected];
    persistMeals(next);
  };

  const setWeight = (lb) => {
    const next = { ...weights };
    if (lb == null) delete next[selected];
    else next[selected] = lb;
    persistWeights(next);
  };

  // The calorie/protein targets shown on the day card are derived from the
  // measured TDEE, so they move as the measurement sharpens.
  const tdee = useMemo(
    () => estimateTDEE(meals, weights, today),
    [meals, weights, today],
  );
  const bodyweight = useMemo(
    () => weightTrend(weights, today).latest ?? weightTrend(weights, today).avg ?? null,
    [weights, today],
  );
  const resolvedTargets = useMemo(
    () => resolveTargets(targets, tdee, bodyweight),
    [targets, tdee, bodyweight],
  );

  const sessionOn = (exName, date) => (logs[exName] || []).find((e) => e.date === date) || null;
  const lastSession = (exName) =>
    (logs[exName] || []).find((e) => e.date !== selected && e.date < selected) || null;

  const loggedExercises = Object.keys(logs).filter((k) => (logs[k] || []).length > 0).sort();

  const exportCSV = () => {
    const rows = [["date", "exercise", "set", "weight_lb", "reps"]];
    Object.keys(logs).forEach((exName) => {
      [...logs[exName]]
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((entry) => {
          entry.sets.forEach((s, i) => rows.push([entry.date, exName, i + 1, s.w, s.r]));
        });
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironclad-${person.name.toLowerCase().replace(/\s+/g, "-")}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- progress for the selected day ----
  const total = allExercises.length;
  const complete = allExercises.filter((e) => isDone(e.block, e.n)).length;
  const pct = total ? (complete / total) * 100 : 0;
  const allDone = total > 0 && complete === total;

  const resetDay = () => {
    const next = { ...progress };
    allExercises.forEach((e) => delete next[doneKey(e.block, e.n)]);
    persistProgress(next);
  };

  // ---- midnight countdown (now real: completion is keyed by date) ----
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  const secsLeft = Math.max(0, Math.floor((endOfDay - now) / 1000));
  const cd = {
    h: String(Math.floor(secsLeft / 3600)).padStart(2, "0"),
    m: String(Math.floor((secsLeft % 3600) / 60)).padStart(2, "0"),
    s: String(secsLeft % 60).padStart(2, "0"),
  };

  const machine = agenda.machine;
  const warmup = agenda.workout?.warmup?.[machine === "bike" ? "bike" : "treadmill"];

  return (
    <Shell>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.brand}>IRON<span style={{ color: ACCENT }}>CLAD</span></div>
          <div style={S.tagline}>One gym · two people</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={S.countdown}>
            <div style={S.cdLabel}>Day resets in</div>
            <div style={S.cdTime}>{cd.h}:{cd.m}:{cd.s}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.statsBtn} onClick={() => setShowHistory(true)}>📈 Progress</button>
            <button style={S.statsBtn} onClick={() => setShowSettings(true)}>⚙</button>
          </div>
        </div>
      </div>

      {/* Who's who + the week — shared by Train and Fuel (Insights is standalone) */}
      {tab !== "insights" && (
      <>
      <div style={S.whoRow}>
        <button style={S.whoChip} onClick={() => setShowSettings(true)}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT }} />
          {person.name}
        </button>
        <span style={S.whoChipPartner}>with {other.name}</span>
      </div>

      <div style={S.weekRow}>
        {week.map((a) => {
          const active = a.date === selected;
          const yours = !a.isRest;
          const label = a.isRest
            ? "Rest"
            : a.trains
              ? a.workout.short
              : a.run
                ? (a.run.machine === "bike" ? "Ride" : "Run")
                : "Mobility";
          return (
            <button
              key={a.date}
              onClick={() => { setSelected(a.date); setOpenLog(null); }}
              style={{
                ...S.weekCell,
                ...(yours ? S.weekCellYours : {}),
                ...(active ? S.weekCellActive : {}),
              }}
            >
              {a.date === today && <span style={S.todayDot} />}
              <div style={S.weekDow}>{DOW[a.weekday - 1]}</div>
              <div style={{ ...S.weekWorkout, color: a.trains ? ACCENT : "#9aa" }}>{label}</div>
              <div style={S.weekMeta}>
                {a.isRest
                  ? "both"
                  : a.partner.trains
                    ? `${other.name.slice(0, 4)} ${a.partner.workout.short}`
                    : ""}
                {a.together ? " ✦" : ""}
              </div>
            </button>
          );
        })}
      </div>
      </>
      )}

      {/* ============ TRAIN ============ */}
      {tab === "train" && (
      <>
      {/* The day */}
      <div style={S.dayCard} key={selected}>
        <div style={{ animation: "fade .4s ease" }}>
          {agenda.isRest ? (
            // The one day you're both off. No exercises, no checkmarks, no
            // progress bar — a rest day with a to-do list isn't a rest day.
            <>
              <div style={S.dayTitle}>{REST_DAY.title}</div>
              <div style={S.daySub}>{REST_DAY.subtitle}</div>
              <div style={S.warmup}>{REST_DAY.note}</div>
            </>
          ) : agenda.trains ? (
            <>
              <div style={S.dayTitle}>{agenda.workout.title}</div>
              <div style={S.daySub}>{agenda.workout.subtitle}</div>
              {warmup && <div style={S.warmup}>🔥 Warm-Up · {warmup}</div>}
            </>
          ) : (
            <>
              <div style={S.dayTitle}>
                {agenda.recovery ? agenda.recovery.title : "Cardio Day"}
              </div>
              <div style={S.daySub}>
                {agenda.partner.trains ? `${other.name}'s gym day` : "Off the bar"}
              </div>
              <div style={S.warmup}>
                {agenda.recovery
                  ? agenda.together
                    ? `Easy movement, plus core with ${other.name}. A leg day follows this one — keep it light.`
                    : agenda.recovery.note
                  : agenda.together
                    ? `Your ${agenda.run.machine === "bike" ? "ride" : "run"}, plus core with ${other.name}.`
                    : `No lifting — just your ${agenda.run.machine === "bike" ? "ride" : "run"}.`}
              </div>
            </>
          )}

          {machine && (
            <div style={S.machineChip}>
              {MACHINE_ICON[machine]} {MACHINE_NAME[machine]}
              {agenda.partner.machine && (
                <span style={{ color: "#5a6a5a" }}>
                  · {other.name} on the {agenda.partner.machine}
                </span>
              )}
            </div>
          )}

          {total > 0 && (
            <>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${pct}%` }} />
              </div>
              <div style={S.progText}>
                {complete}/{total} complete
                {allDone && <span style={{ color: ACCENT, fontWeight: 700 }}> — Day crushed 💪</span>}
                {complete > 0 && <button style={S.resetBtn} onClick={resetDay}>reset</button>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* What the other one is doing */}
      <PartnerCard agenda={agenda} other={other} />

      {/* Blocks */}
      {blocks.map((block, bi) => (
        <div key={bi} style={S.block}>
          <div style={{ ...S.blockName, ...(block.isTogether ? S.blockNameTogether : {}) }}>
            {block.isTogether ? `✦ ${block.name} · with ${other.name}` : block.name}
          </div>
          {(block.isTogether || block.isRecovery) && (
            <div style={S.blockNote}>{block.note}</div>
          )}

          {block.exercises.map((raw, ei) => {
            const ex = forMachine(raw, machine);
            const done = isDone(block.name, ex.n);
            const isOpen = openLog === `${block.name}::${ex.n}`;
            const tSession = sessionOn(ex.n, selected);
            return (
              <div
                key={ei}
                style={{
                  ...S.exRow,
                  ...(block.isTogether ? S.exRowTogether : {}),
                  ...(done ? S.exRowDone : {}),
                  flexWrap: "wrap",
                }}
              >
                <div style={S.demoWrap}>
                  <Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={56} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...S.exName, ...(done ? { textDecoration: "line-through", color: "#666" } : {}) }}>
                    {ex.n}
                  </div>
                  <div style={S.exSets}>{ex.s}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {EX_VIDEO[ex.n] && (
                      <button style={S.demoBtn} onClick={() => setVideo({ video: EX_VIDEO[ex.n], name: ex.n })}>
                        ▶ Demo
                      </button>
                    )}
                    {ex.timer && (
                      <button style={S.timerBtn} onClick={() => setTimer({ seconds: ex.timer, label: ex.n })}>
                        ⏱ Start timer
                      </button>
                    )}
                    <button
                      style={{ ...S.logToggle, ...(isOpen ? S.logToggleOpen : {}) }}
                      onClick={() => setOpenLog(isOpen ? null : `${block.name}::${ex.n}`)}
                    >
                      📋 Log {tSession ? `(${tSession.sets.length})` : ""}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggle(block.name, ex.n)}
                  style={{ ...S.check, ...(done ? S.checkDone : {}) }}
                  aria-label="complete"
                >
                  {done ? <span style={{ animation: "pop .35s ease" }}>✓</span> : ""}
                </button>
                {isOpen && (
                  <div style={{ flexBasis: "100%", animation: "fade .25s ease" }}>
                    <LogPanel
                      exName={ex.n}
                      prescription={ex.s}
                      today={tSession}
                      last={lastSession(ex.n)}
                      onAdd={logSet}
                      onRemove={removeSet}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {!agenda.isRest && (
        <div style={S.footer}>
          Progression: add 5 lb to upper-body lifts and 5–10 lb to lower-body lifts every
          1–2 weeks once you hit all reps with clean form. Keep 1–2 reps in reserve.
        </div>
      )}
      </>
      )}

      {/* ============ FUEL ============ */}
      {tab === "fuel" && (
      <>
        <div style={S.fuelDayHead}>
          {selected === today ? "Today" : DOW[agenda.weekday - 1]}
          <span style={{ color: "#556" }}>· {selected.slice(5).replace("-", "/")}</span>
          {agenda.isRest && <span style={{ color: "#556" }}>· rest day</span>}
        </div>
        <FuelCard
          meals={meals[selected]}
          weight={weights[selected]}
          targets={resolvedTargets}
          apiKey={apiKey}
          model={model}
          restMode={agenda.isRest}
          onAddMeal={addMeal}
          onRemoveMeal={removeMeal}
          onWeigh={setWeight}
          onOpenInsights={() => setTab("insights")}
        />
      </>
      )}

      {/* ============ INSIGHTS ============ */}
      {tab === "insights" && (
        <InsightsView
          meals={meals}
          weights={weights}
          logs={logs}
          targets={targets}
          today={today}
          who={person.name}
          apiKey={apiKey}
          model={model}
          onSetTargets={persistTargets}
        />
      )}

      {timer && <TimerModal seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />}
      {video && <VideoModal video={video.video} name={video.name} onClose={() => setVideo(null)} />}
      {showHistory && (
        <HistoryModal
          logs={logs}
          exercises={loggedExercises}
          who={person.name}
          onClose={() => setShowHistory(false)}
          onExport={exportCSV}
        />
      )}
      {showSettings && (
        <SettingsModal
          plan={plan}
          me={me}
          apiKey={apiKey}
          model={model}
          onSetApiKey={onSetApiKey}
          onSetModel={onSetModel}
          onSwitchPerson={onSwitchPerson}
          onClose={() => setShowSettings(false)}
        />
      )}

      {rest && (
        <RestTimer
          key={rest.id}
          seconds={rest.secs}
          label={rest.label}
          onClose={() => setRest(null)}
        />
      )}

      <TabBar tab={tab} setTab={setTab} />
    </Shell>
  );
}

// ---- what your partner is doing today -------------------------------
function PartnerCard({ agenda, other }) {
  const p = agenda.partner;
  let what;
  if (agenda.isRest) what = "Off today as well — the gym stays shut";
  else if (p.trains) what = `${p.workout.title} · on the ${p.machine}`;
  else if (p.runs) what = `Out for a ${p.machine === "bike" ? "ride" : "run"} · on the ${p.machine}`;
  else what = "Mobility — walking and stretching";

  return (
    <div style={S.partnerCard}>
      <div style={{ ...S.demoWrap, width: 34, height: 34, fontSize: 15 }}>
        {p.trains ? "🏋" : p.runs ? "🏃" : agenda.isRest ? "😴" : "🧘"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.partnerName}>{other.name}</div>
        <div style={S.partnerWhat}>{what}</div>
      </div>
      {agenda.together && (
        <div style={{ ...S.machineChip, marginTop: 0, border: "1px solid rgba(57,255,106,.3)", color: ACCENT }}>
          ✦ Core together
        </div>
      )}
    </div>
  );
}

// ---- settings ---------------------------------------------------------
function SettingsModal({ plan, me, apiKey, model, onSetApiKey, onSetModel, onSwitchPerson, onClose }) {
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const code = encodePlan(plan);

  const keySaved = keyDraft === apiKey && !!apiKey;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 420, textAlign: "left", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 14 }}>
          Settings
        </div>

        <label style={S.label}>This phone belongs to</label>
        <div style={{ ...S.segRow, marginBottom: 18 }}>
          {plan.people.map((p) => (
            <button
              key={p.id}
              style={{ ...S.seg, ...(p.id === me ? S.segActive : {}) }}
              onClick={() => onSwitchPerson(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <label style={S.label}>Rotation</label>
        <div style={{ fontSize: 13, color: "#9aa", marginBottom: 4 }}>
          {plan.rotation.map((id) => WORKOUT_SHORTS[id]).join(" → ")}
        </div>
        <div style={{ ...S.note, marginTop: 0, marginBottom: 18 }}>
          Ordered so a hard leg day never follows a hard run. You each take the next one
          on each of your training days, so you both get the whole program.
        </div>

        <label style={S.label}>Plan code</label>
        <textarea readOnly value={code} style={{ ...S.codeBox, minHeight: 64 }} onFocus={(e) => e.target.select()} />
        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 8 }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "✓ Copied" : "Copy plan code"}
        </button>
        <div style={S.note}>
          Both phones must hold this same code — that's what keeps your two calendars in
          agreement without a server. It contains no personal data and no API key.
        </div>

        {/* ---- the API key ---- */}
        <label style={{ ...S.label, marginTop: 22 }}>Anthropic API key</label>
        <div style={{ display: "flex", gap: 7 }}>
          <input
            type={showKey ? "text" : "password"}
            style={{ ...S.textInput, flex: 1, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
            placeholder="sk-ant-…"
            value={keyDraft}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setKeyDraft(e.target.value.trim())}
          />
          <button style={{ ...S.btnGhost, padding: "10px 12px" }} onClick={() => setShowKey(!showKey)}>
            {showKey ? "🙈" : "👁"}
          </button>
        </div>
        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 8, ...(keySaved ? { color: ACCENT, border: `1px solid ${ACCENT}` } : {}) }}
          onClick={() => onSetApiKey(keyDraft)}
        >
          {keySaved
            ? "✓ Key saved on this phone"
            : keyDraft
              ? "Save key"
              : apiKey
                ? "Remove key"
                : "Save key"}
        </button>

        {/* Say the quiet part out loud. The user is the only one who can weigh
            this trade-off, and they can't weigh it if the app doesn't tell them. */}
        <div style={S.note}>
          Used for meal photos and the coach read-out. IRONCLAD has no server, so the key lives
          in <b>this phone's storage</b> — never in the app bundle, never in the plan code, never
          sent anywhere but Anthropic. It's your key and your spend, but anyone holding your
          unlocked phone could read it. Get one at console.anthropic.com. Everything else in the
          app — the workouts, the logs, manual meal entry, all the maths on the Insights screen —
          works with no key at all.
        </div>

        <label style={{ ...S.label, marginTop: 18 }}>Model</label>
        <div style={S.segRow}>
          {Object.entries(MODELS).map(([id, m]) => (
            <button
              key={id}
              style={{ ...S.seg, ...(model === id ? S.segActive : {}), fontSize: 12 }}
              onClick={() => onSetModel(id)}
            >
              {m.label.split(" — ")[0]}
              <div style={{ fontSize: 10, color: "#667", fontWeight: 400, marginTop: 2 }}>{m.cost}</div>
            </button>
          ))}
        </div>
        <div style={S.note}>
          Portion size is the hardest part of reading a plate, and it's where the cheaper model
          gives up the most. Given the estimate is already ±20–30%, Opus is the one worth paying for.
        </div>

        <button
          style={{
            ...S.btnGhost, width: "100%", marginTop: 18,
            border: `1px solid ${confirmReset ? "#5a2a2a" : "#2a322a"}`,
            color: confirmReset ? "#ff7a7a" : "#888",
          }}
          onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return; }
            resetEverything();
            window.location.reload();
          }}
        >
          {confirmReset ? "Tap again to erase everything on this phone" : "Start over"}
        </button>

        <button style={{ ...S.btnAccent, width: "100%", marginTop: 10 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

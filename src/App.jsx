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
import {
  ACCENT, DEMOS, EX_VIDEO, TOGETHER, REST_DAY, forMachine, forTravel, musclesFor, MUSCLE_LABELS,
} from "./data/program.js";
import {
  agendaFor, weekAgenda, blocksFor, exercisesFor, dateKey,
  personById, partnerOf, WORKOUT_SHORTS,
} from "./lib/schedule.js";
import {
  loadPlan, savePlan, loadMe, saveMe, loadProgress, saveProgress,
  loadLogs, saveLogs, migrateLegacy, encodePlan, resetEverything,
  loadMeals, saveMeals, loadWeights, saveWeights, loadTargets, saveTargets,
  loadFavMeals, saveFavMeals, loadPhotos, savePhotos,
  loadApiKey, saveApiKey, loadModel, saveModel, loadTravel, saveTravel,
  loadWxKey, saveWxKey,
} from "./lib/storage.js";
import { estimateTDEE, resolveTargets, weightTrend, DEFAULT_TARGETS } from "./lib/nutrition.js";
import { MODELS, DEFAULT_MODEL } from "./lib/claude.js";
import { S } from "./styles.js";
import Demo from "./components/Demo.jsx";
import { TimerModal, VideoModal } from "./components/Modals.jsx";
import ExerciseModal from "./components/ExerciseModal.jsx";
import ExerciseGif, { preloadGifs, allGifIds } from "./components/ExerciseGif.jsx";
import Hint from "./components/Hint.jsx";
import PhotosModal from "./components/PhotosModal.jsx";
import { putPhoto, deletePhoto, compressToBlob } from "./lib/photos.js";
import HistoryModal from "./components/HistoryModal.jsx";
import Setup from "./components/Setup.jsx";
import FuelCard from "./components/FuelCard.jsx";
import InsightsView from "./components/InsightsView.jsx";
import TabBar from "./components/TabBar.jsx";
import RestTimer from "./components/RestTimer.jsx";
import MuscleMap from "./components/MuscleMap.jsx";
import Icon from "./components/Icon.jsx";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MACHINE_ICON = { treadmill: "run", bike: "bike" };
const MACHINE_NAME = { treadmill: "Treadmill", bike: "Bike" };

export default function App() {
  const [plan, setPlan] = useState(() => loadPlan());
  const [me, setMe] = useState(() => loadMe());
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [progress, setProgress] = useState({});
  const [logs, setLogs] = useState({});
  const [meals, setMeals] = useState({});
  const [favMeals, setFavMeals] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [showPhotos, setShowPhotos] = useState(false);
  const [weights, setWeights] = useState({});
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [model, setModel] = useState(() => loadModel() || DEFAULT_MODEL);
  const [wxKey, setWxKey] = useState(() => loadWxKey());
  const [travel, setTravel] = useState(() => loadTravel());

  // Ask the browser to keep our storage — the cached exercise gifs are paid for
  // out of a lifetime quota, so an eviction literally costs requests.
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);
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
    setFavMeals(loadFavMeals(me));
    setPhotos(loadPhotos(me));
    setWeights(loadWeights(me));
    setTargets(loadTargets(me) || DEFAULT_TARGETS);
  }, [me]);

  const finishSetup = (newPlan, personId, baseline = null) => {
    savePlan(newPlan);
    saveMe(personId);
    // Seed the baseline collected at setup so Insights works from day one: the
    // bio (for the day-1 calorie estimate) and a first weigh-in (the start of
    // the trend). Written to storage before setMe so the profile-load effect
    // picks them straight up. All fields optional.
    if (baseline) {
      if (baseline.goal || baseline.sex || baseline.heightIn || baseline.age) {
        saveTargets(personId, {
          ...DEFAULT_TARGETS,
          goal: baseline.goal || DEFAULT_TARGETS.goal,
          sex: baseline.sex || null,
          heightIn: baseline.heightIn || null,
          age: baseline.age || null,
        });
      }
      if (baseline.weightLb > 0) {
        saveWeights(personId, { [dateKey(new Date())]: baseline.weightLb });
      }
    }
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
      favMeals={favMeals}
      setFavMeals={setFavMeals}
      photos={photos}
      setPhotos={setPhotos}
      showPhotos={showPhotos}
      setShowPhotos={setShowPhotos}
      weights={weights}
      setWeights={setWeights}
      targets={targets}
      setTargets={setTargets}
      apiKey={apiKey}
      model={model}
      onSetApiKey={(k) => { saveApiKey(k); setApiKey(k); }}
      onSetModel={(m) => { saveModel(m); setModel(m); }}
      wxKey={wxKey}
      onSetWxKey={(k) => { saveWxKey(k); setWxKey(k); }}
      travel={travel}
      onSetTravel={(v) => { saveTravel(v); setTravel(v); }}
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
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
  meals, setMeals, favMeals, setFavMeals, photos, setPhotos, showPhotos, setShowPhotos,
  weights, setWeights, targets, setTargets,
  apiKey, model, onSetApiKey, onSetModel, wxKey, onSetWxKey, travel, onSetTravel,
  openLog, setOpenLog, timer, setTimer, video, setVideo,
  showHistory, setShowHistory,
  showSettings, setShowSettings, now, onSwitchPerson,
}) {
  const [tab, setTab] = useState("train");
  const [rest, setRest] = useState(null); // { id, secs, label } — the sticky rest timer
  const [openEx, setOpenEx] = useState(null); // { blockName, ex } — the focused exercise modal
  const today = dateKey(now);
  const person = personById(plan, me);
  const other = partnerOf(plan, me);

  const agenda = useMemo(() => agendaFor(plan, me, selected), [plan, me, selected]);
  const week = useMemo(() => weekAgenda(plan, me, selected), [plan, me, selected]);
  const blocks = useMemo(() => blocksFor(agenda), [agenda]);
  // Count the exercises under the same weight-free lens the rows are drawn with,
  // so the progress bar tallies the moves you're actually doing today.
  const allExercises = useMemo(
    () => exercisesFor(agenda).map((e) => forTravel(e, travel)),
    [agenda, travel],
  );
  const machine = agenda.machine;
  // The exercises in render order, machine- and travel-resolved. Lets the
  // exercise modal advance to the next one when a set finishes an exercise.
  const flatExercises = useMemo(
    () => blocks.flatMap((b) => b.exercises.map((raw) => ({ blockName: b.name, ex: forTravel(forMachine(raw, machine), travel) }))),
    [blocks, machine, travel],
  );

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

  // Finish an exercise from its modal: apply its master check, then open the
  // next not-yet-done exercise's modal — or close, if this was the last.
  const completeAndAdvance = (blockName, exName) => {
    const k = doneKey(blockName, exName);
    if (!progress[k]) persistProgress({ ...progress, [k]: true });
    const idx = flatExercises.findIndex((f) => f.blockName === blockName && f.ex.n === exName);
    let next = null;
    for (let i = idx + 1; i < flatExercises.length; i++) {
      if (!isDone(flatExercises[i].blockName, flatExercises[i].ex.n)) { next = flatExercises[i]; break; }
    }
    setOpenEx(next);
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

  // Start the rest clock directly, without needing a set logged first — you tap
  // it when you rack the bar. Same sticky bar the auto-start uses; a fresh key
  // each tap restarts it cleanly. Explicit tap, so it runs on any viewed day.
  const startRest = (exName, secs) => {
    setRest({ id: `${exName}-rest-${Date.now()}`, secs, label: exName });
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

  // ---- favourite meals ----
  const persistFavs = (next) => { setFavMeals(next); saveFavMeals(me, next); };

  const saveFavorite = (meal) => {
    const name = (meal.name || "Meal").trim();
    // One entry per name — re-saving updates the numbers rather than piling up.
    const rest = favMeals.filter((f) => f.name.toLowerCase() !== name.toLowerCase());
    persistFavs([
      { id: `fav-${Date.now()}`, name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat },
      ...rest,
    ].slice(0, 24));
  };

  const removeFavorite = (favId) => persistFavs(favMeals.filter((f) => f.id !== favId));

  // ---- progress photos ----
  const persistPhotos = (next) => { setPhotos(next); savePhotos(me, next); };

  const addPhoto = async (angle, file) => {
    const blob = await compressToBlob(file);
    const id = `ph-${me}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await putPhoto(id, blob);
    const date = dateKey(new Date());
    // One shot per angle per day — re-taking replaces the old one.
    const dup = photos.find((p) => p.date === date && p.angle === angle);
    if (dup) { try { await deletePhoto(dup.id); } catch { /* orphan is harmless */ } }
    persistPhotos([{ id, date, angle }, ...photos.filter((p) => !(p.date === date && p.angle === angle))]);
  };

  const removePhoto = async (id) => {
    try { await deletePhoto(id); } catch { /* metadata is the source of truth */ }
    persistPhotos(photos.filter((p) => p.id !== id));
  };

  // Re-log a saved favourite onto the selected day, timestamped now.
  const logFavorite = (fav) =>
    addMeal({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toTimeString().slice(0, 5),
      name: fav.name, kcal: fav.kcal, protein: fav.protein, carbs: fav.carbs, fat: fav.fat,
      source: "favorite",
    });

  // Re-log any past meal from history onto the selected day, keeping its macros
  // and how it was originally logged (photo/web/etc.), timestamped now.
  const relogMeal = (m) =>
    addMeal({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toTimeString().slice(0, 5),
      name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
      source: m.source && m.source !== "manual" ? m.source : "history",
      items: m.items?.length ? m.items : undefined,
    });

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
            <button style={S.statsBtn} onClick={() => setShowHistory(true)}>
              <Icon name="chart" size={15} /> Progress
            </button>
            <button style={{ ...S.statsBtn, padding: "7px 10px" }} onClick={() => setShowSettings(true)} aria-label="Settings">
              <Icon name="settings" size={16} />
            </button>
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
              {/* the partner's day, at a glance — the name is dropped because
                  it's always the same partner, so their workout + the together
                  ✦ is all that needs to fit in a narrow cell. */}
              <div style={S.weekMeta}>
                {a.isRest ? "both" : a.partner.trains ? a.partner.workout.short : ""}
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
              {warmup && (
                <div style={{ ...S.warmup, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="flame" size={14} style={{ color: ACCENT }} /> Warm-Up · {warmup}
                </div>
              )}
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
              <Icon name={MACHINE_ICON[machine]} size={14} /> {MACHINE_NAME[machine]}
              {agenda.partner.machine && (
                <span style={{ color: "#5a6a5a" }}>
                  · {other.name} on the {agenda.partner.machine}
                </span>
              )}
            </div>
          )}

          {travel && !agenda.isRest && (
            <div
              style={{ ...S.machineChip, marginLeft: machine ? 6 : 0, border: `1px solid ${ACCENT}`, color: ACCENT }}
            >
              <Icon name="plane" size={13} /> Weight-free · every lift swapped for bodyweight
            </div>
          )}

          {total > 0 && (
            <>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${pct}%` }} />
              </div>
              <div style={S.progText}>
                {complete}/{total} complete
                {allDone && <span style={{ color: ACCENT, fontWeight: 700 }}> — Day crushed</span>}
                {complete > 0 && <button style={S.resetBtn} onClick={resetDay}>reset</button>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* What the other one is doing */}
      <PartnerCard agenda={agenda} other={other} />

      {(agenda.trains || blocks.length > 0) && (
        <Hint id="train">
          Tap any exercise to open it — check off each set as you finish, a rest timer runs
          between sets, and planks get a stopwatch. The last set checks the whole exercise off.
        </Hint>
      )}

      {/* Blocks */}
      {blocks.map((block, bi) => (
        <div key={bi} style={S.block}>
          <div style={{ ...S.blockName, ...(block.isTogether ? S.blockNameTogether : {}), display: "flex", alignItems: "center", gap: 6 }}>
            {block.isTogether && <Icon name="sparkle" size={12} />}
            {block.isTogether ? `${block.name} · with ${other.name}` : block.name}
          </div>
          {(block.isTogether || block.isRecovery) && (
            <div style={S.blockNote}>{block.note}</div>
          )}

          {block.exercises.map((raw, ei) => {
            const ex = forTravel(forMachine(raw, machine), travel);
            const done = isDone(block.name, ex.n);
            const tSession = sessionOn(ex.n, selected);
            const muscles = musclesFor(ex);
            const full = muscles.includes("fullbody");
            return (
              <div
                key={ei}
                style={{
                  ...S.exRow,
                  ...(block.isTogether ? S.exRowTogether : {}),
                  ...(done ? S.exRowDone : {}),
                }}
              >
                {/* the whole card opens the exercise modal */}
                <div
                  onClick={() => setOpenEx({ blockName: block.name, ex })}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}
                >
                  <div style={S.demoWrap}>
                    {/* cacheOnly: rows show the real animation once the modal
                        has paid for it, but never spend a request themselves. */}
                    <ExerciseGif
                      name={ex.n}
                      size={56}
                      cacheOnly
                      fallback={<Demo kind={DEMOS[ex.d]?.kind || "core"} name={ex.n} size={56} />}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...S.exName, ...(done ? { textDecoration: "line-through", color: "#666" } : {}) }}>
                      {ex.n}
                    </div>
                    <div style={S.exSets}>
                      {ex.s}
                      {tSession ? <span style={{ color: ACCENT }}> · {tSession.sets.length} logged</span> : null}
                    </div>
                    <div style={S.muscleRow}>
                      <MuscleMap muscles={muscles} height={84} />
                      <div style={S.muscleText}>
                        <div style={S.muscleLabel}>Targets</div>
                        <div style={S.muscleList}>
                          {full ? (
                            "Full body"
                          ) : (
                            muscles.map((m, i) => (
                              <span key={m} style={i === 0 ? S.musclePrimary : undefined}>
                                {MUSCLE_LABELS[m]}
                                {i < muscles.length - 1 ? " · " : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggle(block.name, ex.n)}
                  style={{ ...S.check, ...(done ? S.checkDone : {}) }}
                  aria-label="complete"
                >
                  {done ? <span style={{ animation: "pop .35s ease" }}>✓</span> : ""}
                </button>
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
          allMeals={meals}
          today={today}
          weight={weights[selected]}
          targets={resolvedTargets}
          apiKey={apiKey}
          model={model}
          restMode={agenda.isRest}
          favorites={favMeals}
          onAddMeal={addMeal}
          onRemoveMeal={removeMeal}
          onRelogMeal={relogMeal}
          onLogFavorite={logFavorite}
          onSaveFavorite={saveFavorite}
          onRemoveFavorite={removeFavorite}
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
          onOpenPhotos={() => setShowPhotos(true)}
        />
      )}

      {openEx && (
        <ExerciseModal
          key={`${openEx.blockName}::${openEx.ex.n}`}
          ex={openEx.ex}
          blockName={openEx.blockName}
          isDone={isDone(openEx.blockName, openEx.ex.n)}
          todaySession={sessionOn(openEx.ex.n, selected)}
          lastSession={lastSession(openEx.ex.n)}
          muscles={musclesFor(openEx.ex)}
          video={EX_VIDEO[openEx.ex.n]}
          rest={rest}
          onCloseRest={() => setRest(null)}
          wxKey={wxKey}
          onLogSet={logSet}
          onStartRest={startRest}
          onStartTimer={(seconds, label) => setTimer({ seconds, label })}
          onOpenVideo={(e) => setVideo({ video: EX_VIDEO[e.n], name: e.n })}
          onComplete={completeAndAdvance}
          onClose={() => setOpenEx(null)}
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
          travel={travel}
          onSetTravel={onSetTravel}
          wxKey={wxKey}
          onSetWxKey={onSetWxKey}
          onSetApiKey={onSetApiKey}
          onSetModel={onSetModel}
          onSwitchPerson={onSwitchPerson}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPhotos && (
        <PhotosModal
          photos={photos}
          onAdd={addPhoto}
          onRemove={removePhoto}
          onClose={() => setShowPhotos(false)}
        />
      )}

      {/* The sticky bottom bar — but when the exercise modal is showing this
          rest inline, don't also float it behind the modal. */}
      {rest && !(openEx && rest.label === openEx.ex.n) && (
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

  const partnerIcon = p.trains ? "dumbbell" : p.runs ? "run" : agenda.isRest ? "moon" : "stretch";

  return (
    <div style={S.partnerCard}>
      <div style={{ ...S.demoWrap, width: 34, height: 34, color: "#8a8a9e" }}>
        <Icon name={partnerIcon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.partnerName}>{other.name}</div>
        <div style={S.partnerWhat}>{what}</div>
      </div>
      {agenda.together && (
        <div style={{ ...S.machineChip, marginTop: 0, border: "1px solid rgba(129,140,248,.3)", color: ACCENT }}>
          <Icon name="sparkle" size={12} /> Core together
        </div>
      )}
    </div>
  );
}

// ---- settings ---------------------------------------------------------
function SettingsModal({ plan, me, apiKey, model, travel, onSetTravel, wxKey, onSetWxKey, onSetApiKey, onSetModel, onSwitchPerson, onClose }) {
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [wxDraft, setWxDraft] = useState(wxKey);
  const [showWx, setShowWx] = useState(false);
  const [pre, setPre] = useState(null); // { done, total, ok, stop? } while loading
  const code = encodePlan(plan);

  const runPreload = () => {
    if (pre) return;
    const total = allGifIds().length;
    setPre({ done: 0, total, ok: 0 });
    preloadGifs(wxKey, (done, t, ok, stop) => setPre({ done, total: t, ok, stop }))
      .then((ok) => setPre({ done: total, total, ok, finished: true }))
      .catch(() => setPre(null));
  };

  const keySaved = keyDraft === apiKey && !!apiKey;
  const wxSaved = wxDraft === wxKey && !!wxKey;

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div
        style={{ ...S.modalCard, maxWidth: 420, textAlign: "left", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: -0.4, fontSize: 20, marginBottom: 14 }}>
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

        <label style={S.label}>Training</label>
        <div style={S.segRow}>
          <button
            style={{ ...S.seg, ...(!travel ? S.segActive : {}), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            onClick={() => onSetTravel(false)}
          >
            <Icon name="dumbbell" size={15} /> Full gym
          </button>
          <button
            style={{ ...S.seg, ...(travel ? S.segActive : {}), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            onClick={() => onSetTravel(true)}
          >
            <Icon name="plane" size={14} /> Weight-free
          </button>
        </div>
        <div style={{ ...S.note, marginBottom: 18 }}>
          Traveling with no gym? Weight-free mode swaps every barbell and dumbbell lift for a
          bodyweight or towel-and-chair version that trains the same movement — your runs, planks
          and push-ups carry over unchanged. It's a switch on this phone only, so it doesn't touch
          the shared plan or {plan.people.find((p) => p.id !== me)?.name || "your partner"}'s week.
          Flip it back to Full gym when you're home.
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
          <button style={{ ...S.btnGhost, padding: "10px 12px", fontSize: 12 }} onClick={() => setShowKey(!showKey)}>
            {showKey ? "Hide" : "Show"}
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

        {/* ---- the WorkoutX key (animated exercise demos) ---- */}
        <label style={{ ...S.label, marginTop: 22 }}>WorkoutX key · exercise animations</label>
        <div style={{ display: "flex", gap: 7 }}>
          <input
            type={showWx ? "text" : "password"}
            style={{ ...S.textInput, flex: 1, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
            placeholder="wx_…"
            value={wxDraft}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setWxDraft(e.target.value.trim())}
          />
          <button style={{ ...S.btnGhost, padding: "10px 12px", fontSize: 12 }} onClick={() => setShowWx(!showWx)}>
            {showWx ? "Hide" : "Show"}
          </button>
        </div>
        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 8, ...(wxSaved ? { color: ACCENT, border: `1px solid ${ACCENT}` } : {}) }}
          onClick={() => onSetWxKey(wxDraft)}
        >
          {wxSaved ? "✓ Key saved on this phone" : wxDraft ? "Save key" : wxKey ? "Remove key" : "Save key"}
        </button>
        <div style={S.note}>
          Turns the movement picture in each exercise into the <b>real animated demo</b>. The free
          plan is <b>500 requests for the lifetime of the key</b> — it never resets — so each
          animation is fetched <b>once</b> and then kept on this phone forever, including offline.
          Your whole program is about 55 of them. Without a key (or once the quota is gone) you
          simply get the photo instead — nothing else changes. Get one at workoutxapp.com.
        </div>

        {/* Fill the whole list at once instead of one-tap-at-a-time. */}
        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 10, ...(pre && !pre.finished ? { opacity: 0.7 } : {}) }}
          disabled={!wxKey || (pre && !pre.finished)}
          onClick={runPreload}
        >
          {pre
            ? pre.finished
              ? `✓ ${pre.ok} animations ready`
              : pre.stop === "rate"
                ? `Paused at ${pre.done}/${pre.total} — rate limit, try again in a minute`
                : `Loading animations… ${pre.done}/${pre.total}`
            : wxKey
              ? "Load all animations now"
              : "Add a key first to load animations"}
        </button>
        <div style={S.note}>
          Optional. Pulls every animation into this phone in one pass (~2 minutes, spends about 55
          of your requests once) so the whole workout list is animated straight away, even offline.
          Skip it and each one just loads the first time you open that exercise.
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

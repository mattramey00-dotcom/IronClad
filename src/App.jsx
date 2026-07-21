// ============================================================
//  IRONCLAD — Progressive Workout PWA
//  Two people, one garage gym, one treadmill.
//
//  The program is no longer keyed to weekdays. Each person cycles the same six
//  workouts one per training day, so splitting the calendar between two people
//  no longer amputates the program (Mon/Wed/Fri used to mean two leg days and
//  no pull day, forever). See lib/schedule.js for how the calendar is derived.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  ACCENT, DEMOS, EX_VIDEO, TOGETHER, REST_DAY, forMachine, forTravel, forSub, musclesFor, MUSCLE_LABELS,
} from "./data/program.js";
import {
  agendaFor, weekAgenda, blocksFor, exercisesFor, dateKey, mondayOf,
  personById, partnerOf, WORKOUT_SHORTS,
} from "./lib/schedule.js";
import {
  loadPlan, savePlan, loadMe, saveMe, loadProgress, saveProgress,
  loadLogs, saveLogs, migrateLegacy, encodePlan, resetEverything,
  loadMeals, saveMeals, loadWeights, saveWeights, loadTargets, saveTargets,
  loadFavMeals, saveFavMeals, loadPhotos, savePhotos, loadSubs, saveSubs, loadExtras, saveExtras,
  loadWater, saveWater, loadSupps, saveSupps, loadSuppLog, saveSuppLog,
  loadApiKey, saveApiKey, loadModel, saveModel, loadTravel, saveTravel,
  loadWxKey, saveWxKey,
  loadLastBackup, saveLastBackup, loadBackupNudge, saveBackupNudge,
  loadTheme, saveTheme, loadWeeklySeen, saveWeeklySeen,
} from "./lib/storage.js";
import { downloadBackup, backupReminderDue, monthKeyOf } from "./lib/backup.js";
import { estimateTDEE, resolveTargets, weightTrend, bestE1RM, shiftKey, daysBetween, mealTotals, weeklySummary, waterTargetOz, DEFAULT_TARGETS } from "./lib/nutrition.js";
import { MODELS, DEFAULT_MODEL } from "./lib/claude.js";
import { S } from "./styles.js";
import Demo from "./components/Demo.jsx";
import { TimerModal, VideoModal } from "./components/Modals.jsx";
import ExerciseModal from "./components/ExerciseModal.jsx";
import ExerciseGif, { preloadGifs, allGifIds } from "./components/ExerciseGif.jsx";
import Hint from "./components/Hint.jsx";
import PhotosModal from "./components/PhotosModal.jsx";
import { putPhoto, deletePhoto, compressToBlob } from "./lib/photos.js";
import Setup from "./components/Setup.jsx";
import FuelCard from "./components/FuelCard.jsx";
import TabBar from "./components/TabBar.jsx";
import RestTimer from "./components/RestTimer.jsx";
import MuscleMap from "./components/MuscleMap.jsx";
import MuscleTargetModal from "./components/MuscleTargetModal.jsx";
import WeeklySummaryModal from "./components/WeeklySummaryModal.jsx";
import CopyMealsModal from "./components/CopyMealsModal.jsx";
import Confetti from "./components/Confetti.jsx";
import Icon from "./components/Icon.jsx";

// Lazy-loaded because they're the only two screens that pull in Recharts (~150
// KB). Splitting them out keeps that weight off the first paint — you only pay
// for the charts when you open Insights or an exercise's history.
const InsightsView = lazy(() => import("./components/InsightsView.jsx"));
const HistoryModal = lazy(() => import("./components/HistoryModal.jsx"));

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
  const [subs, setSubs] = useState({});
  const [extras, setExtras] = useState({});
  const [water, setWater] = useState({});
  const [supps, setSupps] = useState([]);
  const [suppLog, setSuppLog] = useState({});
  const [photos, setPhotos] = useState([]);
  const [showPhotos, setShowPhotos] = useState(false);
  const [weights, setWeights] = useState({});
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [model, setModel] = useState(() => loadModel() || DEFAULT_MODEL);
  const [wxKey, setWxKey] = useState(() => loadWxKey());
  const [travel, setTravel] = useState(() => loadTravel());
  const [theme, setTheme] = useState(() => loadTheme());

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    setTheme(next);
  };

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
    setSubs(loadSubs(me));
    setExtras(loadExtras(me));
    setWater(loadWater(me));
    setSupps(loadSupps(me));
    setSuppLog(loadSuppLog(me));
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
      subs={subs}
      setSubs={setSubs}
      extras={extras}
      setExtras={setExtras}
      water={water}
      setWater={setWater}
      supps={supps}
      setSupps={setSupps}
      suppLog={suppLog}
      setSuppLog={setSuppLog}
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
      theme={theme}
      onToggleTheme={toggleTheme}
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
        /* native form controls don't inherit font-family — force Inter everywhere */
        button,input,select,textarea{font-family:inherit}
        ::-webkit-scrollbar{height:0;width:0}
        @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flip{0%,38%{opacity:0}50%,88%{opacity:1}100%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fuelwave{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes fuelbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .fa-wave{animation:fuelwave linear infinite;will-change:transform}
        .fa-bob{animation:fuelbob 8s ease-in-out infinite;will-change:transform}
        @media (prefers-reduced-motion: reduce){.fa-wave,.fa-bob{animation:none}}
      `}</style>
      {children}
    </div>
  );
}

function Trainer({
  plan, me, selected, setSelected, progress, setProgress, logs, setLogs,
  meals, setMeals, favMeals, setFavMeals, subs, setSubs, extras, setExtras, water, setWater,
  supps, setSupps, suppLog, setSuppLog, photos, setPhotos, showPhotos, setShowPhotos,
  weights, setWeights, targets, setTargets,
  apiKey, model, onSetApiKey, onSetModel, wxKey, onSetWxKey, travel, onSetTravel,
  openLog, setOpenLog, timer, setTimer, video, setVideo,
  showHistory, setShowHistory,
  showSettings, setShowSettings, now, theme, onToggleTheme, onSwitchPerson,
}) {
  const [tab, setTab] = useState("train");
  const [showCopyMeals, setShowCopyMeals] = useState(false); // the copy/move-a-day's-meals picker
  // The Fuel compose form — including its in-flight loading state — lives here
  // (not in FuelCard) so a web/API lookup keeps running and stays visible when
  // you switch to another tab and back, instead of restarting.
  const [fuelCompose, setFuelCompose] = useState({ mode: null, draft: null, editingId: null, text: "", busy: false, busyLabel: "Reading the plate…", error: "" });
  const [rest, setRest] = useState(null); // { id, secs, label } — the sticky rest timer
  const [restPref, setRestPref] = useState(null); // last rest length you set — remembered across sets
  const [celebrate, setCelebrate] = useState(0); // bump to fire a confetti burst
  const [showMuscleTarget, setShowMuscleTarget] = useState(false); // the tap-a-muscle picker
  const [openEx, setOpenEx] = useState(null); // { blockName, ex } — the focused exercise modal
  const fireConfetti = () => setCelebrate((c) => c + 1);
  const [lastBackup, setLastBackup] = useState(() => loadLastBackup());
  const [backupNudge, setBackupNudge] = useState(() => loadBackupNudge());
  const [backupBusy, setBackupBusy] = useState(false);
  const today = dateKey(now);
  const person = personById(plan, me);
  const other = partnerOf(plan, me);

  // ---- weekly summary ----
  // Recap of the most recently finished week (last Mon–Sun). Auto-pops once on
  // the first launch of a new week; re-openable from Insights.
  const [showWeekly, setShowWeekly] = useState(false);
  const lastWeek = useMemo(() => {
    const thisMon = mondayOf(today);
    return weeklySummary({
      meals, weights, logs,
      startKey: shiftKey(thisMon, -7),
      endKey: shiftKey(thisMon, -1),
    });
  }, [today, meals, weights, logs]);
  const weeklyCheckedFor = useRef(null);
  useEffect(() => {
    if (!me || weeklyCheckedFor.current === me) return;
    if (!lastWeek.hasActivity) return; // wait until this profile's data has loaded
    weeklyCheckedFor.current = me;
    if (lastWeek.endKey !== loadWeeklySeen(me)) setShowWeekly(true);
  }, [me, lastWeek]);
  const dismissWeekly = () => { saveWeeklySeen(me, lastWeek.endKey); setShowWeekly(false); };

  // ---- backup ----
  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const b = await downloadBackup();
      saveLastBackup(b.exportedAt);
      setLastBackup(b.exportedAt);
    } catch {
      /* the download didn't start; the button just re-enables to try again */
    } finally {
      setBackupBusy(false);
    }
  };
  const dismissBackupReminder = () => {
    const mk = monthKeyOf(now);
    saveBackupNudge(mk);
    setBackupNudge(mk);
  };
  const hasData =
    Object.keys(meals || {}).length > 0 ||
    Object.keys(weights || {}).length > 0 ||
    Object.keys(logs || {}).length > 0;
  // Distinct days of data — used to nudge a never-backed-up user once they've
  // built up enough to be worth losing, rather than waiting for month-end.
  const dataDays = (() => {
    const s = new Set([...Object.keys(meals || {}), ...Object.keys(weights || {})]);
    Object.values(logs || {}).forEach((entries) => (entries || []).forEach((e) => e?.date && s.add(e.date)));
    return s.size;
  })();
  const backupDue = backupReminderDue({ now, lastBackupISO: lastBackup, nudgedMonth: backupNudge, hasData, dataDays });

  const agenda = useMemo(() => agendaFor(plan, me, selected), [plan, me, selected]);
  const week = useMemo(() => weekAgenda(plan, me, selected), [plan, me, selected]);
  const blocks = useMemo(() => blocksFor(agenda), [agenda]);

  // Which week we're looking at, so the ‹ › nav can label it and offer a jump
  // back to today. Moving `selected` a week at a time lets you backfill or fix
  // any past day's meals, weigh-in or sets, not just the current week.
  const fmtDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weekLabel = week.length ? `${fmtDay(week[0].date)} – ${fmtDay(week[week.length - 1].date)}` : "";
  const onThisWeek = week.some((a) => a.date === today);

  // Is every prescribed movement for a given day checked off? Powers the gold
  // "done" fill + green tick on the week strip. Counts progress entries for that
  // date (ignoring bonus "Extra" accessory work) against the day's exercise
  // count, so it's robust to weight-free/substitution renaming.
  const dayDone = (date) => {
    const ag = agendaFor(plan, me, date);
    if (ag.isRest) return false;
    const need = exercisesFor(ag).length;
    if (!need) return false;
    const prefix = `${date}::`;
    let have = 0;
    for (const k in progress) {
      if (!progress[k] || !k.startsWith(prefix)) continue;
      const blk = k.slice(prefix.length).split("::")[0];
      if (blk === "Added" || blk === "Extra") continue; // accessory work, not the plan
      have++;
    }
    return have >= need;
  };
  // Count the exercises under the same weight-free lens the rows are drawn with,
  // so the progress bar tallies the moves you're actually doing today.
  const machine = agenda.machine;
  // One place resolves a raw program exercise into what you actually train:
  // your personal substitution first, then the machine you're on, then the
  // weight-free swap. Used everywhere exercises are drawn so they all agree.
  const resolveEx = useCallback(
    (raw) => forTravel(forMachine(forSub(raw, subs), machine), travel),
    [subs, machine, travel],
  );
  // The exercises in render order. Lets the exercise modal advance to the next
  // one when a set finishes an exercise.
  const flatExercises = useMemo(
    () => blocks.flatMap((b) => b.exercises.map((raw) => ({ blockName: b.name, ex: resolveEx(raw) }))),
    [blocks, resolveEx],
  );

  // The day's full list as rendered = the prescribed blocks plus anything you
  // tacked on from "Target a muscle", so the whole session is visible. Kept out
  // of flatExercises (above) so finishing an added move just closes rather than
  // jumping into the plan, and out of the progress bar / plan-done tick.
  const dayBlocks = useMemo(() => {
    const added = extras[selected] || [];
    return added.length
      ? [...blocks, { name: "Added", exercises: added, isExtra: true, note: "Accessory work you added on top of today's plan." }]
      : blocks;
  }, [blocks, extras, selected]);

  // ---- persistence ----
  const persistProgress = useCallback((next) => {
    setProgress(next);
    saveProgress(me, next);
  }, [me, setProgress]);

  const persistLogs = useCallback((next) => {
    setLogs(next);
    saveLogs(me, next);
  }, [me, setLogs]);

  // Set (or clear, with a null replacement) a personal exercise substitution.
  const swapExercise = (origName, replacement) => {
    const next = { ...subs };
    if (replacement && replacement.n) next[origName] = replacement;
    else delete next[origName];
    setSubs(next);
    saveSubs(me, next);
  };

  // Tack an accessory exercise onto the selected day (deduped by name), so it
  // shows in the day's list. Persisted the moment it's picked, before any sets.
  const persistExtras = (next) => { setExtras(next); saveExtras(me, next); };
  const addExtra = (ex) => {
    const day = extras[selected] || [];
    if (day.some((e) => e.n === ex.n)) return;
    persistExtras({ ...extras, [selected]: [...day, { n: ex.n, s: ex.s, d: ex.d }] });
  };
  const removeExtra = (name) => {
    const day = (extras[selected] || []).filter((e) => e.n !== name);
    const next = { ...extras };
    if (day.length) next[selected] = day; else delete next[selected];
    persistExtras(next);
    // Drop its completion mark too, so a removed move doesn't linger as "done".
    const k = `${selected}::Added::${name}`;
    if (progress[k]) { const p = { ...progress }; delete p[k]; persistProgress(p); }
  };

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
  // Mark an exercise done without moving on — so the row turns green (and the
  // confetti fires) the instant the last set is checked, while the modal stays
  // open on its Complete button.
  const markDone = (blockName, exName) => {
    const k = doneKey(blockName, exName);
    if (!progress[k]) persistProgress({ ...progress, [k]: true });
  };

  const completeAndAdvance = (blockName, exName) => {
    const k = doneKey(blockName, exName);
    if (!progress[k]) persistProgress({ ...progress, [k]: true });
    const idx = flatExercises.findIndex((f) => f.blockName === blockName && f.ex.n === exName);
    // idx < 0 means this wasn't one of the day's prescribed moves (e.g. targeted
    // accessory work) — just close rather than jumping into the plan.
    let next = null;
    if (idx >= 0) {
      for (let i = idx + 1; i < flatExercises.length; i++) {
        if (!isDone(flatExercises[i].blockName, flatExercises[i].ex.n)) { next = flatExercises[i]; break; }
      }
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

  // Fix a logged meal in place — a fat-fingered macro shouldn't mean delete and
  // re-add. Only the edited day is touched.
  const editMeal = (id, fields) =>
    persistMeals({
      ...meals,
      [selected]: (meals[selected] || []).map((m) => (m.id === id ? { ...m, ...fields } : m)),
    });

  // ---- favourite meals ----
  const persistFavs = (next) => { setFavMeals(next); saveFavMeals(me, next); };

  const saveFavorite = (meal) => {
    const name = (meal.name || "Meal").trim();
    // One entry per name — re-saving updates the numbers rather than piling up.
    const rest = favMeals.filter((f) => f.name.toLowerCase() !== name.toLowerCase());
    persistFavs([
      { id: `fav-${Date.now()}`, name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, sodium: meal.sodium },
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
      name: fav.name, kcal: fav.kcal, protein: fav.protein, carbs: fav.carbs, fat: fav.fat, sodium: fav.sodium,
      source: "favorite",
    });

  // Re-log any past meal from history onto the selected day, keeping its macros
  // and how it was originally logged (photo/web/etc.), timestamped now.
  const relogMeal = (m) =>
    addMeal({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toTimeString().slice(0, 5),
      name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, sodium: m.sodium,
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

  // Fix a wrong-day log: copy (or move) the whole selected day's meals onto
  // another date. Clones get fresh ids so the two days never share a meal id.
  // Moving also clears the source and jumps to the target so you can confirm.
  const copyMealsToDay = (targetKey, move) => {
    const src = meals[selected] || [];
    if (!src.length || targetKey === selected) { setShowCopyMeals(false); return; }
    const stamp = Date.now();
    const clones = src.map((m, i) => ({ ...m, id: `${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
    const next = { ...meals, [targetKey]: [...(meals[targetKey] || []), ...clones] };
    if (move) delete next[selected];
    persistMeals(next);
    setShowCopyMeals(false);
    if (move) setSelected(targetKey);
  };

  // The weigh-in lives on Insights now. It defaults to today, but its own date
  // stepper can target a past day to backfill — so this takes the day key.
  const setWeight = (key, lb) => {
    const next = { ...weights };
    if (lb == null) delete next[key];
    else next[key] = lb;
    persistWeights(next);
  };

  // Add (or subtract, to correct an overshoot) water for the selected day, in oz.
  const addWater = (deltaOz) => {
    const oz = Math.max(0, (water[selected] || 0) + deltaOz);
    const next = { ...water };
    if (oz > 0) next[selected] = oz; else delete next[selected];
    setWater(next);
    saveWater(me, next);
  };

  // ---- supplements (self-defined checklist, no advice) ----
  const addSupp = (name, dose) => {
    const n = (name || "").trim();
    if (!n) return;
    const next = [...supps, { id: `supp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: n, dose: (dose || "").trim() }];
    setSupps(next);
    saveSupps(me, next);
  };
  const removeSupp = (id) => {
    const next = supps.filter((s) => s.id !== id);
    setSupps(next);
    saveSupps(me, next);
  };
  const toggleSupp = (id) => {
    const day = suppLog[selected] || [];
    const nextDay = day.includes(id) ? day.filter((x) => x !== id) : [...day, id];
    const next = { ...suppLog };
    if (nextDay.length) next[selected] = nextDay; else delete next[selected];
    setSuppLog(next);
    saveSuppLog(me, next);
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
  const waterTarget = useMemo(() => waterTargetOz(bodyweight), [bodyweight]);

  const sessionOn = (exName, date) => (logs[exName] || []).find((e) => e.date === date) || null;
  const lastSession = (exName) =>
    (logs[exName] || []).find((e) => e.date !== selected && e.date < selected) || null;

  // A personal best: this day's best estimated 1RM for the lift beats every
  // prior session. Needs prior history — a first-ever session isn't a "PR".
  const isPR = (exName, date) => {
    const entries = logs[exName] || [];
    const todayEntry = entries.find((e) => e.date === date);
    if (!todayEntry?.sets?.length) return false;
    const todayBest = bestE1RM(todayEntry);
    if (todayBest <= 0) return false;
    const priorBest = Math.max(0, ...entries.filter((e) => e.date < date).map((e) => bestE1RM(e)));
    return priorBest > 0 && todayBest > priorBest + 0.01;
  };

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

  // Meals → CSV, for anyone who wants their nutrition data in a spreadsheet.
  // One row per logged meal; weigh-ins and workouts have their own exports.
  const exportMealsCSV = () => {
    const nz = (v) => Math.round(Number(v) || 0);
    const rows = [["date", "time", "meal", "kcal", "protein_g", "carbs_g", "fat_g", "source"]];
    Object.keys(meals).sort().forEach((date) => {
      (meals[date] || []).forEach((m) => {
        rows.push([date, m.time || "", m.name || "", nz(m.kcal), nz(m.protein), nz(m.carbs), nz(m.fat), m.source || ""]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironclad-meals-${person.name.toLowerCase().replace(/\s+/g, "-")}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // How long since the last weigh-in — for a gentle nudge on Fuel, since missed
  // weigh-ins are what quietly weaken the whole TDEE estimate.
  const lastWeighDate = Object.keys(weights).sort().pop() || null;
  const weighGap = lastWeighDate ? daysBetween(lastWeighDate, today) : null;
  const weighNudge = !weights[today] && lastWeighDate && weighGap >= 3;

  // ---- progress for the selected day ----
  // Count the exact rows that render (flatExercises = blocksFor + the same
  // resolution the rows use), so the bar can never disagree with the checkmarks
  // you see. Counting a separate exercisesFor list is what let a run — labelled
  // "Run" there but "Your ride" in the rows — read as done in the row yet never
  // tick the bar, sticking it at 9/10.
  const total = flatExercises.length;
  const complete = flatExercises.filter((f) => isDone(f.blockName, f.ex.n)).length;
  const pct = total ? (complete / total) * 100 : 0;
  const allDone = total > 0 && complete === total;

  // Confetti the moment the day flips from unfinished to fully done — however the
  // last exercise got checked (its sets in the modal, or its checkmark on the
  // list). Guarded on `selected` so navigating onto (or off) an already-finished
  // day never sets it off — only a real completion of the day you're looking at.
  const dayDoneRef = useRef({ done: allDone, day: selected });
  useEffect(() => {
    const prev = dayDoneRef.current;
    if (allDone && !prev.done && prev.day === selected) fireConfetti();
    dayDoneRef.current = { done: allDone, day: selected };
  }, [allDone, selected]);

  const resetDay = () => {
    const next = { ...progress };
    flatExercises.forEach((f) => delete next[doneKey(f.blockName, f.ex.n)]);
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
            <button
              style={{ ...S.statsBtn, padding: "7px 10px" }}
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
            <button style={{ ...S.statsBtn, padding: "7px 10px" }} onClick={() => setShowSettings(true)} aria-label="Settings">
              <Icon name="settings" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* End-of-month nudge: get a copy of your data off this phone. There's no
          server, so this file is the only way back from a cleared browser. */}
      {backupDue && (
        <div style={S.backupBanner}>
          <span style={{ color: ACCENT, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <Icon name="download" size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Back up your data</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.45, marginTop: 1 }}>
              End of the month — save a copy to this phone in case it ever gets wiped.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 0 auto" }}>
            <button style={{ ...S.btnAccent, padding: "7px 12px", fontSize: 12.5 }} onClick={exportBackup} disabled={backupBusy}>
              {backupBusy ? "Saving…" : "Export"}
            </button>
            <button style={{ ...S.btnGhost, padding: "5px 12px", fontSize: 11.5 }} onClick={dismissBackupReminder}>
              Later
            </button>
          </div>
        </div>
      )}

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

      {/* Week navigation — step back to any past week to log a missed weigh-in,
          meal or set; jump straight back to today when you've wandered off. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <button style={S.weekNav} onClick={() => setSelected(shiftKey(selected, -7))} aria-label="Previous week">‹</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--text-mute)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {onThisWeek ? "This week" : weekLabel}
          {!onThisWeek && (
            <button style={S.resetBtn} onClick={() => setSelected(today)}>today</button>
          )}
        </div>
        <button style={S.weekNav} onClick={() => setSelected(shiftKey(selected, 7))} aria-label="Next week">›</button>
      </div>

      <div style={S.weekRow}>
        {week.map((a) => {
          const active = a.date === selected;
          const yours = !a.isRest;
          const done = dayDone(a.date);
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
                ...(done ? S.weekCellDone : {}),
                ...(active ? S.weekCellActive : {}),
              }}
            >
              {done && <span style={S.weekCheck}><Icon name="check" size={10} strokeWidth={3} /></span>}
              {a.date === today && !done && <span style={S.todayDot} />}
              <div style={S.weekDow}>{DOW[a.weekday - 1]}</div>
              <div style={{ ...S.weekWorkout, color: a.trains ? ACCENT : "var(--text-mute)" }}>{label}</div>
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

          {/* Training mode — swap the whole session to a no-gym version, right
              here on the day rather than buried in Settings. Phone-only; it
              never touches the shared plan or your partner's week. */}
          {!agenda.isRest && (
            <>
              <div style={{ ...S.segRow, marginTop: 12 }}>
                <button
                  style={{ ...S.seg, ...(!travel ? S.segActive : {}), fontSize: 12, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => onSetTravel(false)}
                >
                  <Icon name="dumbbell" size={14} /> Full gym
                </button>
                <button
                  style={{ ...S.seg, ...(travel ? S.segActive : {}), fontSize: 12, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => onSetTravel(true)}
                >
                  <Icon name="plane" size={13} /> Weight-free
                </button>
              </div>
              {travel && (
                <div style={{ ...S.blockNote, marginTop: 6 }}>
                  Every barbell and dumbbell lift is swapped for a bodyweight version that trains the same
                  movement — your runs and planks carry over. This phone only; it doesn't touch {other.name}'s week.
                </div>
              )}
            </>
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

      {/* Target a muscle — a blown-up, tappable body map for adding accessory
          work on top of the day's plan. */}
      <button
        style={{ ...S.btnGhost, width: "100%", marginTop: 2, marginBottom: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        onClick={() => setShowMuscleTarget(true)}
      >
        <Icon name="stretch" size={16} style={{ color: ACCENT }} />
        <span><span style={{ color: "var(--text-dim)", fontWeight: 400 }}>Optional · </span>Add a target muscle group for today</span>
      </button>

      {(agenda.trains || blocks.length > 0) && (
        <Hint id="train">
          Tap any exercise to open it — check off each set as you finish, a rest timer runs
          between sets, and planks get a stopwatch. The last set checks the whole exercise off.
        </Hint>
      )}

      {/* Blocks — the prescribed plan, plus any accessory work you added */}
      {dayBlocks.map((block, bi) => (
        <div key={bi} style={S.block}>
          <div style={{ ...S.blockName, ...(block.isTogether || block.isExtra ? S.blockNameTogether : {}), display: "flex", alignItems: "center", gap: 6 }}>
            {block.isTogether && <Icon name="sparkle" size={12} />}
            {block.isExtra && <Icon name="plus" size={12} />}
            {block.isTogether ? `${block.name} · with ${other.name}` : block.name}
          </div>
          {(block.isTogether || block.isRecovery || block.isExtra) && (
            <div style={S.blockNote}>{block.note}</div>
          )}

          {block.exercises.map((raw, ei) => {
            const ex = resolveEx(raw);
            const done = isDone(block.name, ex.n);
            const tSession = sessionOn(ex.n, selected);
            const pr = isPR(ex.n, selected);
            const muscles = musclesFor(ex);
            const full = muscles.includes("fullbody");
            return (
              <div
                key={ei}
                style={{
                  ...S.exRow,
                  ...(block.isTogether ? S.exRowTogether : {}),
                  ...(done ? S.exRowDone : {}),
                  ...(block.isExtra ? S.exRowExtra : {}),
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
                    <div style={{ ...S.exName, ...(done ? { textDecoration: "line-through", color: "#6f9c82" } : {}) }}>
                      {ex.n}
                      {pr && <span style={S.prBadge}><Icon name="star" size={10} /> PR</span>}
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
                {block.isExtra && (
                  <button
                    onClick={() => removeExtra(ex.n)}
                    style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px 6px 4px 2px", fontSize: 17, fontFamily: "inherit", lineHeight: 1 }}
                    aria-label={`Remove ${ex.n} from today`}
                    title="Remove from today"
                  >
                    ×
                  </button>
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
        {weighNudge && (
          <div style={{ ...S.backupBanner, background: "rgba(224,180,74,.07)", borderColor: "rgba(224,180,74,.28)" }}>
            <span style={{ color: "#E0B44A", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <Icon name="scale" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 }}>
              {weighGap} days since your last weigh-in. A quick one this morning keeps your TDEE and trend honest.
            </div>
            {selected !== today && (
              <button style={{ ...S.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => { setSelected(today); }}>
                Today
              </button>
            )}
          </div>
        )}
        <div style={S.fuelDayHead}>
          {selected === today ? "Today" : DOW[agenda.weekday - 1]}
          <span style={{ color: "var(--text-faint)" }}>· {selected.slice(5).replace("-", "/")}</span>
          {agenda.isRest && <span style={{ color: "var(--text-faint)" }}>· rest day</span>}
        </div>
        <FuelCard
          meals={meals[selected]}
          allMeals={meals}
          today={today}
          targets={resolvedTargets}
          apiKey={apiKey}
          model={model}
          restMode={agenda.isRest}
          favorites={favMeals}
          water={water[selected] || 0}
          waterTarget={waterTarget}
          onAddWater={addWater}
          supps={supps}
          suppTaken={suppLog[selected] || []}
          onAddSupp={addSupp}
          onRemoveSupp={removeSupp}
          onToggleSupp={toggleSupp}
          compose={fuelCompose}
          setCompose={setFuelCompose}
          onAddMeal={addMeal}
          onRemoveMeal={removeMeal}
          onEditMeal={editMeal}
          onRelogMeal={relogMeal}
          onLogFavorite={logFavorite}
          onSaveFavorite={saveFavorite}
          onRemoveFavorite={removeFavorite}
          onOpenInsights={() => setTab("insights")}
          onCopyDay={() => setShowCopyMeals(true)}
        />
      </>
      )}

      {showCopyMeals && (
        <CopyMealsModal
          sourceKey={selected}
          allMeals={meals}
          today={today}
          onSubmit={copyMealsToDay}
          onClose={() => setShowCopyMeals(false)}
        />
      )}

      {/* ============ INSIGHTS ============ */}
      {tab === "insights" && (
        <Suspense fallback={<div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>Loading insights…</div>}>
          <InsightsView
            meals={meals}
            weights={weights}
            logs={logs}
            targets={targets}
            today={today}
            who={person.name}
            apiKey={apiKey}
            model={model}
            theme={theme}
            onSetTargets={persistTargets}
            onOpenPhotos={() => setShowPhotos(true)}
            onOpenWeekly={() => setShowWeekly(true)}
            onWeigh={setWeight}
            water={water}
            waterTarget={waterTarget}
          />
        </Suspense>
      )}

      {openEx && (
        <ExerciseModal
          key={`${openEx.blockName}::${openEx.ex.n}`}
          ex={openEx.ex}
          blockName={openEx.blockName}
          isDone={isDone(openEx.blockName, openEx.ex.n)}
          todaySession={sessionOn(openEx.ex.n, selected)}
          lastSession={lastSession(openEx.ex.n)}
          pr={isPR(openEx.ex.n, selected)}
          origName={openEx.ex._orig || openEx.ex.n}
          subbed={!!openEx.ex._sub}
          onSwap={(rep) => { swapExercise(openEx.ex._orig || openEx.ex.n, rep); setOpenEx(null); }}
          muscles={musclesFor(openEx.ex)}
          video={EX_VIDEO[openEx.ex.n]}
          rest={rest}
          restPref={restPref}
          onSetRestPref={setRestPref}
          onCloseRest={() => setRest(null)}
          wxKey={wxKey}
          onLogSet={logSet}
          onStartRest={startRest}
          onStartTimer={(seconds, label) => setTimer({ seconds, label })}
          onOpenVideo={(e) => setVideo({ video: EX_VIDEO[e.n], name: e.n })}
          onMarkDone={markDone}
          onCelebrate={fireConfetti}
          onComplete={completeAndAdvance}
          onClose={() => setOpenEx(null)}
        />
      )}
      {showMuscleTarget && (
        <MuscleTargetModal
          onPickExercise={(ex) => { addExtra(ex); setShowMuscleTarget(false); setOpenEx({ blockName: "Added", ex }); }}
          onClose={() => setShowMuscleTarget(false)}
        />
      )}
      {showWeekly && (
        <WeeklySummaryModal
          summary={lastWeek}
          who={person.name}
          onAddPhoto={() => { dismissWeekly(); setShowPhotos(true); }}
          onClose={dismissWeekly}
        />
      )}
      {timer && <TimerModal seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />}
      {video && <VideoModal video={video.video} name={video.name} onClose={() => setVideo(null)} />}
      {showHistory && (
        <Suspense fallback={null}>
          <HistoryModal
            logs={logs}
            exercises={loggedExercises}
            who={person.name}
            theme={theme}
            onClose={() => setShowHistory(false)}
            onExport={exportCSV}
          />
        </Suspense>
      )}
      {showSettings && (
        <SettingsModal
          plan={plan}
          me={me}
          apiKey={apiKey}
          model={model}
          wxKey={wxKey}
          onSetWxKey={onSetWxKey}
          onSetApiKey={onSetApiKey}
          onSetModel={onSetModel}
          onSwitchPerson={onSwitchPerson}
          onExportBackup={exportBackup}
          onExportMealsCSV={exportMealsCSV}
          backupBusy={backupBusy}
          lastBackup={lastBackup}
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
          onSetDuration={setRestPref}
          onClose={() => setRest(null)}
        />
      )}

      <TabBar tab={tab} setTab={setTab} />
      <Confetti trigger={celebrate} />
    </Shell>
  );
}

// ---- what your partner is doing today -------------------------------
function PartnerCard({ agenda, other }) {
  const p = agenda.partner;
  let what;
  if (agenda.isRest) what = "Off today as well — the gym stays shut";
  else if (p.trains) what = `${p.workout.title} · cardio on the ${p.machine}`;
  else if (p.runs) what = `Out for a ${p.machine === "bike" ? "ride" : "run"} · on the ${p.machine}`;
  else what = "Mobility — walking and stretching";

  const partnerIcon = p.trains ? "dumbbell" : p.runs ? "run" : agenda.isRest ? "moon" : "stretch";

  return (
    <div style={S.partnerCard}>
      <div style={{ ...S.demoWrap, width: 34, height: 34, color: "var(--text-mute)" }}>
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
function SettingsModal({ plan, me, apiKey, model, wxKey, onSetWxKey, onSetApiKey, onSetModel, onSwitchPerson, onExportBackup, onExportMealsCSV, backupBusy, lastBackup, onClose }) {
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
        <div style={{ ...S.modalTitle, marginBottom: 14 }}>
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
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginBottom: 4 }}>
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
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 400, marginTop: 2 }}>{m.cost}</div>
            </button>
          ))}
        </div>
        <div style={S.note}>
          Portion size is the hardest part of reading a plate, and it's where the cheaper model
          gives up the most. Given the estimate is already ±20–30%, Opus is the one worth paying for.
        </div>

        {/* Backup — the only way back from a cleared phone, since nothing is
            stored off-device. Restore lives on the first-run setup screen. */}
        <label style={{ ...S.label, marginTop: 20 }}>Back up your data</label>
        <button
          style={{ ...S.btnGhost, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          onClick={onExportBackup}
          disabled={backupBusy}
        >
          <Icon name="download" size={15} /> {backupBusy ? "Saving…" : "Export a backup to this phone"}
        </button>
        <div style={S.note}>
          Saves everything on this phone — plan, logs, meals, weigh-ins, saved meals and photos — to a
          file you keep. If this phone ever gets wiped, load that file on the setup screen to get it all
          back. {lastBackup ? `Last export ${new Date(lastBackup).toLocaleDateString()}.` : "Not backed up yet."}
        </div>

        <button
          style={{ ...S.btnGhost, width: "100%", marginTop: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          onClick={onExportMealsCSV}
        >
          <Icon name="chart" size={15} /> Export meals to a spreadsheet (CSV)
        </button>
        <div style={S.note}>
          Just your meals, one row each, for a spreadsheet. Workout sets have their own CSV on the
          Progress screen; a full backup (above) is the one that can restore the app.
        </div>

        <button
          style={{
            ...S.btnGhost, width: "100%", marginTop: 18,
            border: `1px solid ${confirmReset ? "#5a2a2a" : "var(--border-hi)"}`,
            color: confirmReset ? "#ff7a7a" : "var(--text-mute)",
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

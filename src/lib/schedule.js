// ============================================================
//  IRONCLAD — the two-person scheduler
// ============================================================
//  Everything in here is a pure function of (plan, date). Nothing is stored,
//  nothing is synced. Both phones hold the same plan config and therefore
//  compute the *identical* calendar — which is how your app can show you what
//  your partner is doing this week without a backend, an account, or a network.
//
//  The consequence of deriving rather than storing: the schedule is driven by
//  the date, not by what you've completed. Skip a Wednesday and that workout
//  comes back around next cycle rather than shifting everything one slot. That
//  is the price of both phones agreeing without ever talking to each other.
//
//  What it works out:
//    1. Who trains on which weekday (A = Mon/Wed/Fri, B = Tue/Thu/Sat),
//       swapping every week.
//    2. Which of the 6 workouts each of you gets, from a rotation ordered so a
//       hard leg day never follows a hard run.
//    3. Which off days you run on — never the day before a leg day.
//    4. Who is on the treadmill and who is on the bike, any day you overlap.
//    5. Which two days a week carry the machine-free Together core block.
// ============================================================

import {
  WORKOUTS, WORKOUT_BY_ID, OFF_DAY_CARDIO, MOBILITY, TOGETHER, EQ,
} from "../data/program.js";

export const WORKOUT_SHORTS = Object.fromEntries(WORKOUTS.map((w) => [w.id, w.short]));

// ---- date helpers -------------------------------------------------
// Dates are handled as local "YYYY-MM-DD" keys and converted to an integer
// day number for arithmetic. Using UTC *only* inside the conversion keeps the
// arithmetic free of DST landmines while the keys stay local-calendar correct.

export const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const dayNum = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

export const keyFromDayNum = (n) => {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

// ISO weekday: Monday = 1 … Sunday = 7. (1970-01-01 was a Thursday.)
export const isoWeekday = (key) => (((dayNum(key) + 3) % 7) + 7) % 7 + 1;

export const addDays = (key, n) => keyFromDayNum(dayNum(key) + n);

// The Monday on or before a date — used to anchor the plan to a week boundary.
export const mondayOf = (key) => addDays(key, -(isoWeekday(key) - 1));

// ---- plan ---------------------------------------------------------

export const SCHEDULE_A = [1, 3, 5]; // Mon / Wed / Fri
export const SCHEDULE_B = [2, 4, 6]; // Tue / Thu / Sat
// Sunday (7) belongs to neither — you both rest.

export function makePlan({ anchor, you, partner, youStart = "A", offDayRuns = 2 }) {
  return {
    version: 1,
    anchor: mondayOf(anchor), // week 0 always begins on a Monday
    swapWeekly: true,
    schedules: { A: SCHEDULE_A, B: SCHEDULE_B },
    people: [
      { id: "p1", name: you, start: youStart },
      { id: "p2", name: partner, start: youStart === "A" ? "B" : "A" },
    ],
    rotation: autoOrderRotation(),
    offDayRuns, // runs per person per week; 0 turns off-day cardio off
    together: true,
  };
}

export const personById = (plan, id) => plan.people.find((p) => p.id === id);
export const partnerOf = (plan, id) => plan.people.find((p) => p.id !== id);

// ---- rotation ordering --------------------------------------------
//  Order the six workouts so that, as one person cycles them one per training
//  day, the sequence respects recovery. Only 720 permutations, so we score all
//  of them and take the best rather than hand-tuning an order that quietly
//  breaks the next time someone edits the program.
//
//  The sequence is cyclic — the last workout is followed by the first — so the
//  wrap-around pair is scored too. That matters: a naive order can look clean
//  in a list and still put a squat day right after interval day every 6th
//  session.

function permutations(items) {
  if (items.length <= 1) return [items];
  const out = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    permutations(rest).forEach((p) => out.push([item, ...p]));
  });
  return out;
}

export function scoreOrder(ids) {
  const w = ids.map((id) => WORKOUT_BY_ID[id]);
  let penalty = 0;
  for (let i = 0; i < w.length; i++) {
    const a = w[i];
    const b = w[(i + 1) % w.length]; // cyclic — the wrap matters
    // A hard leg day the session after a hard run. This is the rule that
    // started all of this, so it carries the most weight.
    penalty += 3 * b.load.leg * a.load.run;
    // Two leg-dominant sessions back to back.
    penalty += 2 * a.load.leg * b.load.leg;
    // Two upper-dominant sessions back to back — mild; we just prefer to
    // alternate upper and lower rather than clump them.
    penalty += 1 * a.load.upper * b.load.upper;
  }
  return penalty;
}

export function autoOrderRotation() {
  const ids = WORKOUTS.map((w) => w.id);
  let best = null;
  let bestScore = Infinity;
  for (const p of permutations(ids)) {
    // A cyclic order has 6 rotations that are all the same cycle; pin the
    // first slot so the winner is stable and reproducible on both phones.
    if (p[0] !== ids[0]) continue;
    const s = scoreOrder(p);
    if (s < bestScore || (s === bestScore && p.join() < best.join())) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

// ---- who trains when ----------------------------------------------

// Week 0 is the anchor week. Dates before the anchor are outside the plan.
export function weekIndex(plan, key) {
  return Math.floor((dayNum(key) - dayNum(plan.anchor)) / 7);
}

const flip = (letter) => (letter === "A" ? "B" : "A");

// The A/B swap: you start on your letter and trade every week.
export function scheduleLetter(plan, person, wIdx) {
  if (!plan.swapWeekly) return person.start;
  const odd = ((wIdx % 2) + 2) % 2 === 1;
  return odd ? flip(person.start) : person.start;
}

export function trainsOn(plan, person, key) {
  const wIdx = weekIndex(plan, key);
  if (wIdx < 0) return false;
  const letter = scheduleLetter(plan, person, wIdx);
  return plan.schedules[letter].includes(isoWeekday(key));
}

// How many training days this person has had since the anchor, up to but not
// including `key`. That count, mod the rotation length, is their workout.
function trainingDaysBefore(plan, person, key) {
  const start = dayNum(plan.anchor);
  const target = dayNum(key);
  if (target < start) return null;
  const fullWeeks = Math.floor((target - start) / 7);
  const dayInWeek = target - start - fullWeeks * 7; // 0 = Monday

  let count = 0;
  for (let w = 0; w < fullWeeks; w++) {
    count += plan.schedules[scheduleLetter(plan, person, w)].length;
  }
  const thisWeek = plan.schedules[scheduleLetter(plan, person, fullWeeks)];
  count += thisWeek.filter((wd) => wd - 1 < dayInWeek).length;
  return count;
}

// The workout this person is assigned on a given date (null if they don't train).
export function workoutOn(plan, person, key) {
  if (isoWeekday(key) === 7) return null; // Sunday — both rest
  if (!trainsOn(plan, person, key)) return null;
  const n = trainingDaysBefore(plan, person, key);
  if (n == null) return null;
  const rot = plan.rotation;
  return WORKOUT_BY_ID[rot[((n % rot.length) + rot.length) % rot.length]];
}

// The person's next training date strictly after `key` (searches a fortnight).
function nextTrainingDay(plan, person, key) {
  for (let i = 1; i <= 14; i++) {
    const k = addDays(key, i);
    if (trainsOn(plan, person, k)) return k;
  }
  return null;
}

// ---- off-day cardio ------------------------------------------------
//  "Make it so the hardest leg day isn't the day after one of us is running."
//
//  Because you two alternate days, EVERY off day is followed by a training
//  day — so if you ran on every off day, every leg day would land the morning
//  after a run and the rule would be unsatisfiable. Hence: a fixed number of
//  runs per week (2 by default), placed only on off days that are NOT
//  immediately followed by a leg-dominant session.

export function offDayRunsInWeek(plan, person, wIdx) {
  const quota = plan.offDayRuns ?? 0;
  if (quota <= 0 || wIdx < 0) return [];
  const weekStart = addDays(plan.anchor, wIdx * 7);
  const candidates = [];

  for (let i = 0; i < 6; i++) {
    // Mon–Sat; Sunday is a true rest day for both
    const k = addDays(weekStart, i);
    if (trainsOn(plan, person, k)) continue; // you lift that day, no extra run

    const next = nextTrainingDay(plan, person, k);
    if (next && dayNum(next) === dayNum(k) + 1) {
      const w = workoutOn(plan, person, next);
      if (w && w.load.leg >= 2) continue; // running the day before a leg day — skip
    }
    candidates.push(k);
  }
  return candidates.slice(0, quota);
}

export function runsOn(plan, person, key) {
  const wIdx = weekIndex(plan, key);
  if (wIdx < 0) return false;
  return offDayRunsInWeek(plan, person, wIdx).includes(key);
}

// ---- machine assignment --------------------------------------------
//  One treadmill, one bike. On a day where one of you is lifting (every
//  workout has a cardio block) and the other is out for their run, the person
//  whose session is genuinely a *run* gets the treadmill; the other takes the
//  bike, which is why the bike prescriptions exist at all.

const RUN_DEMAND_OF_AN_OFF_DAY_RUN = 2;

export function machineFor(plan, person, key) {
  const workout = workoutOn(plan, person, key);
  const running = runsOn(plan, person, key);
  if (!workout && !running) return null;

  const other = partnerOf(plan, person.id);
  const otherWorkout = workoutOn(plan, other, key);
  const otherRunning = runsOn(plan, other, key);
  const otherNeedsMachine = !!otherWorkout || otherRunning;

  if (!otherNeedsMachine) return "treadmill"; // gym's all yours

  const myDemand = running ? RUN_DEMAND_OF_AN_OFF_DAY_RUN : workout.load.run;
  const theirDemand = otherRunning ? RUN_DEMAND_OF_AN_OFF_DAY_RUN : otherWorkout.load.run;

  if (myDemand > theirDemand) return "treadmill";
  if (myDemand < theirDemand) return "bike";
  // Tied demand — break it deterministically so both phones agree.
  return person.id < other.id ? "treadmill" : "bike";
}

// ---- the Together block ---------------------------------------------
//  Two days a week, both of you are in the gym: one lifts, the other joins for
//  the core block. It's bodyweight and light dumbbells — the only work in the
//  program that doesn't contend for a machine.
//
//  We host it on one day of each person's week so the favor is even, and never
//  on a Legs day, which already carries its own core block.

export function togetherDaysInWeek(plan, wIdx) {
  if (!plan.together || wIdx < 0) return [];
  const weekStart = addDays(plan.anchor, wIdx * 7);
  // Prefer mid- and end-of-week; fall back through the rest of the days.
  const preference = [2, 5, 0, 3, 1, 4]; // Wed, Sat, Mon, Thu, Tue, Fri
  const picked = [];
  const hostsUsed = new Set();

  for (const pass of [1, 2]) {
    for (const offset of preference) {
      if (picked.length >= 2) break;
      const k = addDays(weekStart, offset);
      if (picked.includes(k)) continue;

      const host = plan.people.find((p) => trainsOn(plan, p, k));
      if (!host) continue;
      const w = workoutOn(plan, host, k);
      if (!w || w.hasCore) continue; // Legs day already has core — don't double it
      // First pass: one day per person, so you each host once.
      if (pass === 1 && hostsUsed.has(host.id)) continue;

      picked.push(k);
      hostsUsed.add(host.id);
    }
  }
  return picked.sort((a, b) => dayNum(a) - dayNum(b));
}

export function togetherOn(plan, key) {
  return togetherDaysInWeek(plan, weekIndex(plan, key)).includes(key);
}

// ---- the agenda ------------------------------------------------------
//  Everything one person is doing on one date, plus what their partner is up
//  to. This is the single thing the UI reads.

export function agendaFor(plan, personId, key) {
  const person = personById(plan, personId);
  const other = partnerOf(plan, personId);
  const wIdx = weekIndex(plan, key);

  // Sunday is the one day the two of you are off together. Nothing is
  // scheduled on it — not a workout, not a run, not the core block. The
  // functions below already exclude it; this is the belt to their braces.
  const isRest = isoWeekday(key) === 7;

  const workout = isRest ? null : workoutOn(plan, person, key);
  const running = !isRest && runsOn(plan, person, key);
  const machine = isRest ? null : machineFor(plan, person, key);
  const together = !isRest && togetherOn(plan, key);

  // Every day from Monday to Saturday carries something. If you're not lifting
  // and not running, the day takes active recovery instead of standing empty —
  // Sunday is the only blank day in the week.
  const recovering = !isRest && !workout && !running;

  const otherWorkout = isRest ? null : workoutOn(plan, other, key);
  const otherRuns = !isRest && runsOn(plan, other, key);

  return {
    date: key,
    weekday: isoWeekday(key),
    weekIndex: wIdx,
    beforePlan: wIdx < 0,
    person,
    isRest,
    workout,
    trains: !!workout,
    // Your off-day run, on whichever machine your partner left you.
    run: running && machine ? { ...OFF_DAY_CARDIO[machine], machine } : null,
    // The off day that can't take a run, because a leg day follows it.
    recovery: recovering ? MOBILITY : null,
    machine,
    // The core block you do side by side. On a day you're not lifting, this is
    // the reason you're still in the gym.
    together: together ? TOGETHER : null,
    partner: {
      person: other,
      workout: otherWorkout,
      trains: !!otherWorkout,
      runs: otherRuns,
      recovers: !isRest && !otherWorkout && !otherRuns,
      machine: isRest ? null : machineFor(plan, other, key),
    },
  };
}

// The full week both of you are having, for the week strip.
export function weekAgenda(plan, personId, key) {
  const start = mondayOf(key);
  return Array.from({ length: 7 }, (_, i) => agendaFor(plan, personId, addDays(start, i)));
}

// Every exercise you're accountable for on a date — the workout you're
// assigned, plus the Together block, plus your off-day run. This is what the
// progress bar and the checkmarks count. On the shared rest day it is empty
// by design: nothing to complete means nothing left unfinished.
export function exercisesFor(agenda) {
  const out = [];
  if (agenda.isRest) return out;
  if (agenda.trains) {
    agenda.workout.blocks.forEach((b) =>
      b.exercises.forEach((e) => out.push({ ...e, block: b.name }))
    );
  }
  if (agenda.run) out.push({ ...agenda.run, block: "Run" });
  if (agenda.recovery) {
    agenda.recovery.exercises.forEach((e) => out.push({ ...e, block: MOBILITY.name }));
  }
  if (agenda.together) {
    agenda.together.exercises.forEach((e) => out.push({ ...e, block: TOGETHER.name }));
  }
  return out;
}

// The blocks to render for a date, machine-resolved.
export function blocksFor(agenda) {
  const blocks = [];
  if (agenda.isRest) return blocks;
  if (agenda.trains) blocks.push(...agenda.workout.blocks);
  if (agenda.run) {
    blocks.push({
      name: agenda.run.machine === "bike" ? "Your ride" : "Your run",
      exercises: [agenda.run],
    });
  }
  if (agenda.recovery) {
    blocks.push({ ...MOBILITY, isRecovery: true });
  }
  if (agenda.together) {
    blocks.push({ ...TOGETHER, isTogether: true });
  }
  return blocks;
}

export { EQ };

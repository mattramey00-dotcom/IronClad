// ============================================================
//  IRONCLAD — interval-run math
// ============================================================
//  The pure part of components/IntervalTimer.jsx, kept here so it can be tested:
//  given a running run ({ stageIdx, endAt }), the clock, and each stage's length
//  in seconds, where does the run stand now?
//
//  Time is wall-clock, so this has to cope with the phone having been locked
//  through one or more whole stages: it walks forward past every stage that has
//  already ended, each next stage starting the instant the last one ran out.
// ============================================================

// → { run, advanced, finished }
//    run       the run as it stands now (null once finished)
//    advanced  true if it moved into a later stage
//    finished  true if the last stage has ended
export function advanceRun(run, now, durations) {
  if (!run || now < run.endAt) return { run, advanced: false, finished: false };
  let { stageIdx, endAt } = run;
  while (now >= endAt && stageIdx + 1 < durations.length) {
    stageIdx += 1;
    endAt += (durations[stageIdx] || 0) * 1000;
  }
  if (now >= endAt) return { run: null, advanced: stageIdx !== run.stageIdx, finished: true };
  return { run: { stageIdx, endAt }, advanced: true, finished: false };
}

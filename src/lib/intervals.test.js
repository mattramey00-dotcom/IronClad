import { describe, it, expect } from "vitest";
import { advanceRun } from "./intervals.js";

// A Sprint 30s / Walk 90s round, started at t = 0.
const DUR = [30, 90];
const started = { stageIdx: 0, endAt: 30_000 };

describe("advanceRun", () => {
  it("does nothing while the current stage is still running", () => {
    expect(advanceRun(started, 10_000, DUR)).toEqual({ run: started, advanced: false, finished: false });
  });

  it("does nothing when idle", () => {
    expect(advanceRun(null, 99_000, DUR)).toEqual({ run: null, advanced: false, finished: false });
  });

  it("moves to the walk the moment the sprint ends, timed from the sprint's end", () => {
    const step = advanceRun(started, 30_000, DUR);
    expect(step).toEqual({ run: { stageIdx: 1, endAt: 120_000 }, advanced: true, finished: false });
  });

  it("catches up after a locked phone, landing mid-walk on the right clock", () => {
    // Locked from 10s to 70s: the sprint ended at 30s, so the walk is 40s in.
    const step = advanceRun(started, 70_000, DUR);
    expect(step.run).toEqual({ stageIdx: 1, endAt: 120_000 });
    expect(step.finished).toBe(false);
  });

  it("finishes when the last stage ends", () => {
    expect(advanceRun({ stageIdx: 1, endAt: 120_000 }, 120_000, DUR)).toEqual({ run: null, advanced: false, finished: true });
  });

  it("finishes the whole round if the phone was locked straight through it", () => {
    expect(advanceRun(started, 500_000, DUR)).toEqual({ run: null, advanced: true, finished: true });
  });

  it("handles a single-stage run (a 10-minute walk)", () => {
    const walk = { stageIdx: 0, endAt: 600_000 };
    expect(advanceRun(walk, 599_000, [600]).finished).toBe(false);
    expect(advanceRun(walk, 600_000, [600]).finished).toBe(true);
  });
});

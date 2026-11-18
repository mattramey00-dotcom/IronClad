import { describe, it, expect } from "vitest";
import { rollSelected, dateKey, makePlan, agendaFor, blocksFor, addDays } from "./schedule.js";
import { rotatingAccessory, HOME_LIBRARY, LIBRARY } from "../data/program.js";

describe("rollSelected (midnight rollover)", () => {
  it("follows along to the new day when you were on today", () => {
    expect(rollSelected("2026-10-13", "2026-10-13", "2026-10-14")).toBe("2026-10-14");
  });

  it("leaves a past day you browsed to alone", () => {
    expect(rollSelected("2026-10-09", "2026-10-13", "2026-10-14")).toBe("2026-10-09");
  });

  it("does nothing when the date hasn't changed", () => {
    expect(rollSelected("2026-10-13", "2026-10-13", "2026-10-13")).toBe("2026-10-13");
  });

  it("keys dates in local time as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("rotating accessory", () => {
  const plan = makePlan({ anchor: "2026-11-16", you: "Matt", partner: "Jacque" });

  it("swaps one regular exercise out — the day never gets longer", () => {
    const homeNames = new Set(HOME_LIBRARY.map((e) => e.n));
    let lifting = 0;
    let swapDays = 0;
    for (let i = 0; i < 28; i++) {
      const key = addDays("2026-11-16", i);
      for (const p of plan.people) {
        const ag = agendaFor(plan, p.id, key);
        if (ag.isRest) expect(ag.rotating).toBeNull();
        if (!ag.trains) continue;
        lifting++;
        const rawCount = ag.workout.blocks.reduce((a, b) => a + b.exercises.length, 0);
        const shown = blocksFor(ag).filter((b) => ag.workout.blocks.some((wb) => wb.name === b.name));
        const shownCount = shown.reduce((a, b) => a + b.exercises.length, 0);
        expect(shownCount).toBe(rawCount); // a swap, never an addition
        const swapped = shown.flatMap((b) => b.exercises).filter((e) => e.rotating);
        expect(swapped.length).toBeLessThanOrEqual(1);
        if (swapped.length) {
          swapDays++;
          expect(swapped[0].n).toBe(ag.rotating.n);
          expect(homeNames.has(swapped[0].n)).toBe(true);
        }
        // The finisher is never the swap target.
        const last = shown[shown.length - 1];
        expect(last.exercises.some((e) => e.rotating)).toBe(false);
      }
    }
    expect(lifting).toBeGreaterThan(0);
    // Most lifting days do get their swap — a week with no reasonable match
    // is the exception, not the rule.
    expect(swapDays).toBeGreaterThan(lifting / 2);
  });

  it("never swaps out the day's opening lift (non-circuit workouts)", () => {
    for (let i = 0; i < 56; i++) {
      const key = addDays("2026-11-16", i);
      for (const p of plan.people) {
        const ag = agendaFor(plan, p.id, key);
        if (!ag.trains || ag.workout.blocks[0].circuit) continue;
        const opener = ag.workout.blocks[0].exercises[0].n;
        const names = blocksFor(ag)[0].exercises.map((e) => e.n);
        expect(names[0]).toBe(opener);
      }
    }
  });

  it("never schedules a cable, machine or pull-up-bar move, in any week", () => {
    const banned = new Set(LIBRARY.map((e) => e.n).filter((n) => !HOME_LIBRARY.some((h) => h.n === n)));
    for (let w = -10; w < 60; w++) {
      for (const id of ["push", "pull", "legs", "upper", "lower", "full"]) {
        const pick = rotatingAccessory(id, w);
        expect(pick).not.toBeNull();
        expect(banned.has(pick.n)).toBe(false);
      }
    }
  });

  it("steps to a different move as the weeks pass", () => {
    const picks = new Set();
    for (let w = 0; w < 6; w++) picks.add(rotatingAccessory("push", w).n);
    expect(picks.size).toBeGreaterThan(1);
  });
});

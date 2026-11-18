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

  it("deals a home-gym move into every lifting day, and nothing on rest days", () => {
    const homeNames = new Set(HOME_LIBRARY.map((e) => e.n));
    let lifting = 0;
    for (let i = 0; i < 28; i++) {
      const key = addDays("2026-11-16", i);
      for (const p of plan.people) {
        const ag = agendaFor(plan, p.id, key);
        if (ag.isRest) expect(ag.rotating).toBeNull();
        if (ag.trains) {
          lifting++;
          expect(ag.rotating).not.toBeNull();
          expect(homeNames.has(ag.rotating.n)).toBe(true);
          const blocks = blocksFor(ag);
          const rb = blocks.find((b) => b.isRotating);
          expect(rb.exercises[0].n).toBe(ag.rotating.n);
          // The finisher still closes the workout blocks.
          expect(blocks.indexOf(rb)).toBe(ag.workout.blocks.length - 1);
        }
      }
    }
    expect(lifting).toBeGreaterThan(0);
  });

  it("never schedules a cable or machine move, in any week", () => {
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

import { describe, it, expect } from "vitest";
import { prescription, forMachine, forTravel, rowerSwap, WORKOUTS, TOGETHER, MOBILITY, OFF_DAY_CARDIO } from "./program.js";

describe("prescription", () => {
  it("rests by intensity: heavy 2:30, moderate 1:30, light 1:00", () => {
    expect(prescription("5 × 5").restSecs).toBe(150);
    expect(prescription("4 × 6–8").restSecs).toBe(150);
    expect(prescription("3 × 8–12").restSecs).toBe(90);
    expect(prescription("3 × 12–15").restSecs).toBe(60);
  });
  it("reads AMRAP as sets with no rep target", () => {
    expect(prescription("3 × AMRAP")).toEqual({ sets: 3, lowReps: null, restSecs: 90 });
  });
  it("returns null for cardio and bare-rep schemes", () => {
    expect(prescription("10 minutes")).toBeNull();
    expect(prescription("12 reps")).toBeNull();
  });
});

describe("forMachine", () => {
  it("gives a bike ride its own timer when the duration differs", () => {
    const push = WORKOUTS.find((w) => w.id === "push");
    const walk = push.blocks.find((b) => b.name === "Finisher").exercises[0];
    expect(forMachine(walk, "bike").timer).toBe(720);
    expect(forMachine(walk, "treadmill").timer).toBe(600);
  });
  it("resolves the water rower the same way", () => {
    const push = WORKOUTS.find((w) => w.id === "push");
    const walk = push.blocks.find((b) => b.name === "Finisher").exercises[0];
    const row = forMachine(walk, "rower");
    expect(row.n).toBe("Steady row");
    expect(row.timer).toBe(720);
  });
});

describe("rowerSwap", () => {
  it("offers the off-day row for the off-day run and ride", () => {
    expect(rowerSwap(OFF_DAY_CARDIO.treadmill).n).toBe("Easy row");
    expect(rowerSwap(OFF_DAY_CARDIO.bike).n).toBe("Easy row");
  });
  it("is null on the rower itself and on non-cardio", () => {
    expect(rowerSwap(OFF_DAY_CARDIO.rower)).toBeNull();
    expect(rowerSwap({ n: "Plank", s: "3 × 45–60 sec", d: "core" })).toBeNull();
  });
});

// The bug class that started this: an exercise whose scheme the set tracker
// can't read, and that has no timer either, opens with no set circles and no
// rest clock. Every exercise outside a circuit (circuits track rounds instead)
// must give the screen one or the other — on the treadmill or the bike, and in
// travel mode.
describe("every exercise has a tracker", () => {
  const blocks = [...WORKOUTS.flatMap((w) => w.blocks), TOGETHER, MOBILITY];
  const loose = [
    ...blocks.filter((b) => !b.circuit).flatMap((b) => b.exercises.map((ex) => ({ ex, block: b.name }))),
    ...Object.values(OFF_DAY_CARDIO).map((ex) => ({ ex, block: "off-day cardio" })),
  ];
  const variants = ({ ex }) => [ex, forMachine(ex, "bike"), forMachine(ex, "rower"), forTravel(ex, true), forTravel(forMachine(ex, "bike"), true), forTravel(forMachine(ex, "rower"), true)];

  it("parses into sets or carries a timer", () => {
    expect(loose.length).toBeGreaterThan(30); // guard: the check really covers the program
    const missing = loose.flatMap((item) =>
      variants(item).filter((v) => !prescription(v.s) && !v.timer).map((v) => `${item.block}: ${v.n} "${v.s}"`),
    );
    expect(missing).toEqual([]);
  });

  it("gives every timed cardio station in an auto-chained circuit a timer", () => {
    const auto = WORKOUTS.flatMap((w) => w.blocks).filter((b) => b.circuit?.auto);
    for (const b of auto) for (const ex of b.exercises) for (const v of [ex, forMachine(ex, "bike"), forMachine(ex, "rower")]) expect(v.timer, `${b.name}: ${v.n}`).toBeGreaterThan(0);
  });
});

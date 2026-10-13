import { describe, it, expect } from "vitest";
import { prescription, forMachine, WORKOUTS } from "./program.js";

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
});

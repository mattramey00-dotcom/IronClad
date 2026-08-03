import { describe, it, expect } from "vitest";
import { adaptScheme, adaptExercise, goalTuneNote } from "./training.js";

describe("adaptScheme — build (gain)", () => {
  it("shifts reps up and adds a set to lower-volume work", () => {
    expect(adaptScheme("4 × 6–8", "gain")).toBe("4 × 8–10");   // 4 sets already, reps +2
    expect(adaptScheme("3 × 8–12", "gain")).toBe("4 × 10–14"); // set added (3→4)
    expect(adaptScheme("5 × 5", "gain")).toBe("5 × 7");        // single rep, no set added (>3)
  });
  it("caps reps so nothing drifts into junk volume", () => {
    expect(adaptScheme("3 × 12–15", "gain")).toBe("4 × 14–15"); // hi capped at 15, set added
    expect(adaptScheme("3 × 20", "gain")).toBe("4 × 15");       // capped
  });
});

describe("adaptScheme — cut (lose fat)", () => {
  it("leaves already-heavy compounds alone", () => {
    expect(adaptScheme("4 × 6–8", "cut")).toBe("4 × 6–8"); // lo < 8, untouched
    expect(adaptScheme("5 × 5", "cut")).toBe("5 × 5");
  });
  it("pulls higher-rep accessory work toward a heavier range, sets unchanged", () => {
    expect(adaptScheme("3 × 12–15", "cut")).toBe("3 × 9–12");
    expect(adaptScheme("3 × 8–12", "cut")).toBe("3 × 5–9");
  });
});

describe("adaptScheme — untouched cases", () => {
  it("no-ops on recomp and maintain", () => {
    expect(adaptScheme("4 × 6–8", "recomp")).toBe("4 × 6–8");
    expect(adaptScheme("3 × 12–15", "maintain")).toBe("3 × 12–15");
  });
  it("never touches timed, cardio, AMRAP or bare labels", () => {
    for (const s of ["3 × 30 sec", "3 × 45–60 sec", "90 seconds", "2 minutes", "15 minutes", "3 × AMRAP", "Triceps", "15 reps"]) {
      expect(adaptScheme(s, "gain")).toBe(s);
      expect(adaptScheme(s, "cut")).toBe(s);
    }
  });
  it("preserves an 'each' / 'each side' suffix", () => {
    expect(adaptScheme("3 × 12 each", "gain")).toBe("4 × 14 each");
    expect(adaptScheme("4 × 15–20 each", "cut")).toBe("4 × 12–15 each");
  });
});

describe("adaptExercise", () => {
  it("returns the same object reference when nothing changes", () => {
    const ex = { n: "Barbell Bench Press", s: "4 × 6–8", d: "vertical" };
    expect(adaptExercise(ex, "cut")).toBe(ex);        // heavy compound, cut = no change
    expect(adaptExercise(ex, "recomp")).toBe(ex);     // recomp = no change
    expect(adaptExercise(ex, "gain", false)).toBe(ex); // tuning disabled
  });
  it("returns a new object with the tuned scheme when it changes", () => {
    const ex = { n: "Dumbbell Curl", s: "3 × 8–12", d: "curl" };
    const out = adaptExercise(ex, "gain");
    expect(out).not.toBe(ex);
    expect(out.s).toBe("4 × 10–14");
    expect(out.n).toBe("Dumbbell Curl"); // everything else intact
  });
});

describe("goalTuneNote", () => {
  it("speaks only for cut and build, and only when enabled", () => {
    expect(goalTuneNote("gain")).toMatch(/building/i);
    expect(goalTuneNote("cut")).toMatch(/losing fat/i);
    expect(goalTuneNote("recomp")).toBe(null);
    expect(goalTuneNote("gain", false)).toBe(null);
  });
});

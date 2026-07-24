// ============================================================
//  IRONCLAD — tests for the metabolic math
// ============================================================
//  The whole thesis of this app is "measured, not guessed" — so the arithmetic
//  in nutrition.js is the one thing that has to stay correct as features pile up
//  around it. These pin down the load-bearing pieces: intake sums, the weight
//  trend, the measured-TDEE derivation and its data gates, target resolution,
//  the logging streak, and the small reference calculators.
//
//  Run with `npm test`.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  mealTotals, loggingStreak, weightTrend, estimateTDEE, resolveTargets,
  bmi, waterTargetOz, intakeStats, shiftKey, proteinCadence,
} from "./nutrition.js";

const TODAY = "2026-01-21";
const back = (n) => shiftKey(TODAY, -n);

describe("mealTotals", () => {
  it("sums macros and sodium across a day", () => {
    const t = mealTotals([
      { kcal: 500, protein: 40, carbs: 50, fat: 10, sodium: 600 },
      { kcal: 300, protein: 20, carbs: 30, fat: 5, sodium: 400 },
    ]);
    expect(t.kcal).toBe(800);
    expect(t.protein).toBe(60);
    expect(t.carbs).toBe(80);
    expect(t.fat).toBe(15);
    expect(t.sodium).toBe(1000);
  });

  it("treats missing values and empty input as zero", () => {
    expect(mealTotals([{ kcal: 500 }]).protein).toBe(0);
    expect(mealTotals(null).kcal).toBe(0);
    expect(mealTotals([]).sodium).toBe(0);
  });
});

describe("bmi", () => {
  it("computes the standard height-to-weight ratio", () => {
    expect(bmi(154, 70)).toBeCloseTo(22.1, 1);
  });
  it("returns null on non-positive input", () => {
    expect(bmi(0, 70)).toBeNull();
    expect(bmi(154, 0)).toBeNull();
  });
});

describe("waterTargetOz", () => {
  it("is ~0.6 oz/lb, rounded to whole cups", () => {
    expect(waterTargetOz(180)).toBe(112); // 108 → 14 cups → 112
  });
  it("never drops below the 64 oz floor", () => {
    expect(waterTargetOz(50)).toBe(64);
  });
  it("falls back to a default with no bodyweight", () => {
    expect(waterTargetOz(0)).toBe(80);
  });
});

describe("loggingStreak", () => {
  it("counts consecutive logged days ending today", () => {
    const meals = {};
    for (let i = 0; i < 5; i++) meals[back(i)] = [{ kcal: 100 }];
    const s = loggingStreak(meals, {}, TODAY);
    expect(s.current).toBe(5);
    expect(s.loggedToday).toBe(true);
  });

  it("stays alive through yesterday when today isn't logged yet", () => {
    const meals = {};
    for (let i = 1; i <= 3; i++) meals[back(i)] = [{ kcal: 100 }];
    const s = loggingStreak(meals, {}, TODAY);
    expect(s.current).toBe(3);
    expect(s.loggedToday).toBe(false);
  });

  it("breaks on the first gap", () => {
    const meals = { [back(0)]: [{ kcal: 100 }], [back(2)]: [{ kcal: 100 }] };
    expect(loggingStreak(meals, {}, TODAY).current).toBe(1);
  });

  it("counts a weigh-in as a logged day", () => {
    const weights = { [back(0)]: 185, [back(1)]: 184 };
    expect(loggingStreak({}, weights, TODAY).current).toBe(2);
  });

  it("is zero with nothing recent", () => {
    expect(loggingStreak({}, {}, TODAY).current).toBe(0);
  });
});

// A 21-day window: 2000 kcal every day, weight sliding 185 → 182 (about 1 lb/wk).
const days = Array.from({ length: 21 }, (_, i) => back(20 - i)); // oldest → newest
const fullMeals = {};
const fullWeights = {};
days.forEach((d, i) => {
  fullMeals[d] = [{ kcal: 2000, protein: 150, carbs: 200, fat: 60 }];
  fullWeights[d] = 185 - (3 * i) / 20;
});

describe("weightTrend", () => {
  it("measures a downward slope, not endpoint noise", () => {
    const t = weightTrend(fullWeights, TODAY);
    expect(t.slopePerWeek).toBeLessThan(0);
    expect(t.slopePerWeek).toBeCloseTo(-1.05, 1);
  });
  it("reports null slope with fewer than two weigh-ins", () => {
    expect(weightTrend({ [back(0)]: 185 }, TODAY).slopePerWeek).toBeNull();
  });
});

describe("estimateTDEE", () => {
  it("derives a TDEE above intake when weight is falling", () => {
    const tdee = estimateTDEE(fullMeals, fullWeights, TODAY);
    expect(tdee.ready).toBe(true);
    // losing ~1 lb/wk on 2000 kcal ⇒ maintenance ≈ 2500
    expect(tdee.tdee).toBeGreaterThan(2400);
    expect(tdee.tdee).toBeLessThan(2650);
    expect(tdee.lo).toBeLessThan(tdee.tdee);
    expect(tdee.hi).toBeGreaterThan(tdee.tdee);
  });

  it("refuses to guess without enough logged data", () => {
    const tdee = estimateTDEE({ [back(0)]: [{ kcal: 2000 }] }, { [back(0)]: 185 }, TODAY);
    expect(tdee.ready).toBe(false);
    expect(tdee.tdee).toBeNull();
    expect(tdee.reasons.length).toBeGreaterThan(0);
  });
});

describe("resolveTargets", () => {
  it("derives protein from bodyweight and calories from a ready TDEE", () => {
    const r = resolveTargets({ goal: "recomp" }, { ready: true, tdee: 2500 }, 185);
    expect(r.protein).toBe(185); // recomp = 1.0 g/lb
    expect(r.kcal).toBeGreaterThan(0);
    expect(r.derived).toBe(true);
  });

  it("honours a manually set protein target over the derived one", () => {
    const r = resolveTargets({ goal: "recomp", protein: 160 }, { ready: false }, 185);
    expect(r.protein).toBe(160);
  });

  it("leaves calories null when TDEE isn't ready and none is set", () => {
    const r = resolveTargets({ goal: "recomp" }, { ready: false }, 185);
    expect(r.kcal).toBeNull();
  });

  it("leaves protein null with no bodyweight and no manual target", () => {
    const r = resolveTargets({ goal: "recomp" }, { ready: false }, null);
    expect(r.protein).toBeNull();
  });
});

describe("intakeStats", () => {
  it("averages only the days that were actually logged", () => {
    const meals = {
      [back(0)]: [{ kcal: 2000, protein: 150 }],
      [back(1)]: [{ kcal: 1000, protein: 100 }],
      // back(2) intentionally left unlogged — must not count as a zero-kcal day
    };
    const s = intakeStats(meals, TODAY);
    expect(s.daysLogged).toBe(2);
    expect(s.avgKcal).toBe(1500);
    expect(s.avgProtein).toBe(125);
  });
});

describe("proteinCadence", () => {
  const at = (h, m = 0) => h * 60 + m;

  it("prompts a first dose when nothing is logged", () => {
    const c = proteinCadence([], at(9), 160);
    expect(c.status).toBe("start");
  });

  it("waits when the last dose was under 2 hrs ago", () => {
    const meals = [{ time: "08:00", protein: 35 }];
    const c = proteinCadence(meals, at(9), 160); // 1 hr later
    expect(c.status).toBe("waiting");
  });

  it("is due between 2 and 3 hrs after the last dose", () => {
    const meals = [{ time: "08:00", protein: 35 }];
    const c = proteinCadence(meals, at(10, 30), 160); // 2.5 hr later
    expect(c.status).toBe("due");
  });

  it("is overdue past 3 hrs", () => {
    const meals = [{ time: "08:00", protein: 35 }];
    const c = proteinCadence(meals, at(12), 160); // 4 hr later
    expect(c.status).toBe("overdue");
  });

  it("ignores tiny protein hits that don't reset the clock", () => {
    // an 8 g snack at 11:00 shouldn't count; the 35 g at 08:00 is the last dose
    const meals = [{ time: "08:00", protein: 35 }, { time: "11:00", protein: 8 }];
    const c = proteinCadence(meals, at(12), 160); // 4 hr after the real dose
    expect(c.status).toBe("overdue");
  });

  it("stops once the target is met", () => {
    const meals = [{ time: "08:00", protein: 90 }, { time: "12:00", protein: 90 }];
    const c = proteinCadence(meals, at(13), 160);
    expect(c.status).toBe("done");
  });
});

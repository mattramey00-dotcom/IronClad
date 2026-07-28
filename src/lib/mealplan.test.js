import { describe, it, expect } from "vitest";
import {
  planDayIndex, planDayTotals, normalizePlan, plannedToLogged, loggedPlanIds, groupBySlot,
} from "./mealplan.js";

const plan = normalizePlan(
  {
    days: [
      { meals: [{ slot: "breakfast", name: "Oats", kcal: 400, protein: 30, sugar: 12, fiber: 8, cholesterol: 0 }] },
      { meals: [{ slot: "lunch", name: "Chicken & rice", kcal: 600, protein: 55 }] },
      { meals: [{ slot: "dinner", name: "Steak", kcal: 700, protein: 50, cholesterol: 120 }] },
    ],
  },
  { anchor: "2026-07-26", name: "Test", source: "import", days: 3 },
);

describe("planDayIndex", () => {
  it("maps the anchor to day 0 and wraps the cycle forward and backward", () => {
    expect(planDayIndex(plan, "2026-07-26")).toBe(0);
    expect(planDayIndex(plan, "2026-07-27")).toBe(1);
    expect(planDayIndex(plan, "2026-07-28")).toBe(2);
    expect(planDayIndex(plan, "2026-07-29")).toBe(0); // wrapped
    expect(planDayIndex(plan, "2026-07-25")).toBe(2); // before the anchor
  });

  it("returns null without a plan or anchor", () => {
    expect(planDayIndex(null, "2026-07-28")).toBe(null);
    expect(planDayIndex({ days: [{ meals: [] }] }, "2026-07-28")).toBe(null);
  });
});

describe("normalizePlan", () => {
  it("pads to the requested day count and pins unknown slots to snack", () => {
    const p = normalizePlan({ days: [{ meals: [{ name: "x", slot: "brunch", kcal: 100 }] }] }, { anchor: "2026-07-26", days: 7 });
    expect(p.days).toHaveLength(7);
    expect(p.days[0].meals[0].slot).toBe("snack");
    expect(p.days[0].meals[0].id).toBe("d0-m0");
    expect(p.days[6].meals).toEqual([]);
  });

  it("coerces missing macros to zero, never NaN", () => {
    expect(planDayTotals(plan, "2026-07-27")).toMatchObject({ kcal: 600, protein: 55, sugar: 0, fiber: 0, cholesterol: 0 });
  });
});

describe("plannedToLogged + loggedPlanIds", () => {
  it("stamps a back-reference and derives checked state from presence", () => {
    const planned = plan.days[0].meals[0];
    const logged = plannedToLogged(planned, { id: "log-1", time: "08:00" });
    expect(logged.source).toBe("plan");
    expect(logged.planMealId).toBe(planned.id);
    expect(logged.kcal).toBe(400);
    expect(loggedPlanIds([logged]).has(planned.id)).toBe(true);
    expect(loggedPlanIds([{ id: "x", kcal: 100 }]).size).toBe(0); // an off-plan meal isn't "checked"
  });
});

describe("groupBySlot", () => {
  it("keeps eating order and drops empty slots", () => {
    const groups = groupBySlot([
      { slot: "dinner", name: "d" },
      { slot: "breakfast", name: "b" },
    ]);
    expect(groups.map((g) => g.id)).toEqual(["breakfast", "dinner"]);
  });
});

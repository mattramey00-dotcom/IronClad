import { describe, it, expect } from "vitest";
import { rollSelected, dateKey } from "./schedule.js";

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

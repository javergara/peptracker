import { describe, expect, it } from "vitest";

import { computeAdherence } from "./adherence";
import type { CycleLike } from "./schedule";

const now = new Date("2026-06-24T12:00:00"); // local

function dailyCycle(startDaysAgo: number): CycleLike {
  return {
    id: "c1",
    name: "Daily",
    startDate: new Date(2026, 5, 24 - startDaysAgo),
    endDate: null,
    status: "active",
    scheduleConfig: { frequency: "daily", timesPerDay: 1 },
    peptide: { name: "BPC-157" },
    stack: null,
  };
}

function logOn(daysAgo: number) {
  return { takenAt: new Date(2026, 5, 24 - daysAgo, 9, 0, 0) };
}

describe("computeAdherence", () => {
  it("is 100% when every due dose is logged", () => {
    const cycle = dailyCycle(6);
    const logs = [0, 1, 2, 3, 4, 5, 6].map(logOn);
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(7);
    expect(a.logged).toBe(7);
    expect(a.percent).toBe(100);
    expect(a.streak).toBe(7);
  });

  it("drops when doses are missed and breaks the streak", () => {
    const cycle = dailyCycle(6);
    // miss 2 days ago; today logged
    const logs = [0, 1, 3, 4, 5, 6].map(logOn);
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(7);
    expect(a.logged).toBe(6);
    expect(a.percent).toBe(86);
    // streak counts today + yesterday, then day 2 missed
    expect(a.streak).toBe(2);
  });

  it("today being incomplete does not break the streak", () => {
    const cycle = dailyCycle(3);
    // logged yesterday and before, but NOT today
    const logs = [1, 2, 3].map(logOn);
    const a = computeAdherence([cycle], logs, 4, now);
    expect(a.streak).toBe(3);
  });

  it("returns null percent with no active schedule", () => {
    const a = computeAdherence([], [], 7, now);
    expect(a.percent).toBeNull();
    expect(a.expected).toBe(0);
  });
});

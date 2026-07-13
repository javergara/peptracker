import { describe, expect, it } from "vitest";

import { computeAdherence, computeOverdue } from "./adherence";
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

function logOn(daysAgo: number, cycleId = "c1", peptideId?: string) {
  return {
    takenAt: new Date(2026, 5, 24 - daysAgo, 9, 0, 0),
    cycleId,
    peptideId,
  };
}

describe("computeAdherence", () => {
  it("is 100% when every due dose is logged", () => {
    const cycle = dailyCycle(6);
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => logOn(d));
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(7);
    expect(a.logged).toBe(7);
    expect(a.percent).toBe(100);
    expect(a.streak).toBe(7);
  });

  it("drops when doses are missed and breaks the streak", () => {
    const cycle = dailyCycle(6);
    // miss 2 days ago; today logged
    const logs = [0, 1, 3, 4, 5, 6].map((d) => logOn(d));
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
    const logs = [1, 2, 3].map((d) => logOn(d));
    const a = computeAdherence([cycle], logs, 4, now);
    expect(a.streak).toBe(3);
  });

  it("returns null percent with no active schedule", () => {
    const a = computeAdherence([], [], 7, now);
    expect(a.percent).toBeNull();
    expect(a.expected).toBe(0);
  });

  it("sums a stack cycle's per-peptide expectations", () => {
    // One stack cycle: peptide A daily, peptide B every other day.
    const cycle: CycleLike = {
      id: "s1",
      name: "Stack",
      startDate: new Date(2026, 5, 18), // 6 days ago
      endDate: null,
      status: "active",
      scheduleConfig: {
        frequency: "daily",
        items: [
          { peptideId: "a" }, // inherits daily
          { peptideId: "b", frequency: "eod" },
        ],
      },
      peptide: null,
      stack: { name: "Stack" },
    };
    // Over 7 days: A due 7 times, B (eod from day -6) due on even offsets → 4.
    const a = computeAdherence([cycle], [], 7, now);
    expect(a.expected).toBe(11);
  });

  it("ignores ad-hoc doses (no cycleId) — they don't satisfy expected", () => {
    const cycle = dailyCycle(6);
    // 7 doses but all ad-hoc (no cycle) → none count toward the schedule.
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      takenAt: new Date(2026, 5, 24 - d, 9, 0, 0),
      cycleId: null,
    }));
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(7);
    expect(a.logged).toBe(0);
    expect(a.percent).toBe(0);
  });

  it("does not let a double-log paper over another day's miss", () => {
    const cycle = dailyCycle(6);
    // Two doses two-days-ago, none yesterday → yesterday is still a miss.
    const logs = [
      logOn(0),
      logOn(2),
      logOn(2), // extra dose same day — must NOT cover day 1
      logOn(3),
      logOn(4),
      logOn(5),
      logOn(6),
    ];
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(7);
    // day 1 uncovered; the extra day-2 dose is capped at the 1 expected.
    expect(a.logged).toBe(6);
    expect(a.percent).toBe(86);
  });

  it("a stack: logging one peptide does not mask the other's miss", () => {
    const cycle: CycleLike = {
      id: "s1",
      name: "Stack",
      startDate: new Date(2026, 5, 18),
      endDate: null,
      status: "active",
      scheduleConfig: {
        frequency: "daily",
        items: [{ peptideId: "a" }, { peptideId: "b" }],
      },
      peptide: null,
      stack: { name: "Stack" },
    };
    // Both A and B due daily for 7 days = 14 expected. Log ONLY peptide A,
    // even twice a day — B's misses must still show.
    const logs = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [
      logOn(d, "s1", "a"),
      logOn(d, "s1", "a"), // second A dose — capped at 1 expected
    ]);
    const a = computeAdherence([cycle], logs, 7, now);
    expect(a.expected).toBe(14);
    expect(a.logged).toBe(7); // only A satisfied
    expect(a.percent).toBe(50);
  });
});

describe("computeOverdue", () => {
  it("counts only genuinely missed scheduled doses", () => {
    const cycle = dailyCycle(6);
    // Logged every day except 3 days ago (within the past-7 window, excl. today).
    const logs = [1, 2, 4, 5, 6].map((d) => logOn(d));
    const overdue = computeOverdue([cycle], logs, now);
    const totalMissed = overdue.reduce((s, o) => s + o.missed, 0);
    expect(totalMissed).toBe(1);
    expect(overdue[0].missed).toBe(1);
  });
});

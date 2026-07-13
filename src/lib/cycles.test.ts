import { describe, expect, it } from "vitest";

import {
  doseDefaultsByPeptide,
  effectiveSingleDose,
  isCycleEnded,
  parseDoseAmount,
  washoutDaysLeft,
} from "@/lib/cycles";

describe("parseDoseAmount", () => {
  it("parses a number + mcg", () => {
    expect(parseDoseAmount("250 mcg")).toEqual({ dose: 250, unit: "mcg" });
  });

  it("parses mg (no space)", () => {
    expect(parseDoseAmount("2mg")).toEqual({ dose: 2, unit: "mg" });
  });

  it("defaults the unit to mcg when absent", () => {
    expect(parseDoseAmount("500")).toEqual({ dose: 500, unit: "mcg" });
  });

  it("takes the first number from a range", () => {
    expect(parseDoseAmount("200-300 mcg")).toEqual({ dose: 200, unit: "mcg" });
  });

  it("returns just a unit when there is no number", () => {
    expect(parseDoseAmount("as directed")).toEqual({ unit: "mcg" });
  });

  it("handles null/undefined/empty", () => {
    expect(parseDoseAmount(null)).toEqual({});
    expect(parseDoseAmount(undefined)).toEqual({});
    expect(parseDoseAmount("")).toEqual({});
  });
});

describe("doseDefaultsByPeptide", () => {
  it("indexes items by peptideId", () => {
    expect(
      doseDefaultsByPeptide([
        { peptideId: "a", dose: 250, unit: "mcg" },
        { peptideId: "b", dose: 2, unit: "mg" },
      ]),
    ).toEqual({
      a: { dose: 250, unit: "mcg" },
      b: { dose: 2, unit: "mg" },
    });
  });

  it("returns an empty map for undefined", () => {
    expect(doseDefaultsByPeptide(undefined)).toEqual({});
  });
});

describe("isCycleEnded", () => {
  const now = new Date(2026, 6, 13, 9, 0); // 2026-07-13 local
  it("is false for open-ended cycles", () => {
    expect(isCycleEnded(null, now)).toBe(false);
    expect(isCycleEnded(undefined, now)).toBe(false);
  });
  it("is false on the end date's own day and future", () => {
    expect(isCycleEnded(new Date(2026, 6, 13), now)).toBe(false);
    expect(isCycleEnded(new Date(2026, 6, 20), now)).toBe(false);
  });
  it("is true once the end date has passed", () => {
    expect(isCycleEnded(new Date(2026, 6, 12), now)).toBe(true);
    expect(isCycleEnded(new Date(2026, 5, 1), now)).toBe(true);
  });
});

describe("washoutDaysLeft", () => {
  const now = new Date(2026, 6, 13, 9, 0);
  it("returns null without an end date or washout", () => {
    expect(washoutDaysLeft(null, 7, now)).toBeNull();
    expect(washoutDaysLeft(new Date(2026, 6, 10), 0, now)).toBeNull();
    expect(washoutDaysLeft(new Date(2026, 6, 10), null, now)).toBeNull();
  });
  it("counts days remaining in the washout window", () => {
    // ended 2026-07-10, 7-day washout → ends 2026-07-17, today 07-13 → 4 left
    expect(washoutDaysLeft(new Date(2026, 6, 10), 7, now)).toBe(4);
  });
  it("clamps to 0 once washout is over", () => {
    expect(washoutDaysLeft(new Date(2026, 5, 1), 7, now)).toBe(0);
  });
});

describe("effectiveSingleDose", () => {
  const start = new Date(2026, 0, 1); // week 1 begins
  const dosage = {
    low: "250 mcg",
    standard: "250-500 mcg",
    high: "500 mcg",
    unit: "mcg",
    protocols: [
      {
        label: "Ramp",
        steps: [
          { weeks: "1-2", amount: 250, unit: "mcg" },
          { weeks: "3-4", amount: 500, unit: "mcg" },
          { weeks: "5+", amount: 1, unit: "mg" },
        ],
      },
    ],
  };

  it("returns the flat dose when no titration is configured", () => {
    expect(
      effectiveSingleDose(
        { dosePerAdmin: 300, unit: "mcg" },
        dosage,
        start,
        new Date(2026, 0, 10),
      ),
    ).toEqual({ amount: 300, unit: "mcg" });
  });

  it("resolves the current titration week's dose", () => {
    const cfg = { titration: { label: "Ramp" } };
    // week 1 (day 3)
    expect(
      effectiveSingleDose(cfg, dosage, start, new Date(2026, 0, 3)),
    ).toEqual({ amount: 250, unit: "mcg" });
    // week 3 (day 15) → 500 mcg
    expect(
      effectiveSingleDose(cfg, dosage, start, new Date(2026, 0, 15)),
    ).toEqual({ amount: 500, unit: "mcg" });
    // week 5+ (day 30) → 1 mg
    expect(
      effectiveSingleDose(cfg, dosage, start, new Date(2026, 0, 30)),
    ).toEqual({ amount: 1, unit: "mg" });
  });

  it("returns null when nothing is configured", () => {
    expect(
      effectiveSingleDose({}, dosage, start, new Date(2026, 0, 3)),
    ).toBeNull();
    expect(
      effectiveSingleDose(null, dosage, start, new Date(2026, 0, 3)),
    ).toBeNull();
  });

  it("falls back to flat dose when titration hasn't started", () => {
    const cfg = {
      titration: { label: "Ramp" },
      dosePerAdmin: 100,
      unit: "mcg",
    };
    // before start → no titration step → flat fallback
    expect(
      effectiveSingleDose(cfg, dosage, start, new Date(2025, 11, 20)),
    ).toEqual({ amount: 100, unit: "mcg" });
  });
});

import { describe, expect, it } from "vitest";

import {
  activeLevelSeries,
  hoursUntilFraction,
  levelAt,
  remainingFraction,
  type PkDose,
} from "./pk";

const HOUR = 3_600_000;

describe("remainingFraction", () => {
  it("is 1 at t=0", () => {
    expect(remainingFraction(0, 5)).toBe(1);
  });
  it("is 1/2 after exactly one half-life", () => {
    expect(remainingFraction(5, 5)).toBeCloseTo(0.5, 10);
  });
  it("is 1/4 after two half-lives", () => {
    expect(remainingFraction(10, 5)).toBeCloseTo(0.25, 10);
  });
  it("treats non-positive half-life as fully eliminated", () => {
    expect(remainingFraction(1, 0)).toBe(0);
  });
  it("clamps negative elapsed to full dose", () => {
    expect(remainingFraction(-3, 5)).toBe(1);
  });
});

describe("levelAt", () => {
  const doses: PkDose[] = [
    { t: 0, amount: 100 },
    { t: 5 * HOUR, amount: 100 },
  ];

  it("sums only doses at or before t", () => {
    // At t=0 only the first dose is on board.
    expect(levelAt(0, doses, 5)).toBe(100);
  });

  it("superimposes overlapping doses", () => {
    // At t=5h: first dose decayed to 50, second dose full = 150.
    expect(levelAt(5 * HOUR, doses, 5)).toBeCloseTo(150, 6);
  });

  it("ignores future doses", () => {
    expect(levelAt(-1 * HOUR, doses, 5)).toBe(0);
  });
});

describe("activeLevelSeries", () => {
  it("returns empty without doses or with bad half-life", () => {
    expect(activeLevelSeries([], 5, 0, 10 * HOUR)).toEqual([]);
    expect(activeLevelSeries([{ t: 0, amount: 10 }], 0, 0, 10 * HOUR)).toEqual(
      [],
    );
  });

  it("includes a sample exactly at each in-window dose time", () => {
    const doses: PkDose[] = [{ t: 4 * HOUR, amount: 10 }];
    const series = activeLevelSeries(doses, 5, 0, 12 * HOUR, 6);
    expect(series.some((p) => p.t === 4 * HOUR)).toBe(true);
  });

  it("is sorted by time and monotonic after a single dose", () => {
    const doses: PkDose[] = [{ t: 0, amount: 100 }];
    const series = activeLevelSeries(doses, 5, 0, 20 * HOUR, 1);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].t).toBeGreaterThan(series[i - 1].t);
      expect(series[i].level).toBeLessThanOrEqual(series[i - 1].level + 1e-9);
    }
  });
});

describe("hoursUntilFraction", () => {
  it("returns one-half-life multiple for a 50% target", () => {
    const doses: PkDose[] = [{ t: 0, amount: 100 }];
    expect(hoursUntilFraction(doses, 5, 0, 0.5)).toBeCloseTo(5, 6);
  });
  it("returns ~3.32 half-lives to reach 10%", () => {
    const doses: PkDose[] = [{ t: 0, amount: 100 }];
    // log2(10) ≈ 3.3219 half-lives → * 5h
    expect(hoursUntilFraction(doses, 5, 0, 0.1)).toBeCloseTo(16.6096, 3);
  });
  it("returns null when nothing is on board", () => {
    expect(hoursUntilFraction([], 5, 0)).toBeNull();
  });
});

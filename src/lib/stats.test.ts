import { describe, expect, it } from "vitest";

import { correlationStrength, linearRegression, pearsonPValue } from "./stats";

describe("linearRegression", () => {
  it("fits a perfect positive line (R²=1, r=1)", () => {
    const r = linearRegression([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(1);
    expect(r.r2).toBeCloseTo(1);
    expect(r.r).toBeCloseTo(1);
    expect(r.n).toBe(3);
  });

  it("gives a negative Pearson r for an inverse relationship", () => {
    const r = linearRegression([
      { x: 1, y: 10 },
      { x: 2, y: 8 },
      { x: 3, y: 6 },
    ]);
    expect(r.r).toBeCloseTo(-1);
    expect(r.r2).toBeCloseTo(1);
  });

  it("fits a noisy line with 0 < R² < 1", () => {
    const r = linearRegression([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ]);
    expect(r.slope).toBeGreaterThan(0);
    expect(r.r2).toBeGreaterThan(0);
    expect(r.r2).toBeLessThan(1);
  });

  it("handles <2 points and identical x safely", () => {
    expect(linearRegression([]).n).toBe(0);
    expect(linearRegression([{ x: 5, y: 9 }]).intercept).toBe(9);
    const flat = linearRegression([
      { x: 2, y: 1 },
      { x: 2, y: 9 },
    ]);
    expect(flat.slope).toBe(0);
    expect(flat.r).toBe(0);
  });
});

describe("correlationStrength", () => {
  it("buckets by magnitude", () => {
    expect(correlationStrength(0.9)).toBe("strong");
    expect(correlationStrength(-0.5)).toBe("moderate");
    expect(correlationStrength(0.25)).toBe("weak");
    expect(correlationStrength(0.05)).toBe("negligible");
  });
});

describe("pearsonPValue", () => {
  it("returns ~1 for zero correlation and 1 for tiny samples", () => {
    expect(pearsonPValue(0, 20)).toBeCloseTo(1, 5);
    expect(pearsonPValue(0.9, 2)).toBe(1); // n < 3
  });

  it("matches known two-tailed t-test p-values (within tolerance)", () => {
    // r=0.7, n=10 → t≈2.77, df=8 → p≈0.024
    expect(pearsonPValue(0.7, 10)).toBeCloseTo(0.024, 2);
    // r=0.5, n=5 → not significant, p≈0.391
    expect(pearsonPValue(0.5, 5)).toBeCloseTo(0.391, 2);
    // sign of r doesn't matter (two-tailed)
    expect(pearsonPValue(-0.7, 10)).toBeCloseTo(pearsonPValue(0.7, 10), 6);
  });

  it("shrinks toward 0 as |r| and n grow", () => {
    expect(pearsonPValue(0.95, 30)).toBeLessThan(0.001);
  });
});

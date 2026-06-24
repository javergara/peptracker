import { describe, expect, it } from "vitest";

import { linearRegression } from "./stats";

describe("linearRegression", () => {
  it("fits a perfect positive line (R²=1)", () => {
    const r = linearRegression([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(1);
    expect(r.r2).toBeCloseTo(1);
    expect(r.n).toBe(3);
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
  });
});

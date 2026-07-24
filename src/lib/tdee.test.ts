import { describe, expect, it } from "vitest";

import {
  computeTdee,
  KCAL_PER_KG,
  suggestGoalCalories,
  type TdeePoint,
} from "./tdee";

const DAY = 86_400_000;

/** Build `n` daily points ending today, value from `fn(dayIndex)`. */
function series(n: number, fn: (i: number) => number): TdeePoint[] {
  const start = Date.now() - (n - 1) * DAY;
  return Array.from({ length: n }, (_, i) => ({
    t: start + i * DAY,
    value: fn(i),
  }));
}

describe("computeTdee", () => {
  it("returns null tdee with too little data", () => {
    const r = computeTdee({
      intake: series(5, () => 2000),
      weight: series(5, () => 80),
    });
    expect(r.tdeeKcal).toBeNull();
    expect(r.confidence).toBe("none");
  });

  it("equals average intake when weight is flat", () => {
    const r = computeTdee({
      intake: series(21, () => 2200),
      weight: series(21, () => 80),
    });
    expect(r.avgIntakeKcal).toBe(2200);
    expect(r.weightSlopeKgPerWeek).toBe(0);
    expect(r.tdeeKcal).toBe(2200);
    expect(r.confidence).toBe("high");
  });

  it("estimates a deficit when weight trends down", () => {
    // Lose 0.5 kg/week over 28 days → true balance ≈ -0.5*7700/7 ≈ -550/day,
    // so TDEE ≈ intake + 550.
    const perDay = 0.5 / 7;
    const r = computeTdee({
      intake: series(28, () => 2000),
      weight: series(28, (i) => 80 - perDay * i),
    });
    expect(r.weightSlopeKgPerWeek).toBeCloseTo(-0.5, 1);
    expect(r.energyBalanceKcalPerDay).toBeCloseTo(-550, -1);
    expect(r.tdeeKcal).toBeGreaterThan(2400);
    expect(r.tdeeKcal).toBeLessThan(2700);
  });

  it("averages multiple readings on the same day", () => {
    const today = Date.now();
    const r = computeTdee({
      intake: series(14, () => 1800),
      weight: [
        ...series(14, () => 70),
        { t: today, value: 90 }, // extra same-day reading pulls one day's avg
      ],
    });
    expect(r.weightReadings).toBe(14);
  });
});

describe("suggestGoalCalories", () => {
  it("subtracts for a loss rate and adds for a gain rate", () => {
    expect(suggestGoalCalories(2500, -0.5)).toBe(
      Math.round(2500 - (0.5 * KCAL_PER_KG) / 7),
    );
    expect(suggestGoalCalories(2500, 0.25)).toBe(
      Math.round(2500 + (0.25 * KCAL_PER_KG) / 7),
    );
    expect(suggestGoalCalories(2500, 0)).toBe(2500);
  });

  it("returns null when tdee is unknown", () => {
    expect(suggestGoalCalories(null, -0.5)).toBeNull();
  });
});

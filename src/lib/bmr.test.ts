import { describe, expect, it } from "vitest";

import {
  activityFactor,
  mifflinStJeorBmr,
  suggestMacros,
  tdeeFromBmr,
} from "./bmr";

describe("mifflinStJeorBmr", () => {
  it("computes male BMR", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(
      mifflinStJeorBmr({ weightKg: 80, heightCm: 180, age: 30, sex: "M" }),
    ).toBe(1780);
  });

  it("computes female BMR (−161 constant)", () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 → 1320
    expect(
      mifflinStJeorBmr({ weightKg: 60, heightCm: 165, age: 30, sex: "F" }),
    ).toBe(1320);
  });

  it("returns null on missing/invalid inputs", () => {
    expect(
      mifflinStJeorBmr({ weightKg: 80, heightCm: 180, age: 30 }),
    ).toBeNull();
    expect(
      mifflinStJeorBmr({ weightKg: 0, heightCm: 180, age: 30, sex: "M" }),
    ).toBeNull();
    expect(mifflinStJeorBmr({})).toBeNull();
  });
});

describe("tdeeFromBmr", () => {
  it("applies the activity factor", () => {
    expect(tdeeFromBmr(1780, "moderate")).toBe(Math.round(1780 * 1.55));
    expect(tdeeFromBmr(1780, "sedentary")).toBe(Math.round(1780 * 1.2));
  });

  it("is null-safe and defaults unknown activity to sedentary", () => {
    expect(tdeeFromBmr(null, "moderate")).toBeNull();
    expect(activityFactor("bogus")).toBe(1.2);
  });
});

describe("suggestMacros", () => {
  it("splits calories: protein 1.8g/kg, fat 25%, carbs rest", () => {
    const m = suggestMacros(2200, 80);
    expect(m.protein).toBe(144); // 1.8 * 80
    expect(m.fat).toBe(Math.round((2200 * 0.25) / 9)); // 61
    const carbCals = 2200 - m.protein * 4 - m.fat * 9;
    expect(m.carbs).toBe(Math.round(carbCals / 4));
  });

  it("returns zeros for non-positive calories", () => {
    expect(suggestMacros(0, 80)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

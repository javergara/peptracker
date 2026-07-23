import { describe, expect, it } from "vitest";

import {
  EMPTY_NUTRITION,
  goalProgress,
  isOverGoal,
  macroKcalSplit,
  scaleNutrition,
  sumNutrition,
  type Nutrition,
} from "./food";

const chicken: Nutrition = {
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  fiber: 0,
};

describe("scaleNutrition", () => {
  it("multiplies each field by the quantity", () => {
    expect(scaleNutrition(chicken, 2)).toEqual({
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
      fiber: 0,
    });
  });

  it("rounds calories to integers and macros to one decimal", () => {
    const r = scaleNutrition(
      { calories: 100, protein: 3.33, carbs: 1.11, fat: 0.77 },
      1.5,
    );
    expect(r.calories).toBe(150);
    expect(r.protein).toBe(5);
    expect(r.carbs).toBe(1.7);
    expect(r.fat).toBe(1.2);
  });

  it("preserves a null fiber and clamps invalid quantities to 0", () => {
    expect(scaleNutrition({ ...chicken, fiber: null }, 2).fiber).toBeNull();
    expect(scaleNutrition(chicken, -1).calories).toBe(0);
    expect(scaleNutrition(chicken, NaN).protein).toBe(0);
  });
});

describe("sumNutrition", () => {
  it("sums calories and macros", () => {
    const total = sumNutrition([
      chicken,
      { calories: 200, protein: 5, carbs: 40, fat: 2, fiber: 3 },
    ]);
    expect(total.calories).toBe(365);
    expect(total.protein).toBe(36);
    expect(total.carbs).toBe(40);
    expect(total.fat).toBe(5.6);
    expect(total.fiber).toBe(3);
  });

  it("returns null fiber only when no entry had fiber", () => {
    expect(
      sumNutrition([{ calories: 1, protein: 0, carbs: 0, fat: 0 }]).fiber,
    ).toBeNull();
    expect(sumNutrition([]).calories).toBe(0);
    expect(sumNutrition([EMPTY_NUTRITION])).toEqual(EMPTY_NUTRITION);
  });
});

describe("goalProgress / isOverGoal", () => {
  it("returns a clamped 0-100 percentage", () => {
    expect(goalProgress(1000, 2000)).toBe(50);
    expect(goalProgress(2500, 2000)).toBe(100);
    expect(goalProgress(0, 2000)).toBe(0);
  });

  it("returns 0 for a missing or non-positive goal", () => {
    expect(goalProgress(500, null)).toBe(0);
    expect(goalProgress(500, 0)).toBe(0);
  });

  it("flags meeting or exceeding the goal", () => {
    expect(isOverGoal(2000, 2000)).toBe(true);
    expect(isOverGoal(1999, 2000)).toBe(false);
    expect(isOverGoal(1000, null)).toBe(false);
  });
});

describe("macroKcalSplit", () => {
  it("splits calories across macros by Atwater factors", () => {
    // 25g P (100kcal) + 25g C (100kcal) + 0 fat → 50/50.
    expect(
      macroKcalSplit({ calories: 200, protein: 25, carbs: 25, fat: 0 }),
    ).toEqual({
      protein: 50,
      carbs: 50,
      fat: 0,
    });
  });

  it("weights fat at 9 kcal/g", () => {
    // 10g fat (90kcal) vs 10g carbs (40kcal) → ~69/31.
    const split = macroKcalSplit({
      calories: 130,
      protein: 0,
      carbs: 10,
      fat: 10,
    });
    expect(split.fat).toBe(69);
    expect(split.carbs).toBe(31);
  });

  it("returns zeros when there are no macros", () => {
    expect(macroKcalSplit(EMPTY_NUTRITION)).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

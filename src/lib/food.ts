import { MACROS } from "@/types/food";

/**
 * Pure nutrition math for the food/calorie tracker. Kept out of components so
 * it stays unit-testable (see food.test.ts). No DB, no React.
 */

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
};

export type NutritionGoals = {
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbGoal: number | null;
  fatGoal: number | null;
};

/** Round to `d` decimal places, avoiding float noise (e.g. 0.1*3). */
function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export const EMPTY_NUTRITION: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: null,
};

/**
 * Scale a per-serving nutrition object by `quantity` servings. Calories round
 * to whole numbers; macros to one decimal. A negative/NaN quantity clamps to 0.
 */
export function scaleNutrition(base: Nutrition, quantity: number): Nutrition {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  return {
    calories: Math.round(base.calories * q),
    protein: round(base.protein * q),
    carbs: round(base.carbs * q),
    fat: round(base.fat * q),
    fiber: base.fiber == null ? null : round(base.fiber * q),
  };
}

/** Sum a list of nutrition entries into a single total. */
export function sumNutrition(items: Nutrition[]): Nutrition {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let hasFiber = false;
  for (const n of items) {
    calories += n.calories || 0;
    protein += n.protein || 0;
    carbs += n.carbs || 0;
    fat += n.fat || 0;
    if (n.fiber != null) {
      fiber += n.fiber;
      hasFiber = true;
    }
  }
  return {
    calories: Math.round(calories),
    protein: round(protein),
    carbs: round(carbs),
    fat: round(fat),
    fiber: hasFiber ? round(fiber) : null,
  };
}

/**
 * Progress toward a goal as a 0–100 percentage (clamped for display). A missing
 * or non-positive goal returns 0 (nothing to progress toward).
 */
export function goalProgress(value: number, goal: number | null): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

/** True when the value has met or exceeded a positive goal. */
export function isOverGoal(value: number, goal: number | null): boolean {
  return !!goal && goal > 0 && value >= goal;
}

/**
 * Percentage of *macro-derived* calories from each macro (protein/carbs/fat),
 * using Atwater factors. Returns zeros when no macros are present. The three
 * values sum to ~100 (subject to rounding).
 */
export function macroKcalSplit(n: Nutrition): Record<string, number> {
  const kcal = Object.fromEntries(
    MACROS.map((m) => [m.key, (n[m.key] || 0) * m.kcalPerGram]),
  ) as Record<string, number>;
  const total = Object.values(kcal).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return Object.fromEntries(MACROS.map((m) => [m.key, 0]));
  }
  return Object.fromEntries(
    MACROS.map((m) => [m.key, Math.round((kcal[m.key] / total) * 100)]),
  );
}

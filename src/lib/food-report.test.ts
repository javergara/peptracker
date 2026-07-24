import { describe, expect, it } from "vitest";

import type { NutritionGoals } from "./food";
import {
  averageNutrition,
  loggingStreak,
  weeklySummary,
  type DayTotals,
} from "./food-report";

const DAY = 86_400_000;

const goals: NutritionGoals = {
  calorieGoal: 2000,
  proteinGoal: 150,
  carbGoal: 200,
  fatGoal: 60,
};

function day(t: number, calories: number, protein = 0): DayTotals {
  return { t, nutrition: { calories, protein, carbs: 0, fat: 0 } };
}

describe("averageNutrition", () => {
  it("averages calories and macros", () => {
    const avg = averageNutrition([
      { calories: 2000, protein: 100, carbs: 0, fat: 0 },
      { calories: 2400, protein: 140, carbs: 0, fat: 0 },
    ]);
    expect(avg.calories).toBe(2200);
    expect(avg.protein).toBe(120);
  });

  it("returns empty for no entries", () => {
    expect(averageNutrition([]).calories).toBe(0);
  });
});

describe("weeklySummary", () => {
  it("counts only logged days and averages over them", () => {
    const days = [day(1, 2000), day(2, 0), day(3, 2200)];
    const s = weeklySummary(days, goals);
    expect(s.daysLogged).toBe(2);
    expect(s.avg.calories).toBe(2100);
  });

  it("counts days within tolerance of the calorie goal", () => {
    // goal 2000, ±10% = [1800, 2200].
    const days = [day(1, 1900), day(2, 2200), day(3, 2500), day(4, 1700)];
    const s = weeklySummary(days, goals);
    expect(s.daysOnGoal).toBe(2);
  });

  it("reports 0 on-goal days when no calorie goal is set", () => {
    const s = weeklySummary([day(1, 2000)], { ...goals, calorieGoal: null });
    expect(s.daysOnGoal).toBe(0);
  });
});

describe("loggingStreak", () => {
  const today = 30 * DAY; // arbitrary "today"

  it("counts consecutive days ending today", () => {
    const days = [today, today - DAY, today - 2 * DAY];
    expect(loggingStreak(days, today)).toBe(3);
  });

  it("uses yesterday as a grace anchor when today is unlogged", () => {
    const days = [today - DAY, today - 2 * DAY];
    expect(loggingStreak(days, today)).toBe(2);
  });

  it("breaks on a gap", () => {
    const days = [today, today - 2 * DAY, today - 3 * DAY];
    expect(loggingStreak(days, today)).toBe(1);
  });

  it("returns 0 when neither today nor yesterday is logged", () => {
    expect(loggingStreak([today - 3 * DAY], today)).toBe(0);
    expect(loggingStreak([], today)).toBe(0);
  });
});

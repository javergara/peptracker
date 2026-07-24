import {
  EMPTY_NUTRITION,
  scaleNutrition,
  sumNutrition,
  type Nutrition,
  type NutritionGoals,
} from "@/lib/food";

/**
 * Weekly nutrition report math (pure, unit-tested). Aggregates per-day totals
 * into averages + adherence signals for the food "Report" tab. No DB, no React.
 */

const DAY_MS = 86_400_000;

export interface DayTotals {
  /** Epoch ms for the day (any time within it). */
  t: number;
  nutrition: Nutrition;
}

export interface WeeklySummary {
  daysLogged: number;
  /** Average nutrition across the days that had any intake. */
  avg: Nutrition;
  /** Days whose calories landed within tolerance of the calorie goal. */
  daysOnGoal: number;
  calorieGoal: number | null;
}

/** Average a list of nutrition entries (0 entries → empty). */
export function averageNutrition(items: Nutrition[]): Nutrition {
  if (items.length === 0) return { ...EMPTY_NUTRITION };
  return scaleNutrition(sumNutrition(items), 1 / items.length);
}

/**
 * Summarize a set of daily totals against goals. `tolerancePct` is the ± band
 * (of the calorie goal) counted as "on goal".
 */
export function weeklySummary(
  days: DayTotals[],
  goals: NutritionGoals,
  tolerancePct = 10,
): WeeklySummary {
  const logged = days.filter((d) => d.nutrition.calories > 0);
  const avg = averageNutrition(logged.map((d) => d.nutrition));

  let daysOnGoal = 0;
  const goal = goals.calorieGoal;
  if (goal && goal > 0) {
    const tol = (goal * tolerancePct) / 100;
    daysOnGoal = logged.filter(
      (d) => Math.abs(d.nutrition.calories - goal) <= tol,
    ).length;
  }

  return { daysLogged: logged.length, avg, daysOnGoal, calorieGoal: goal };
}

/**
 * Current logging streak: consecutive days with a log ending at today (or, as a
 * grace day, yesterday). `loggedDays` are epoch-ms timestamps of logged days.
 */
export function loggingStreak(loggedDays: number[], today: number): number {
  const toDay = (t: number) => Math.floor(t / DAY_MS) * DAY_MS;
  const set = new Set(loggedDays.map(toDay));
  const t0 = toDay(today);

  // Anchor on today if logged, else yesterday (grace), else no current streak.
  let cursor = set.has(t0) ? t0 : set.has(t0 - DAY_MS) ? t0 - DAY_MS : null;
  if (cursor == null) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

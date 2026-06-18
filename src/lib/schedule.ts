import { differenceInCalendarDays } from "date-fns";

import { isWithinRange } from "@/lib/dates";

/**
 * Dosing-schedule logic: decide whether a given day is a dose day for a cycle,
 * roll up "what to take today" across many cycles, and compute cycle progress.
 * All pure functions — no DB, no React.
 */

export type Frequency = "daily" | "eod" | "twice-weekly" | "weekly" | "custom";

export interface ScheduleConfig {
  frequency: Frequency;
  /** Days of the week the dose applies to. 0=Sun .. 6=Sat. */
  daysOfWeek?: number[];
  /** Number of administrations per dose day. */
  timesPerDay?: number;
  /** Amount per administration (free-form numeric, paired with `unit`). */
  dosePerAdmin?: number;
  /** Unit label for `dosePerAdmin` (e.g. "mcg", "mg"). */
  unit?: string;
}

export interface CycleLike {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  scheduleConfig: ScheduleConfig | null;
  peptide?: { name: string } | null;
  stack?: { name: string } | null;
}

/**
 * Whether `date` is a dose day given a schedule and the cycle's start date.
 *
 * - `daily`: every day.
 * - `eod`: every other day, counting from `startDate`.
 * - `weekly`: the same weekday as `startDate`, unless `daysOfWeek[0]` overrides it.
 * - `twice-weekly` / `custom`: any day whose weekday is listed in `daysOfWeek`.
 * - unknown frequency: defaults to `true`.
 */
export function isDoseDay(
  config: ScheduleConfig,
  date: Date,
  startDate: Date,
): boolean {
  switch (config.frequency) {
    case "daily":
      return true;
    case "eod": {
      const diff = Math.abs(differenceInCalendarDays(date, startDate));
      return diff % 2 === 0;
    }
    case "weekly": {
      const targetDay = config.daysOfWeek?.[0] ?? startDate.getDay();
      return date.getDay() === targetDay;
    }
    case "twice-weekly":
    case "custom":
      return (config.daysOfWeek ?? []).includes(date.getDay());
    default:
      return true;
  }
}

/**
 * Across a set of cycles, return the active ones that have a dose scheduled for
 * `date` (defaults to now), along with how many administrations each requires.
 *
 * A cycle is included only when it is status "active", `date` falls within
 * `[startDate, endDate]`, it has a `scheduleConfig`, and `isDoseDay` is true.
 */
export function getTodaysDoses(
  cycles: CycleLike[],
  date: Date = new Date(),
): { cycle: CycleLike; times: number }[] {
  const result: { cycle: CycleLike; times: number }[] = [];

  for (const cycle of cycles) {
    if (cycle.status !== "active") continue;
    if (!cycle.scheduleConfig) continue;
    if (!isWithinRange(date, cycle.startDate, cycle.endDate)) continue;
    if (!isDoseDay(cycle.scheduleConfig, date, cycle.startDate)) continue;

    result.push({
      cycle,
      times: cycle.scheduleConfig.timesPerDay ?? 1,
    });
  }

  return result;
}

/**
 * Progress through a cycle as of `now` (defaults to current time).
 *
 * - `daysElapsed`: full days since `start` (never negative).
 * - `totalDays`: full days in the cycle, or `null` for open-ended cycles.
 * - `percent`: 0–100 completion, or `null` when there is no end date.
 */
export function cycleProgress(
  start: Date,
  end: Date | null,
  now: Date = new Date(),
): { daysElapsed: number; totalDays: number | null; percent: number | null } {
  const daysElapsed = Math.max(0, differenceInCalendarDays(now, start));

  if (end === null) {
    return { daysElapsed, totalDays: null, percent: null };
  }

  const totalDays = differenceInCalendarDays(end, start);
  if (totalDays <= 0) {
    return { daysElapsed, totalDays, percent: 100 };
  }

  const percent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  return { daysElapsed, totalDays, percent };
}

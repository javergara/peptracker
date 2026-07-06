import { differenceInCalendarDays } from "date-fns";

import { isWithinRange } from "@/lib/dates";

/**
 * Dosing-schedule logic: decide whether a given day is a dose day for a cycle,
 * roll up "what to take today" across many cycles, and compute cycle progress.
 * All pure functions — no DB, no React.
 */

export type Frequency = "daily" | "eod" | "twice-weekly" | "weekly" | "custom";

/**
 * Per-peptide config for a stack-based cycle. Each peptide can dose differently
 * AND (optionally) run on its own frequency / days / times-per-day and its own
 * start–end sub-range inside the cycle envelope. Every schedule field is
 * optional and falls back to the cycle-level value when absent — so a stack
 * where every peptide shares the cycle schedule needs only `dose`/`unit`.
 */
export interface CyclePeptideDose {
  peptideId: string;
  /** Amount per administration for this peptide (paired with `unit`). */
  dose?: number;
  unit?: string;
  /** Per-peptide overrides (fall back to the cycle-level values). */
  frequency?: Frequency;
  daysOfWeek?: number[];
  timesPerDay?: number;
  /** ISO date (yyyy-MM-dd) sub-range within the cycle; falls back to cycle dates. */
  startDate?: string;
  endDate?: string;
}

/** The effective schedule for one peptide after applying cycle-level fallbacks. */
export interface ResolvedItemSchedule {
  frequency: Frequency;
  daysOfWeek?: number[];
  timesPerDay: number;
  start: Date;
  end: Date | null;
}

export interface ScheduleConfig {
  frequency: Frequency;
  /** Days of the week the dose applies to. 0=Sun .. 6=Sat. */
  daysOfWeek?: number[];
  /** Number of administrations per dose day. */
  timesPerDay?: number;
  /**
   * Amount per administration for a SINGLE-peptide cycle (paired with `unit`).
   * Stack cycles use `items` instead — each peptide doses differently.
   */
  dosePerAdmin?: number;
  /** Unit label for `dosePerAdmin` (e.g. "mcg", "mg"). */
  unit?: string;
  /** Per-peptide doses for STACK cycles (peptideId → dose/unit). */
  items?: CyclePeptideDose[];
  /**
   * Chosen titration protocol for a SINGLE-peptide cycle (see
   * `src/lib/titration.ts`). When set, the current week's dose comes from the
   * peptide's `dosage.protocols` schedule instead of `dosePerAdmin`/`unit`.
   */
  titration?: { label: string };
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

/** Low-level dose-day test on an explicit frequency + days + anchor date. */
export function matchesFrequency(
  frequency: Frequency,
  daysOfWeek: number[] | undefined,
  date: Date,
  anchor: Date,
): boolean {
  switch (frequency) {
    case "daily":
      return true;
    case "eod": {
      const diff = Math.abs(differenceInCalendarDays(date, anchor));
      return diff % 2 === 0;
    }
    case "weekly": {
      const targetDay = daysOfWeek?.[0] ?? anchor.getDay();
      return date.getDay() === targetDay;
    }
    case "twice-weekly":
    case "custom":
      return (daysOfWeek ?? []).includes(date.getDay());
    default:
      return true;
  }
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
  return matchesFrequency(config.frequency, config.daysOfWeek, date, startDate);
}

/** Parse an ISO date string into a Date, or null when absent/invalid. */
function parseISO(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The effective schedule for one stack-cycle peptide: each field falls back to
 * the cycle-level value (and the cycle's own start/end) when the item omits it.
 */
export function resolveItemSchedule(
  config: ScheduleConfig,
  item: CyclePeptideDose,
  cycleStart: Date,
  cycleEnd: Date | null,
): ResolvedItemSchedule {
  return {
    frequency: item.frequency ?? config.frequency,
    daysOfWeek: item.daysOfWeek ?? config.daysOfWeek,
    timesPerDay: item.timesPerDay ?? config.timesPerDay ?? 1,
    start: parseISO(item.startDate) ?? cycleStart,
    end: parseISO(item.endDate) ?? cycleEnd,
  };
}

/** A due-today entry: `peptideId` is set for stack items, null for single. */
export interface TodaysDose {
  cycle: CycleLike;
  peptideId: string | null;
  times: number;
}

/**
 * Across a set of cycles, return the doses scheduled for `date` (defaults to
 * now). A cycle is only considered when it is status "active" and has a
 * `scheduleConfig`. For a STACK cycle each peptide is evaluated on its own
 * resolved schedule + own date sub-range and fanned out to one entry per due
 * peptide; a single-peptide cycle yields at most one entry (peptideId = null).
 */
export function getTodaysDoses(
  cycles: CycleLike[],
  date: Date = new Date(),
): TodaysDose[] {
  const result: TodaysDose[] = [];

  for (const cycle of cycles) {
    if (cycle.status !== "active") continue;
    const cfg = cycle.scheduleConfig;
    if (!cfg) continue;

    if (cfg.items && cfg.items.length > 0) {
      for (const item of cfg.items) {
        const s = resolveItemSchedule(
          cfg,
          item,
          cycle.startDate,
          cycle.endDate,
        );
        if (!isWithinRange(date, s.start, s.end)) continue;
        if (!matchesFrequency(s.frequency, s.daysOfWeek, date, s.start))
          continue;
        result.push({ cycle, peptideId: item.peptideId, times: s.timesPerDay });
      }
      continue;
    }

    // Single-peptide cycle: one cycle-level schedule.
    if (!isWithinRange(date, cycle.startDate, cycle.endDate)) continue;
    if (!isDoseDay(cfg, date, cycle.startDate)) continue;
    result.push({ cycle, peptideId: null, times: cfg.timesPerDay ?? 1 });
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

  const percent = Math.round(
    Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)),
  );
  return { daysElapsed, totalDays, percent };
}

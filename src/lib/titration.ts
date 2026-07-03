import { differenceInCalendarDays } from "date-fns";

import type { DosingProtocol, TitrationStep } from "@/types/peptide";

/**
 * Titration (dose-ramp) math for cycles built on a peptide's `dosage.protocols`.
 * Pure — no DB, no React. A protocol's `steps[].weeks` is author-entered prose
 * like "1-4", "1–4" (en dash), "5", or "13+" (open-ended last step).
 */

export interface WeekRange {
  start: number;
  /** `null` = open-ended (e.g. "13+" never stops matching). */
  end: number | null;
}

/**
 * Parse a `weeks` label into a numeric range. Accepts "1-4", "1–4" (en dash),
 * a single week "5", and an open-ended "13+". Unparseable input returns a
 * range that can never match a (1-based, positive) week number.
 */
export function parseWeekRange(weeks: string): WeekRange {
  const normalized = weeks.trim().replace(/–/g, "-");

  const openEnded = normalized.match(/^(\d+)\+$/);
  if (openEnded) {
    return { start: Number(openEnded[1]), end: null };
  }

  const range = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    return { start: Number(range[1]), end: Number(range[2]) };
  }

  const single = normalized.match(/^(\d+)$/);
  if (single) {
    return { start: Number(single[1]), end: Number(single[1]) };
  }

  // Never matches: end < start and end is not null.
  return { start: 0, end: -1 };
}

/**
 * The titration step (if any) covering `weekNumber` (1-based). Steps are
 * checked in order; the first matching range wins.
 */
export function stepForWeek(
  steps: TitrationStep[],
  weekNumber: number,
): TitrationStep | null {
  for (const step of steps) {
    const range = parseWeekRange(step.weeks);
    if (weekNumber < range.start) continue;
    if (range.end != null && weekNumber > range.end) continue;
    return step;
  }
  return null;
}

/**
 * Stable display/storage label for a dosing protocol: its own `label` when
 * set, else a positional fallback ("Protocol 1", "Protocol 2", ...). Used to
 * identify a peptide's chosen protocol in a cycle's `scheduleConfig.titration`
 * (both the cycle form and the server-side parser use this so they agree).
 */
export function protocolLabel(protocol: DosingProtocol, index: number): string {
  return protocol.label?.trim() || `Protocol ${index + 1}`;
}

export interface TitrationDose {
  amount: number;
  unit: "mg" | "mcg";
  note?: string;
  /** 1-based week of the cycle that `date` falls in. */
  weekNumber: number;
  /** The matched step's raw `weeks` label (e.g. "5-8"). */
  stepLabel: string;
}

/**
 * The titration dose that applies on `date` for a cycle following `protocol`,
 * given the cycle's `startDate`. Week number = floor(daysSince(start)/7) + 1
 * (days 0-6 since start = week 1, days 7-13 = week 2, ...). Returns `null`
 * when `date` precedes `startDate` or no step covers the computed week.
 */
export function doseForCycleDay(
  protocol: DosingProtocol,
  startDate: Date,
  date: Date,
): TitrationDose | null {
  const daysSince = differenceInCalendarDays(date, startDate);
  if (daysSince < 0) return null;

  const weekNumber = Math.floor(daysSince / 7) + 1;
  const step = stepForWeek(protocol.steps, weekNumber);
  if (!step) return null;

  return {
    amount: step.amount,
    unit: step.unit,
    note: step.note,
    weekNumber,
    stepLabel: step.weeks,
  };
}

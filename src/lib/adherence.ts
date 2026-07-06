import { isWithinRange } from "@/lib/dates";
import {
  isDoseDay,
  matchesFrequency,
  resolveItemSchedule,
  type CycleLike,
} from "@/lib/schedule";

/**
 * Adherence = how many scheduled doses were actually logged over a window.
 * Expected doses come from active cycles' schedules (reusing isDoseDay); logged
 * doses are counted per calendar day. Streak = consecutive days (ending today)
 * with no missed due dose.
 */

export interface AdherenceLog {
  takenAt: Date;
}

export interface Adherence {
  expected: number;
  logged: number;
  percent: number | null;
  streak: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function expectedForDay(cycles: CycleLike[], day: Date): number {
  let total = 0;
  for (const c of cycles) {
    if (c.status !== "active") continue;
    const cfg = c.scheduleConfig;
    if (!cfg) continue;

    // Stack cycle: each peptide runs on its own resolved schedule + sub-range.
    if (cfg.items && cfg.items.length > 0) {
      for (const item of cfg.items) {
        const s = resolveItemSchedule(cfg, item, c.startDate, c.endDate);
        if (!isWithinRange(day, s.start, s.end)) continue;
        if (matchesFrequency(s.frequency, s.daysOfWeek, day, s.start)) {
          total += s.timesPerDay;
        }
      }
      continue;
    }

    // Single-peptide cycle.
    if (!isWithinRange(day, c.startDate, c.endDate)) continue;
    if (isDoseDay(cfg, day, c.startDate)) {
      total += cfg.timesPerDay ?? 1;
    }
  }
  return total;
}

export function computeAdherence(
  cycles: CycleLike[],
  doseLogs: AdherenceLog[],
  windowDays = 30,
  now: Date = new Date(),
): Adherence {
  let expected = 0;
  let logged = 0;

  for (let i = 0; i < windowDays; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    expected += expectedForDay(cycles, day);
    logged += doseLogs.filter((d) => sameDay(d.takenAt, day)).length;
  }

  const percent =
    expected > 0
      ? Math.round(Math.min(100, Math.max(0, (logged / expected) * 100)))
      : null;

  // Streak: walk back from today; today may be incomplete (don't break on it).
  let streak = 0;
  for (let i = 0; i < windowDays + 1; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const exp = expectedForDay(cycles, day);
    const log = doseLogs.filter((d) => sameDay(d.takenAt, day)).length;
    const met = exp === 0 || log >= exp;
    if (!met) {
      if (i === 0) continue; // today not finished yet
      break;
    }
    if (exp > 0) streak += 1;
  }

  return { expected, logged, percent, streak };
}

export interface OverdueDay {
  date: Date;
  missed: number;
}

/**
 * For each of the past 7 days (excluding today), count scheduled doses that were
 * not covered by logged doses. A day is "overdue" when expected > logged. Shared
 * by the dashboard Due/Overdue card and the reminder cron.
 */
export function computeOverdue(
  cycles: CycleLike[],
  logs: AdherenceLog[],
  now: Date = new Date(),
): OverdueDay[] {
  const result: OverdueDay[] = [];

  for (let i = 1; i <= 7; i++) {
    const day = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - i),
    );
    const expected = expectedForDay(cycles, day);
    if (expected === 0) continue;
    const logged = logs.filter((l) => sameDay(l.takenAt, day)).length;
    const missed = expected - logged;
    if (missed > 0) result.push({ date: day, missed });
  }

  return result;
}

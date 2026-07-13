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
  /** Cycle the dose was logged against; ad-hoc doses (null) satisfy nothing. */
  cycleId?: string | null;
  /** Peptide dosed — used to match the right item of a stack cycle. */
  peptideId?: string | null;
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

/**
 * One expected administration on a given day: a specific cycle (and peptide, for
 * stack cycles) that should be dosed, with how many times. The `key` is what a
 * logged dose is matched against.
 */
interface DayAdmin {
  /** `${cycleId}::${peptideId}` for stack items; `${cycleId}::*` for single. */
  key: string;
  expected: number;
}

/** The expected administrations for `day` across all active cycles. */
function expectedAdminsForDay(cycles: CycleLike[], day: Date): DayAdmin[] {
  const admins: DayAdmin[] = [];
  for (const c of cycles) {
    if (c.status !== "active") continue;
    const cfg = c.scheduleConfig;
    if (!cfg) continue;

    // Stack cycle: each peptide runs on its own resolved schedule + sub-range.
    if (cfg.items && cfg.items.length > 0) {
      for (const item of cfg.items) {
        const s = resolveItemSchedule(cfg, item, c.startDate, c.endDate);
        if (!isWithinRange(day, s.start, s.end)) continue;
        if (!matchesFrequency(s.frequency, s.daysOfWeek, day, s.start))
          continue;
        admins.push({
          key: `${c.id}::${item.peptideId}`,
          expected: s.timesPerDay,
        });
      }
      continue;
    }

    // Single-peptide cycle.
    if (!isWithinRange(day, c.startDate, c.endDate)) continue;
    if (!isDoseDay(cfg, day, c.startDate)) continue;
    admins.push({ key: `${c.id}::*`, expected: cfg.timesPerDay ?? 1 });
  }
  return admins;
}

/**
 * Doses on `day` that actually satisfy a scheduled administration — each dose is
 * matched to the specific cycle (and peptide, for stacks) it belongs to and
 * counted at most `expected` times. So an ad-hoc dose (no cycleId), a
 * wrong-peptide dose, or a third dose on a twice-a-day peptide can't paper over
 * a *different* peptide's miss, and double-logging can't push a day over 100%.
 */
function loggedForDay(
  admins: DayAdmin[],
  logs: AdherenceLog[],
  day: Date,
): number {
  if (admins.length === 0) return 0;
  const byKey = new Set(admins.map((a) => a.key));
  const counts = new Map<string, number>();
  for (const l of logs) {
    if (!l.cycleId || !sameDay(l.takenAt, day)) continue;
    // Prefer the peptide-specific (stack) admin; fall back to the cycle-wide
    // single-peptide admin.
    const stackKey = `${l.cycleId}::${l.peptideId}`;
    const key = byKey.has(stackKey) ? stackKey : `${l.cycleId}::*`;
    if (!byKey.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let logged = 0;
  for (const a of admins) {
    logged += Math.min(counts.get(a.key) ?? 0, a.expected);
  }
  return logged;
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
    const admins = expectedAdminsForDay(cycles, day);
    expected += admins.reduce((s, a) => s + a.expected, 0);
    logged += loggedForDay(admins, doseLogs, day);
  }

  const percent =
    expected > 0
      ? Math.round(Math.min(100, Math.max(0, (logged / expected) * 100)))
      : null;

  // Streak: walk back from today; today may be incomplete (don't break on it).
  let streak = 0;
  for (let i = 0; i < windowDays + 1; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const admins = expectedAdminsForDay(cycles, day);
    const exp = admins.reduce((s, a) => s + a.expected, 0);
    const log = loggedForDay(admins, doseLogs, day);
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
    const admins = expectedAdminsForDay(cycles, day);
    const expected = admins.reduce((s, a) => s + a.expected, 0);
    if (expected === 0) continue;
    const logged = loggedForDay(admins, logs, day);
    const missed = expected - logged;
    if (missed > 0) result.push({ date: day, missed });
  }

  return result;
}

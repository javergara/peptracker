import {
  addDays as dfAddDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isEqual,
  toDate,
} from "date-fns";

/**
 * Thin, well-typed wrappers around date-fns v4 for the handful of date
 * operations the tracker needs. Keeping them here means UI/business code never
 * imports date-fns directly and gets a stable, project-specific surface.
 */

/**
 * Format a date using a date-fns pattern.
 *
 * @param d   A Date or an ISO/parseable date string.
 * @param fmt date-fns format pattern. Defaults to "MMM d, yyyy".
 */
export function formatDate(d: Date | string, fmt = "MMM d, yyyy"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, fmt);
}

/**
 * Whole calendar days between two dates (`b - a`). Positive when `b` is after
 * `a`, negative otherwise.
 */
export function daysBetween(a: Date, b: Date): number {
  return differenceInCalendarDays(b, a);
}

/**
 * Parse a `yyyy-MM-dd` (`<input type="date">`) value into a **local midnight**
 * Date. Using `new Date("2026-07-13")` instead parses as **UTC** midnight, which
 * shifts the calendar day for any user behind UTC — the source of day-off-by-one
 * bugs in schedule/range math. Returns `null` for missing/malformed input so
 * callers decide the fallback (today, null end date, …).
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
}

/** Local `yyyy-MM-dd` string for an `<input type="date">` default value. */
export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd");
}

/**
 * Local `yyyy-MM-ddTHH:mm` string for an `<input type="datetime-local">`
 * default value (uses local time, not UTC, so the displayed time matches).
 */
export function toDateTimeLocalValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** Return a new Date `n` days after `d` (negative `n` moves backwards). */
export function addDays(d: Date, n: number): Date {
  return dfAddDays(d, n);
}

/**
 * Whether `date` falls within `[start, end]` (inclusive). A `null` end is
 * treated as open-ended (no upper bound).
 */
export function isWithinRange(
  date: Date,
  start: Date,
  end: Date | null,
): boolean {
  const target = toDate(date);
  if (isBefore(target, start) && !isEqual(target, start)) {
    return false;
  }
  if (end === null) {
    return true;
  }
  return !isAfter(target, end) || isEqual(target, end);
}

import { z } from "zod";

/**
 * Daily wellbeing check-in markers. Source of truth for the marker set — the DB
 * stores ratings as a Json `Record<key, 1-5>` (SQLite-origin style) so adding a
 * marker here never needs a migration. Keep keys stable; they key historical
 * data and feed correlations.
 */
export const CHECKIN_MARKERS = [
  { key: "mood", label: "Mood", lowLabel: "Low", highLabel: "Great" },
  { key: "energy", label: "Energy", lowLabel: "Drained", highLabel: "Wired" },
  { key: "sleep", label: "Sleep quality", lowLabel: "Poor", highLabel: "Deep" },
  { key: "libido", label: "Libido", lowLabel: "Low", highLabel: "High" },
  { key: "appetite", label: "Appetite", lowLabel: "Low", highLabel: "High" },
  { key: "focus", label: "Focus", lowLabel: "Foggy", highLabel: "Sharp" },
  {
    key: "soreness",
    label: "Recovery / soreness",
    lowLabel: "Sore",
    highLabel: "Fresh",
  },
  {
    key: "digestion",
    label: "Digestion",
    lowLabel: "Off",
    highLabel: "Settled",
  },
] as const;

export type CheckInMarkerKey = (typeof CHECKIN_MARKERS)[number]["key"];

export const CHECKIN_MARKER_KEYS = CHECKIN_MARKERS.map(
  (m) => m.key,
) as CheckInMarkerKey[];

export const CHECKIN_MARKER_LABELS: Record<string, string> = Object.fromEntries(
  CHECKIN_MARKERS.map((m) => [m.key, m.label]),
);

/** A 1-5 rating map, keyed by marker. Unrated markers are simply absent. */
export const checkInRatingsSchema = z.record(
  z.string(),
  z.number().int().min(1).max(5),
);
export type CheckInRatings = z.infer<typeof checkInRatingsSchema>;

/** Parse a Prisma Json `ratings` column into a validated 1-5 map. */
export function asCheckInRatings(value: unknown): CheckInRatings {
  const parsed = checkInRatingsSchema.safeParse(value);
  if (!parsed.success) return {};
  // Drop keys we no longer recognize so the UI stays consistent.
  const known = new Set<string>(CHECKIN_MARKER_KEYS);
  return Object.fromEntries(
    Object.entries(parsed.data).filter(([k]) => known.has(k)),
  );
}

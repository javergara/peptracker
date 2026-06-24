import { differenceInCalendarDays } from "date-fns";

/**
 * Pure helpers for vial inventory math (no DB). Concentration is mcg/mL;
 * amounts are mcg.
 */

export function vialConcentration(
  totalMcg: number,
  bacWaterMl: number | null | undefined,
): number | null {
  if (!bacWaterMl || bacWaterMl <= 0) return null;
  return totalMcg / bacWaterMl;
}

/** Whole doses remaining for a given per-dose amount (mcg). */
export function vialDosesRemaining(
  remainingMcg: number,
  doseMcg: number,
): number {
  if (doseMcg <= 0) return 0;
  return Math.max(0, Math.floor(remainingMcg / doseMcg));
}

export type ExpiryStatus = "none" | "ok" | "soon" | "expired";

/** Expiry bucket: expired (past), soon (<= 7 days), ok, or none (no date). */
export function vialExpiryStatus(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): ExpiryStatus {
  if (!expiresAt) return "none";
  const days = differenceInCalendarDays(expiresAt, now);
  if (days < 0) return "expired";
  if (days <= 7) return "soon";
  return "ok";
}

/** Default reconstituted-peptide shelf life. */
export const RECONSTITUTED_SHELF_LIFE_DAYS = 28;

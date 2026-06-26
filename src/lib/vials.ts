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

/** Remaining fill as a 0–100 percent of the vial's total. */
export function vialFillPercent(
  remainingMcg: number,
  totalMcg: number,
): number {
  if (totalMcg <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((remainingMcg / totalMcg) * 100)),
  );
}

/**
 * Visual gauge status for the inventory `VialGauge`. Collapses the stored vial
 * `status` (sealed|active|empty|expired) and the expiry bucket into the five
 * states the gauge renders: an active vial expiring within 7 days becomes
 * `soon` (amber fill) so the gauge signals it before the date passes.
 */
export type VialGaugeStatus =
  | "active"
  | "soon"
  | "sealed"
  | "expired"
  | "empty";

export function vialGaugeStatus(
  vial: { status: string; expiresAt?: Date | null },
  now: Date = new Date(),
): VialGaugeStatus {
  if (vial.status === "expired") return "expired";
  if (vial.status === "empty") return "empty";
  if (vial.status === "sealed") return "sealed";
  // active: surface an imminent expiry
  if (vialExpiryStatus(vial.expiresAt, now) === "soon") return "soon";
  return "active";
}

/** Default reconstituted-peptide shelf life. */
export const RECONSTITUTED_SHELF_LIFE_DAYS = 28;

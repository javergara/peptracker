/**
 * Pure helpers for lab marker status + reference-range track geometry (no DB).
 * Shared by the Labs count tiles and the `RangeTrack` visualization so both read
 * "in range / borderline / out of range" from one source of truth.
 *
 * Educational only — reference ranges are typical/assay-dependent, not a
 * diagnosis. See the disclaimer policy.
 */

export type LabStatus = "ok" | "borderline" | "bad";

export interface LabRail {
  /** Whether a usable reference range exists (else no track is drawn). */
  hasRange: boolean;
  status: LabStatus;
  /** Marker dot position along the rail, 0–100 (clamped). */
  markerPct: number;
  /** Normal-band inset from the left edge, 0–100. */
  bandLeftPct: number;
  /** Normal-band inset from the right edge, 0–100. */
  bandRightPct: number;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Classify a value against a reference range and compute track geometry.
 *
 * Domain selection:
 * - Both bounds: [refLow − 0.25·R, refHigh + 0.25·R] so the band sits centered.
 * - Upper bound only ("optimal < X"): [0, refHigh·1.6], band [0, refHigh].
 * - Lower bound only ("optimal > X"): [0, refLow·1.8], band [refLow, max].
 *
 * Borderline = in-range but within the outer ~15% nearest a bound.
 */
export function labStatus(
  value: number,
  refLow: number | null | undefined,
  refHigh: number | null | undefined,
): LabRail {
  const hasLow = refLow != null && Number.isFinite(refLow);
  const hasHigh = refHigh != null && Number.isFinite(refHigh);

  if (!hasLow && !hasHigh) {
    return {
      hasRange: false,
      status: "ok",
      markerPct: 50,
      bandLeftPct: 0,
      bandRightPct: 0,
    };
  }

  let domainMin: number;
  let domainMax: number;
  let bandLow: number;
  let bandHigh: number;
  let nearBand: number; // borderline proximity, in value units

  if (hasLow && hasHigh && (refHigh as number) > (refLow as number)) {
    const lo = refLow as number;
    const hi = refHigh as number;
    const range = hi - lo;
    const pad = range * 0.25;
    domainMin = lo - pad;
    domainMax = hi + pad;
    bandLow = lo;
    bandHigh = hi;
    nearBand = range * 0.15;
  } else if (hasHigh && !hasLow) {
    const hi = refHigh as number;
    domainMin = 0;
    domainMax = hi * 1.6 || 1;
    bandLow = 0;
    bandHigh = hi;
    nearBand = hi * 0.15;
  } else {
    // lower bound only (good is high), or a degenerate both-bounds case
    const lo = (hasLow ? refLow : refHigh) as number;
    domainMin = 0;
    domainMax = lo * 1.8 || 1;
    bandLow = lo;
    bandHigh = domainMax;
    nearBand = lo * 0.15;
  }

  const span = domainMax - domainMin || 1;
  const pct = (x: number) => clampPct(((x - domainMin) / span) * 100);

  // Status
  let status: LabStatus = "ok";
  if (hasLow && value < (refLow as number)) status = "bad";
  else if (hasHigh && value > (refHigh as number)) status = "bad";
  else {
    const nearHigh = hasHigh && value >= (refHigh as number) - nearBand;
    const nearLow = hasLow && value <= (refLow as number) + nearBand;
    if (nearHigh || nearLow) status = "borderline";
  }

  return {
    hasRange: true,
    status,
    markerPct: pct(value),
    bandLeftPct: pct(bandLow),
    bandRightPct: 100 - pct(bandHigh),
  };
}

/** Short human label for a lab status (used in the right rail column). */
export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  ok: "In range",
  borderline: "Borderline",
  bad: "Out of range",
};

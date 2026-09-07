/**
 * Pure helpers for the Medications module. Kept free of Prisma/React so the
 * dose-history math stays unit-testable. See src/types/medication.ts for the
 * enum-likes + zod schemas and src/lib/actions/medications.ts for mutations.
 */

export interface DoseChangeLike {
  dose: string;
  reason?: string | null;
  effectiveAt: Date;
}

/** Dose changes sorted newest-first (stable on equal dates by original order). */
export function sortDoseChanges<T extends DoseChangeLike>(changes: T[]): T[] {
  return [...changes].sort(
    (a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime(),
  );
}

/**
 * The dose in effect at `asOf` (default now): the most recent change whose
 * `effectiveAt` is on or before `asOf`. Returns null when every change is in the
 * future (or there are none) — the medication has no effective dose yet.
 */
export function currentDoseChange<T extends DoseChangeLike>(
  changes: T[],
  asOf: Date = new Date(),
): T | null {
  const cutoff = asOf.getTime();
  let best: T | null = null;
  for (const c of changes) {
    const t = c.effectiveAt.getTime();
    if (t <= cutoff && (best === null || t > best.effectiveAt.getTime())) {
      best = c;
    }
  }
  return best;
}

/** Convenience: the current dose string, or null. */
export function currentDose<T extends DoseChangeLike>(
  changes: T[],
  asOf: Date = new Date(),
): string | null {
  return currentDoseChange(changes, asOf)?.dose ?? null;
}

import {
  CONDITION_STATUSES,
  CONDITION_STATUS_LABELS,
  RELATIVE_LABELS,
  RELATIVE_TYPES,
  asConditionStatus,
  asRelativeType,
  type ConditionStatus,
  type RelativeType,
} from "@/types/health-profile";

/**
 * Pure grouping/summarizing helpers for the health-profile module. Kept out of
 * components so they stay unit-testable (src/lib/health-profile.test.ts).
 */

export interface ConditionLike {
  status: string;
  [k: string]: unknown;
}

export interface ConditionGroup<T> {
  status: ConditionStatus;
  label: string;
  items: T[];
}

/**
 * Group conditions by status in a fixed display order (active → monitoring →
 * resolved). Empty groups are omitted. Unknown status values fall back to
 * "active" so nothing is silently dropped.
 */
export function groupConditionsByStatus<T extends ConditionLike>(
  conditions: T[],
): ConditionGroup<T>[] {
  const buckets = new Map<ConditionStatus, T[]>();
  for (const status of CONDITION_STATUSES) buckets.set(status, []);
  for (const c of conditions) buckets.get(asConditionStatus(c.status))!.push(c);
  return CONDITION_STATUSES.flatMap((status) => {
    const items = buckets.get(status)!;
    return items.length
      ? [{ status, label: CONDITION_STATUS_LABELS[status], items }]
      : [];
  });
}

export interface FamilyEntryLike {
  relative: string;
  [k: string]: unknown;
}

export interface FamilyGroup<T> {
  relative: RelativeType;
  label: string;
  items: T[];
}

/**
 * Group family-history entries by relative in a fixed display order. Empty
 * groups are omitted; unrecognized relatives fall back to "other".
 */
export function summarizeFamilyHistory<T extends FamilyEntryLike>(
  entries: T[],
): FamilyGroup<T>[] {
  const buckets = new Map<RelativeType, T[]>();
  for (const relative of RELATIVE_TYPES) buckets.set(relative, []);
  for (const e of entries) buckets.get(asRelativeType(e.relative))!.push(e);
  return RELATIVE_TYPES.flatMap((relative) => {
    const items = buckets.get(relative)!;
    return items.length
      ? [{ relative, label: RELATIVE_LABELS[relative], items }]
      : [];
  });
}

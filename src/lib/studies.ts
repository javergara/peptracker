import { STUDY_STATUSES, type StudyStatus, asStudyStatus } from "@/types/study";

/**
 * Pure helpers for the Studies log. Kept out of components so they stay
 * unit-testable (see studies.test.ts).
 */

export interface StudyLike {
  status: string;
  performedAt: Date | null;
  followUpAt: Date | null;
  createdAt: Date;
}

/** Order studies status groups surface in: scheduled → completed → follow-up. */
const STATUS_ORDER: StudyStatus[] = ["scheduled", "follow-up", "completed"];

/**
 * Group studies by normalized status, in a fixed display order (pending work
 * first). Non-mutating; empty groups are omitted.
 */
export function groupStudiesByStatus<T extends { status: string }>(
  studies: readonly T[],
): { status: StudyStatus; items: T[] }[] {
  const buckets = new Map<StudyStatus, T[]>();
  for (const s of studies) {
    const key = asStudyStatus(s.status);
    const arr = buckets.get(key);
    if (arr) arr.push(s);
    else buckets.set(key, [s]);
  }
  return STATUS_ORDER.filter((status) => buckets.has(status)).map((status) => ({
    status,
    items: buckets.get(status)!,
  }));
}

/**
 * The most relevant date to sort/display a study by: its performed date, else
 * its scheduled follow-up date, else when it was recorded. Used for ordering.
 */
export function studyDate(study: StudyLike): Date {
  return study.performedAt ?? study.followUpAt ?? study.createdAt;
}

/**
 * A follow-up is "due" when the study needs follow-up (or is scheduled) and its
 * followUpAt is on/before `asOf`. Used to surface overdue studies.
 */
export function isFollowUpDue(
  study: StudyLike,
  asOf: Date = new Date(),
): boolean {
  const status = asStudyStatus(study.status);
  if (status !== "follow-up" && status !== "scheduled") return false;
  if (!study.followUpAt) return false;
  return study.followUpAt.getTime() <= asOf.getTime();
}

/** All valid status values (re-exported for convenience). */
export const ALL_STUDY_STATUSES = STUDY_STATUSES;

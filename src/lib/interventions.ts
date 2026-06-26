/**
 * Intervention bands for the biomarker timeline overlay: cycles and supplements
 * rendered as shaded date ranges behind a marker's trend line, so a reader can
 * see (for example) a transaminase rise that coincides with an active cycle and
 * falls during the gap. Pure functions — no DB, no React (unit-tested).
 */

export type InterventionKind = "cycle" | "supplement";

export interface InterventionInput {
  id: string;
  label: string;
  kind: InterventionKind;
  start: Date;
  /** Open-ended (ongoing) interventions have a null end. */
  end: Date | null;
}

export type InterventionBand = InterventionInput;

/**
 * Keep only interventions that overlap the [rangeStart, rangeEnd] window, sorted
 * by start. An open-ended intervention (`end === null`) is treated as running to
 * the end of the window.
 */
export function buildInterventionBands(
  items: InterventionInput[],
  rangeStart: Date,
  rangeEnd: Date,
): InterventionBand[] {
  const lo = rangeStart.getTime();
  const hi = rangeEnd.getTime();
  return items
    .filter((it) => {
      const s = it.start.getTime();
      const e = (it.end ?? rangeEnd).getTime();
      return s <= hi && e >= lo;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

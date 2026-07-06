import {
  resolveItemSchedule,
  type CyclePeptideDose,
  type ScheduleConfig,
} from "@/lib/schedule";

/**
 * Builds per-peptide "lanes" for the cycle timeline / Gantt view: every cycle
 * (single-peptide or stack) contributes one or more date segments, and any
 * peptide with logged doses but no covering cycle gets a fallback "logged"
 * lane derived from its dose span. Pure — no DB, no React (unit-tested).
 *
 * All times are epoch milliseconds so results are directly serializable from a
 * Server Component into a client chart.
 */

export interface CycleTimelineCycle {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  peptideId?: string | null;
  peptide?: { id: string; name: string } | null;
  stack?: { items: { peptide: { id: string; name: string } }[] } | null;
  scheduleConfig: ScheduleConfig | null;
}

export interface CycleTimelineDoseLog {
  peptideId: string;
  peptide: { name: string };
  takenAt: Date;
  cycleId: string | null;
}

export interface Segment {
  /** null for a fallback "logged" segment with no covering cycle. */
  cycleId: string | null;
  cycleName: string;
  /** epoch ms, clipped to the [from, to] window. */
  start: number;
  end: number;
  /**
   * epoch ms — set when this segment is an ACTIVE cycle/item with a
   * configured end date still in the future, so the UI can draw a dashed
   * "projected" tail from `now` to this value. Null otherwise.
   */
  projectedEnd: number | null;
  status: string;
  /** Convenience flag: true iff `projectedEnd !== null`. */
  isProjected: boolean;
}

export interface Lane {
  peptideId: string;
  peptideName: string;
  segments: Segment[];
  /** Raw dose timestamps (epoch ms) for this peptide within the window. */
  doseTimes: number[];
}

const FALLBACK_CONFIG: ScheduleConfig = { frequency: "daily" };

export function buildCycleLanes({
  cycles,
  doseLogs,
  from,
  to,
  now,
}: {
  cycles: CycleTimelineCycle[];
  doseLogs: CycleTimelineDoseLog[];
  from: Date;
  to: Date;
  now: Date;
}): Lane[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const nowMs = now.getTime();

  const lanesById = new Map<string, Lane>();

  function laneFor(peptideId: string, peptideName: string): Lane {
    let lane = lanesById.get(peptideId);
    if (!lane) {
      lane = { peptideId, peptideName, segments: [], doseTimes: [] };
      lanesById.set(peptideId, lane);
    }
    return lane;
  }

  function pushSegment(
    peptideId: string,
    peptideName: string,
    cycleId: string,
    cycleName: string,
    status: string,
    start: Date,
    end: Date | null,
  ) {
    const startMs = start.getTime();
    // Open-ended (no configured end) clips to the window's upper bound.
    const rawEndMs = end ? end.getTime() : toMs;

    const clippedStart = Math.max(startMs, fromMs);
    const clippedEnd = Math.min(rawEndMs, toMs);
    if (clippedEnd < clippedStart) return; // entirely outside the window

    const projectedEnd =
      status === "active" && end && end.getTime() > nowMs
        ? end.getTime()
        : null;

    laneFor(peptideId, peptideName).segments.push({
      cycleId,
      cycleName,
      start: clippedStart,
      end: clippedEnd,
      projectedEnd,
      status,
      isProjected: projectedEnd !== null,
    });
  }

  for (const cycle of cycles) {
    const cfg = cycle.scheduleConfig;

    if (cycle.peptideId && cycle.peptide) {
      // Single-peptide cycle: one segment.
      pushSegment(
        cycle.peptideId,
        cycle.peptide.name,
        cycle.id,
        cycle.name,
        cycle.status,
        cycle.startDate,
        cycle.endDate,
      );
      continue;
    }

    if (cycle.stack) {
      // Stack cycle: fan out to one segment per stack peptide, using its
      // resolved (per-item, falling back to cycle-level) start/end sub-range.
      for (const stackItem of cycle.stack.items) {
        const peptide = stackItem.peptide;
        const itemCfg: CyclePeptideDose = cfg?.items?.find(
          (it) => it.peptideId === peptide.id,
        ) ?? { peptideId: peptide.id };
        const resolved = resolveItemSchedule(
          cfg ?? FALLBACK_CONFIG,
          itemCfg,
          cycle.startDate,
          cycle.endDate,
        );
        pushSegment(
          peptide.id,
          peptide.name,
          cycle.id,
          cycle.name,
          cycle.status,
          resolved.start,
          resolved.end,
        );
      }
    }
  }

  // Loose peptides: logged doses within the window with no covering cycle
  // segment become their own "logged" lane, spanning their dose min→max.
  const dosesByPeptide = new Map<string, { name: string; times: number[] }>();
  for (const log of doseLogs) {
    const t = log.takenAt.getTime();
    if (t < fromMs || t > toMs) continue;
    const entry = dosesByPeptide.get(log.peptideId) ?? {
      name: log.peptide.name,
      times: [],
    };
    entry.times.push(t);
    dosesByPeptide.set(log.peptideId, entry);
  }

  for (const [peptideId, { name, times }] of dosesByPeptide) {
    const existingLane = lanesById.get(peptideId);
    if (existingLane) {
      existingLane.doseTimes.push(...times);
      continue;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const lane = laneFor(peptideId, name);
    lane.segments.push({
      cycleId: null,
      cycleName: name,
      start: sorted[0],
      end: sorted[sorted.length - 1],
      projectedEnd: null,
      status: "logged",
      isProjected: false,
    });
    lane.doseTimes.push(...sorted);
  }

  const lanes = Array.from(lanesById.values());
  for (const lane of lanes) {
    lane.segments.sort((a, b) => a.start - b.start);
    lane.doseTimes.sort((a, b) => a - b);
  }
  lanes.sort((a, b) => a.segments[0].start - b.segments[0].start);

  return lanes;
}

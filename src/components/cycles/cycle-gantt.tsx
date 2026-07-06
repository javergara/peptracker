import { CalendarRange } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { formatDate } from "@/lib/dates";
import type { Lane } from "@/lib/cycle-timeline";
import { cn } from "@/lib/utils";

/**
 * Horizontal cycle timeline (Gantt-style): one row per peptide lane, bars for
 * each cycle segment positioned by percentage across [from, to], a dashed
 * "today" line, and a peptide-color legend. Presentational only — all the
 * date math lives in `buildCycleLanes` (src/lib/cycle-timeline.ts).
 *
 * Horizontal-scroll safe: the inner track has a min-width so mobile scrolls
 * instead of squashing bars unreadably.
 */

const LANE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function laneColor(index: number): string {
  return LANE_COLORS[index % LANE_COLORS.length];
}

function pct(t: number, from: number, to: number): number {
  if (to <= from) return 0;
  return Math.min(100, Math.max(0, ((t - from) / (to - from)) * 100));
}

/** First-of-month ticks covering [from, to] (inclusive of the from/to months). */
function monthTicks(from: number, to: number): number[] {
  const start = new Date(from);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const ticks: number[] = [];
  // Guard against pathological ranges producing unbounded loops.
  for (let i = 0; i < 60 && cursor.getTime() <= to; i++) {
    ticks.push(cursor.getTime());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

export function CycleGantt({
  lanes,
  from,
  to,
  now,
}: {
  lanes: Lane[];
  from: number;
  to: number;
  now: number;
}) {
  if (lanes.length === 0) {
    return (
      <EmptyState
        icon={<CalendarRange className="size-6" />}
        title="Nothing to show in this window"
        description="Cycles and logged doses in the selected range will appear here as a timeline."
      />
    );
  }

  const months = monthTicks(from, to);
  const showToday = now >= from && now <= to;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="relative min-w-[640px]">
          {/* Gridlines + today marker, spanning the full header + lane stack. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {months.map((m) => (
              <div
                key={m}
                className="border-border/70 absolute inset-y-0 border-l"
                style={{ left: `${pct(m, from, to)}%` }}
              />
            ))}
            {showToday ? (
              <div
                className="border-primary absolute inset-y-0 border-l-2"
                style={{ left: `${pct(now, from, to)}%` }}
              />
            ) : null}
          </div>

          {/* Month labels */}
          <div className="relative mb-2 h-4">
            {months.map((m) => (
              <span
                key={m}
                className="num text-muted-foreground absolute -translate-x-1/2 text-[10px] whitespace-nowrap"
                style={{ left: `${pct(m, from, to)}%` }}
              >
                {formatDate(new Date(m), "MMM yyyy")}
              </span>
            ))}
          </div>

          {/* Lane rows */}
          <div className="space-y-2.5">
            {lanes.map((lane, i) => {
              const color = laneColor(i);
              const isLoggedOnly = lane.segments.every(
                (s) => s.cycleId === null,
              );
              return (
                <div
                  key={lane.peptideId}
                  className="flex items-center gap-3"
                  aria-label={`${lane.peptideName} timeline`}
                >
                  <div
                    className="text-foreground w-28 shrink-0 truncate text-[12px] font-medium"
                    title={lane.peptideName}
                  >
                    {lane.peptideName}
                  </div>
                  <div className="bg-muted/40 relative h-8 flex-1 rounded-md">
                    {lane.segments.map((seg, si) => {
                      const left = pct(seg.start, from, to);
                      const width = Math.max(
                        0.5,
                        pct(seg.end, from, to) - left,
                      );
                      const label = `${seg.cycleName} — ${formatDate(new Date(seg.start))} to ${formatDate(new Date(seg.end))} (${seg.status})`;
                      return (
                        <div
                          key={`${seg.cycleId ?? "logged"}-${si}`}
                          role="img"
                          aria-label={label}
                          title={label}
                          className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: color,
                            opacity: seg.status === "logged" ? 0.5 : 0.85,
                          }}
                        >
                          {seg.isProjected && seg.projectedEnd != null ? (
                            <div
                              className="absolute inset-y-0 rounded-r-full border-r-2 border-dashed"
                              style={{
                                left: `${pct(Math.max(seg.start, now), from, to) - left}%`,
                                right: 0,
                                backgroundColor: color,
                                opacity: 0.4,
                                borderColor: color,
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                    {isLoggedOnly
                      ? lane.doseTimes.map((t, di) => (
                          <div
                            key={di}
                            className="border-card absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                            style={{
                              left: `${pct(t, from, to)}%`,
                              backgroundColor: color,
                            }}
                            aria-hidden
                          />
                        ))
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {lanes.map((lane, i) => (
          <span
            key={lane.peptideId}
            className={cn(
              "text-muted-foreground inline-flex items-center gap-1.5 text-xs",
            )}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: laneColor(i) }}
            />
            {lane.peptideName}
          </span>
        ))}
        {showToday ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <span className="border-primary h-2.5 border-l-2" />
            Today
          </span>
        ) : null}
      </div>
    </div>
  );
}

import { Eyebrow } from "@/components/common/eyebrow";
import { formatDate } from "@/lib/dates";
import {
  cycleProgress,
  resolveItemSchedule,
  type CyclePeptideDose,
  type ScheduleConfig,
} from "@/lib/schedule";

/**
 * Compact cycle-progress readout: an overall gauge (elapsed/remaining days +
 * %, projected end date) plus — for STACK cycles where a peptide runs its own
 * start/end sub-range — a small mini-progress sub-row per such peptide.
 * Reuses the `--gradient-gauge` bar pattern from the cycles list page.
 */

export interface CycleProgressCycle {
  startDate: Date;
  endDate: Date | null;
  status: string;
  scheduleConfig: ScheduleConfig | null;
  peptide?: { name: string } | null;
  stack?: {
    name: string;
    items: { peptide: { id: string; name: string } }[];
  } | null;
}

const FALLBACK_CONFIG: ScheduleConfig = { frequency: "daily" };

function GaugeBar({
  percent,
  muted = false,
}: {
  percent: number;
  muted?: boolean;
}) {
  return (
    <div
      className={
        muted
          ? "bg-accent h-1.5 overflow-hidden rounded-full"
          : "bg-accent h-2 overflow-hidden rounded-full"
      }
    >
      <div
        className="h-full rounded-full [background:var(--gradient-gauge)]"
        style={{ width: `${percent}%`, opacity: muted ? 0.8 : 1 }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export function CycleProgress({
  cycle,
  now,
}: {
  cycle: CycleProgressCycle;
  now: Date;
}) {
  const cfg = cycle.scheduleConfig;
  const overall = cycleProgress(cycle.startDate, cycle.endDate, now);
  const title = cycle.peptide?.name ?? cycle.stack?.name ?? "Protocol";

  const subRows = (cycle.stack?.items ?? [])
    .map((item) => {
      const itemCfg: CyclePeptideDose | undefined = cfg?.items?.find(
        (it) => it.peptideId === item.peptide.id,
      );
      // Only surface a sub-row when this peptide has an explicit sub-range —
      // otherwise it's identical to the overall cycle bar above (redundant).
      if (!itemCfg?.startDate && !itemCfg?.endDate) return null;

      const resolved = resolveItemSchedule(
        cfg ?? FALLBACK_CONFIG,
        itemCfg,
        cycle.startDate,
        cycle.endDate,
      );
      const prog = cycleProgress(resolved.start, resolved.end, now);
      const remainingDays =
        resolved.end && prog.totalDays != null
          ? Math.max(0, prog.totalDays - prog.daysElapsed)
          : null;

      return {
        peptideId: item.peptide.id,
        peptideName: item.peptide.name,
        percent: prog.percent,
        remainingDays,
        end: resolved.end,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <Eyebrow>Progress</Eyebrow>
          <span className="num text-muted-foreground text-[11px]">
            {overall.percent != null ? `${overall.percent}% · ` : ""}
            day {overall.daysElapsed + 1}
            {overall.totalDays != null ? ` of ${overall.totalDays}` : ""}
          </span>
        </div>

        {overall.percent != null ? (
          <GaugeBar percent={overall.percent} />
        ) : (
          <p className="text-muted-foreground text-xs">
            Ongoing — no end date set.
          </p>
        )}

        <p className="text-muted-foreground mt-1.5 text-[11px]">
          {cycle.endDate
            ? `Projected end ${formatDate(cycle.endDate)}`
            : "Open-ended"}
        </p>
      </div>

      {subRows.length > 0 ? (
        <div className="border-border space-y-3 border-t pt-3">
          {subRows.map((row) => (
            <div key={row.peptideId}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-foreground text-xs font-medium">
                  {row.peptideName}
                </span>
                <span className="num text-muted-foreground text-[11px]">
                  {row.percent != null ? `${row.percent}% · ` : ""}
                  {row.remainingDays != null
                    ? `ends in ${row.remainingDays}d`
                    : row.end
                      ? formatDate(row.end)
                      : "ongoing"}
                </span>
              </div>
              <GaugeBar percent={row.percent ?? 0} muted />
            </div>
          ))}
        </div>
      ) : null}

      <span className="sr-only">{title} progress</span>
    </div>
  );
}

import { CalendarCheck, Flame } from "lucide-react";

import { Eyebrow } from "@/components/common/eyebrow";
import type { WeeklySummary } from "@/lib/food-report";

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-foreground text-2xl font-semibold">
          {value}
        </span>
        {unit ? (
          <span className="text-muted-foreground text-xs">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

/** 7-day nutrition report: averages, adherence, streak, and a per-day bar. */
export function WeeklyReport({
  summary,
  streak,
  days,
}: {
  summary: WeeklySummary;
  streak: number;
  /** Oldest→newest days for the bar (label + calories). */
  days: { label: string; calories: number }[];
}) {
  const goal = summary.calorieGoal;
  const maxCal = Math.max(goal ?? 0, ...days.map((d) => d.calories), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Avg calories"
          value={String(summary.avg.calories)}
          unit="kcal"
        />
        <Stat
          label="Avg protein"
          value={String(Math.round(summary.avg.protein))}
          unit="g"
        />
        <Stat label="Days logged" value={`${summary.daysLogged}`} unit="/ 7" />
        <Stat
          label="On-goal days"
          value={goal ? `${summary.daysOnGoal}` : "—"}
          unit={goal ? "/ 7" : undefined}
        />
      </div>

      <div className="card-surface rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <Eyebrow className="flex items-center gap-1.5">
            <CalendarCheck className="size-3.5" />
            Last 7 days
          </Eyebrow>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <Flame className="size-4 text-[var(--warn)]" />
            <span className="num font-medium">{streak}</span>
            day streak
          </span>
        </div>
        <div
          className="flex items-end justify-between gap-2"
          style={{ height: 120 }}
        >
          {days.map((d, i) => {
            const h = Math.max(4, Math.round((d.calories / maxCal) * 104));
            const onGoal =
              goal != null &&
              d.calories > 0 &&
              Math.abs(d.calories - goal) <= goal * 0.1;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="num text-muted-foreground text-[10px]">
                  {d.calories > 0 ? d.calories : ""}
                </span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: h,
                    background: onGoal ? "var(--ok)" : "var(--gradient-gauge)",
                    opacity: d.calories > 0 ? 1 : 0.25,
                  }}
                />
                <span className="text-muted-foreground text-[10px]">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
        {goal ? (
          <p className="text-muted-foreground mt-3 text-xs">
            <span className="num">{goal}</span> kcal goal · green bars landed
            within ±10%.
          </p>
        ) : null}
      </div>
    </div>
  );
}

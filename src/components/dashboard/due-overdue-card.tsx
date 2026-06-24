import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodaysDoses, isDoseDay, type CycleLike } from "@/lib/schedule";
import { isWithinRange } from "@/lib/dates";

interface OverdueDay {
  date: Date;
  missed: number;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * For each of the past 7 days (excluding today), count scheduled doses that
 * were not covered by logged doses. A day is "overdue" when expected > logged.
 */
export function computeOverdue(
  cycles: CycleLike[],
  logs: { takenAt: Date }[],
  now: Date,
): OverdueDay[] {
  const result: OverdueDay[] = [];

  for (let i = 1; i <= 7; i++) {
    const day = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - i),
    );

    let expected = 0;
    for (const c of cycles) {
      if (c.status !== "active") continue;
      if (!isWithinRange(day, c.startDate, c.endDate)) continue;
      const cfg = c.scheduleConfig;
      if (!cfg) continue;
      if (isDoseDay(cfg, day, c.startDate)) {
        expected += cfg.timesPerDay ?? 1;
      }
    }

    if (expected === 0) continue;

    const logged = logs.filter((l) => {
      const d = startOfDay(l.takenAt);
      return d.getTime() === day.getTime();
    }).length;

    const missed = expected - logged;
    if (missed > 0) result.push({ date: day, missed });
  }

  return result;
}

export function DueOverdueCard({
  cycles,
  logs,
  now,
}: {
  cycles: CycleLike[];
  logs: { takenAt: Date }[];
  now: Date;
}) {
  const todays = getTodaysDoses(cycles, now);
  const totalDueToday = todays.reduce((s, t) => s + t.times, 0);
  const overdueDays = computeOverdue(cycles, logs, now);
  const totalOverdue = overdueDays.reduce((s, d) => s + d.missed, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Due &amp; Overdue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Today */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-primary size-4 shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{totalDueToday}</span>{" "}
            {totalDueToday === 1 ? "dose" : "doses"} due today
          </span>
        </div>

        {/* Overdue summary */}
        {totalOverdue > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-destructive size-4 shrink-0" />
              <span className="text-sm">
                <span className="font-semibold">{totalOverdue}</span>{" "}
                {totalOverdue === 1 ? "dose" : "doses"} missed in the last 7
                days
              </span>
            </div>
            <ul className="ml-6 space-y-0.5">
              {overdueDays.map(({ date, missed }) => (
                <li
                  key={date.toISOString()}
                  className="text-muted-foreground text-xs"
                >
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {" — "}
                  {missed} missed
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No missed doses in the last 7 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

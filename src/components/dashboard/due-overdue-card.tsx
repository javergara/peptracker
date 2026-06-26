import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodaysDoses, type CycleLike } from "@/lib/schedule";
import { computeOverdue } from "@/lib/adherence";

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

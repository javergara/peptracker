import Link from "next/link";
import { CalendarClock } from "lucide-react";

import type { OverdueDay } from "@/lib/adherence";
import { formatDate } from "@/lib/dates";

/**
 * Dashboard missed-doses warning: scheduled doses in the last 7 days that were
 * never logged (from computeOverdue). Renders nothing when fully on schedule.
 */
export function MissedDosesAlert({ overdue }: { overdue: OverdueDay[] }) {
  const total = overdue.reduce((s, d) => s + d.missed, 0);
  if (total === 0) return null;

  return (
    <section className="bg-warn-wash border-warn/30 mb-[18px] rounded-[18px] border p-5">
      <div className="text-warn-foreground flex items-center gap-2">
        <CalendarClock className="size-4 shrink-0" />
        <h2 className="font-display text-[15px] font-semibold">
          {total} missed {total === 1 ? "dose" : "doses"} in the last 7 days
        </h2>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {overdue.map(({ date, missed }) => (
          <li
            key={date.toISOString()}
            className="text-muted-foreground text-sm"
          >
            <span className="num text-foreground font-medium">
              {formatDate(date, "EEE, MMM d")}
            </span>{" "}
            — {missed} missed
          </li>
        ))}
      </ul>
      <Link
        href="/calendar"
        className="text-warn-foreground mt-3 inline-block text-xs font-semibold underline underline-offset-4"
      >
        Review on the calendar →
      </Link>
    </section>
  );
}

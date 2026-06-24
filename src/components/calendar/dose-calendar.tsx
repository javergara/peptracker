"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Syringe } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CalendarDose {
  id: string;
  peptideName: string;
  amount: number;
  unit: string;
  takenAtISO: string;
  site: string | null;
  cycleName: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthHref(year: number, monthIndex: number) {
  // monthIndex may be -1 or 12; normalize.
  const d = new Date(year, monthIndex, 1);
  return `/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DoseCalendar({
  year,
  monthIndex,
  doses,
}: {
  year: number;
  monthIndex: number;
  doses: CalendarDose[];
}) {
  // Group doses by day-of-month (local time).
  const byDay = React.useMemo(() => {
    const map = new Map<number, CalendarDose[]>();
    for (const d of doses) {
      const day = new Date(d.takenAtISO).getDate();
      const arr = map.get(day) ?? [];
      arr.push(d);
      map.set(day, arr);
    }
    return map;
  }, [doses]);

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayDate = today.getDate();

  const [selected, setSelected] = React.useState<number>(
    isThisMonth ? todayDate : 1,
  );
  const selectedDoses = byDay.get(selected) ?? [];

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Link
              href={monthHref(year, monthIndex - 1)}
              aria-label="Previous month"
              className="hover:bg-accent rounded-lg border p-1.5"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={monthHref(today.getFullYear(), today.getMonth())}
              className="hover:bg-accent rounded-lg border px-2.5 py-1.5 text-sm"
            >
              Today
            </Link>
            <Link
              href={monthHref(year, monthIndex + 1)}
              aria-label="Next month"
              className="hover:bg-accent rounded-lg border p-1.5"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-muted-foreground py-1 text-center text-xs font-medium"
            >
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null)
              return <div key={`e${i}`} className="aspect-square" />;
            const dayDoses = byDay.get(day) ?? [];
            const isToday = isThisMonth && day === todayDate;
            const isSelected = day === selected;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start rounded-lg border p-1 text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent border-transparent",
                  isToday && !isSelected && "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday &&
                      "bg-primary text-primary-foreground font-semibold",
                  )}
                >
                  {day}
                </span>
                {dayDoses.length > 0 ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    <Syringe className="size-2.5" />
                    {dayDoses.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="space-y-3">
        <h3 className="font-semibold">
          {new Date(year, monthIndex, selected).toLocaleString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </h3>
        {selectedDoses.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No doses logged on this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedDoses
              .sort((a, b) => a.takenAtISO.localeCompare(b.takenAtISO))
              .map((d) => (
                <li key={d.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.peptideName}</span>
                    <span className="text-muted-foreground">
                      {d.amount} {d.unit}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {new Date(d.takenAtISO).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {d.site ? ` · ${d.site}` : ""}
                    {d.cycleName ? ` · ${d.cycleName}` : ""}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

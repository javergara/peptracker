"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { logDose } from "@/lib/actions/doses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { averageMood, moodFace } from "@/lib/mood";

export interface CalendarDose {
  id: string;
  peptideName: string;
  amount: number;
  unit: string;
  takenAtISO: string;
  site: string | null;
  cycleName: string | null;
  mood: number | null;
  profileName: string;
  profileColor: string | null;
}

interface PeptideOption {
  id: string;
  name: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FALLBACK_ACCENT = "#10b981";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2";

function ProfileDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: color ?? FALLBACK_ACCENT }}
    />
  );
}

/** Distinct profiles (with dose counts) present in a set of doses. */
function profilesIn(doses: CalendarDose[]) {
  const m = new Map<
    string,
    { name: string; color: string | null; count: number }
  >();
  for (const d of doses) {
    const e = m.get(d.profileName) ?? {
      name: d.profileName,
      color: d.profileColor,
      count: 0,
    };
    e.count += 1;
    m.set(d.profileName, e);
  }
  return Array.from(m.values());
}

export function DoseCalendar({
  year,
  monthIndex,
  doses,
  accentColor,
  profileName,
  peptides,
  multiProfile = false,
  legend,
  view,
}: {
  year: number;
  monthIndex: number;
  doses: CalendarDose[];
  accentColor: string | null;
  profileName: string;
  peptides: PeptideOption[];
  multiProfile?: boolean;
  legend: { name: string; color: string | null }[];
  view?: "all";
}) {
  const accent = accentColor ?? FALLBACK_ACCENT;
  const [isPending, startTransition] = useTransition();
  const [showLog, setShowLog] = React.useState(false);

  const viewSuffix = view === "all" ? "&view=all" : "";
  function monthHref(y: number, m: number) {
    const d = new Date(y, m, 1);
    return `/calendar?month=${d.getFullYear()}-${pad(d.getMonth() + 1)}${viewSuffix}`;
  }

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

  async function handleQuickLog(formData: FormData) {
    startTransition(async () => {
      try {
        await logDose(formData);
        toast.success("Dose logged");
        setShowLog(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not log dose.");
      }
    });
  }

  const selectedTakenAt = `${year}-${pad(monthIndex + 1)}-${pad(selected)}T12:00`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">{monthLabel}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {legend.map((p) => (
                <span
                  key={p.name}
                  className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
                >
                  <ProfileDot color={p.color} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
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
            const profs = multiProfile ? profilesIn(dayDoses) : [];
            const dayFace = moodFace(averageMood(dayDoses.map((d) => d.mood)));
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
                  multiProfile ? (
                    <span className="mt-1 flex items-center gap-0.5">
                      {profs.slice(0, 4).map((p) => (
                        <span
                          key={p.name}
                          title={`${p.name}: ${p.count}`}
                          className="size-2 rounded-full"
                          style={{ background: p.color ?? FALLBACK_ACCENT }}
                        />
                      ))}
                      {profs.length > 4 ? (
                        <span className="text-muted-foreground text-[9px]">
                          +{profs.length - 4}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: accent }}
                      />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: accent }}
                      >
                        {dayDoses.length}
                      </span>
                    </span>
                  )
                ) : null}
                {dayFace ? (
                  <span
                    className="text-sm leading-none"
                    title={`Mood: ${dayFace.label}`}
                  >
                    {dayFace.emoji}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {new Date(year, monthIndex, selected).toLocaleString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          {!multiProfile ? (
            <Button
              type="button"
              size="sm"
              variant={showLog ? "secondary" : "outline"}
              onClick={() => setShowLog((v) => !v)}
            >
              <Plus className="size-4" />
              Log
            </Button>
          ) : null}
        </div>

        {showLog && !multiProfile ? (
          <form
            action={handleQuickLog}
            className="bg-muted/30 space-y-2 rounded-lg border p-3"
          >
            <input type="hidden" name="takenAt" value={selectedTakenAt} />
            <select name="peptideId" required className={inputCls}>
              {peptides.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="amount"
                type="number"
                step="any"
                min="0"
                required
                placeholder="Amount"
                className={inputCls}
              />
              <select name="unit" defaultValue="mcg" className={inputCls}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Logging…" : `Log dose for ${profileName}`}
            </Button>
          </form>
        ) : null}

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
                    <span className="flex items-center gap-1.5 font-medium">
                      {multiProfile ? (
                        <ProfileDot color={d.profileColor} />
                      ) : null}
                      {d.peptideName}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      {d.amount} {d.unit}
                      {moodFace(d.mood) ? (
                        <span title={`Mood: ${moodFace(d.mood)!.label}`}>
                          {moodFace(d.mood)!.emoji}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {multiProfile ? `${d.profileName} · ` : ""}
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

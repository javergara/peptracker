"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { logDose } from "@/lib/actions/doses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { averageMood, moodFace } from "@/lib/mood";
import { suggestNextSite } from "@/lib/sites";

export interface CalendarDose {
  id: string;
  peptideName: string;
  amount: number;
  unit: string;
  takenAtISO: string;
  site: string | null;
  cycleName: string | null;
  mood: number | null;
  energy: number | null;
  notes: string | null;
  sideEffects: string[];
  profileName: string;
  profileColor: string | null;
}

interface PeptideOption {
  id: string;
  name: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FALLBACK_ACCENT = "#7C3AED";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Compact peptide name for tight cells: drop any "(parenthetical)" / alias tail. */
function shortPeptide(name: string) {
  return name.split(" (")[0].split(",")[0].trim();
}

/** Abbreviate an injection site for tight cells: "Abdomen L" -> "Abd L", "Love handle R" -> "LH R". */
function shortSite(site: string) {
  const side = site.match(/\s([LR])$/)?.[1] ?? "";
  const base = site.replace(/\s[LR]$/, "");
  const abbr =
    base === "Love handle" ? "LH" : base === "Abdomen" ? "Abd" : base;
  return side ? `${abbr} ${side}` : abbr;
}

/** Sort doses chronologically (by time, then logged order via id). */
function byTime(a: CalendarDose, b: CalendarDose) {
  return a.takenAtISO.localeCompare(b.takenAtISO) || a.id.localeCompare(b.id);
}

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

  // Site rotation hint (single-profile only): the most recent dose with a
  // recorded site in this month drives the next suggested site.
  const lastSite = multiProfile
    ? null
    : (doses
        .filter((d) => d.site)
        .slice()
        .sort(byTime)
        .at(-1)?.site ?? null);
  const nextSite = lastSite ? suggestNextSite(lastSite) : null;

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

  // Backfilling a past day defaults to local noon (so it can't drift across a
  // date boundary); logging *today* stamps the real current local time.
  const selectedIsToday = isThisMonth && selected === todayDate;
  const selectedTakenAt = selectedIsToday
    ? `${year}-${pad(monthIndex + 1)}-${pad(selected)}T${pad(today.getHours())}:${pad(today.getMinutes())}`
    : `${year}-${pad(monthIndex + 1)}-${pad(selected)}T12:00`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-display text-foreground text-[17px] font-semibold">
              {monthLabel}
            </h2>
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

        <div className="hidden grid-cols-7 gap-1 sm:grid">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="eyebrow text-muted-foreground py-1 text-center"
            >
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null)
              return <div key={`e${i}`} className="min-h-[4.75rem]" />;
            const dayDoses = (byDay.get(day) ?? []).slice().sort(byTime);
            const isToday = isThisMonth && day === todayDate;
            const isSelected = day === selected;
            const profs = multiProfile ? profilesIn(dayDoses) : [];
            const dayFace = moodFace(averageMood(dayDoses.map((d) => d.mood)));
            const MAX = 3;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-label={`${monthLabel} ${day}${dayDoses.length ? `, ${dayDoses.length} doses` : ""}`}
                className={cn(
                  "focus-visible:ring-ring flex min-h-[4.75rem] flex-col gap-1 rounded-[10px] border p-1.5 text-left transition-shadow focus-visible:ring-2 focus-visible:outline-none",
                  isSelected
                    ? "border-primary bg-primary/5 [box-shadow:var(--shadow-card)]"
                    : "hover:border-border border-transparent hover:[box-shadow:var(--shadow-card-hover)]",
                  isToday && !isSelected && "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "num flex size-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground",
                    )}
                  >
                    {day}
                  </span>
                  {dayFace ? (
                    <span
                      className="text-sm leading-none"
                      title={`Mood: ${dayFace.label}`}
                    >
                      {dayFace.emoji}
                    </span>
                  ) : null}
                </div>

                {dayDoses.length === 0 ? null : multiProfile ? (
                  <span className="flex flex-wrap items-center gap-0.5">
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
                  <ul className="min-w-0 space-y-0.5">
                    {dayDoses.slice(0, MAX).map((d) => (
                      <li
                        key={d.id}
                        title={`${d.peptideName} — ${d.amount} ${d.unit}${d.site ? ` · ${d.site}` : ""}`}
                        className="leading-tight"
                      >
                        <div className="flex items-baseline gap-1 text-[10px]">
                          <span
                            className="mt-[3px] size-1.5 shrink-0 self-start rounded-full"
                            style={{ background: accent }}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {shortPeptide(d.peptideName)}
                          </span>
                          <span className="num text-muted-foreground shrink-0">
                            {d.amount}
                            {d.unit}
                          </span>
                        </div>
                        {d.site ? (
                          <div className="text-muted-foreground/80 truncate pl-[10px] text-[9px]">
                            {shortSite(d.site)}
                          </div>
                        ) : null}
                      </li>
                    ))}
                    {dayDoses.length > MAX ? (
                      <li className="text-muted-foreground text-[9px]">
                        +{dayDoses.length - MAX} more
                      </li>
                    ) : null}
                  </ul>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: an agenda list (the 7-col grid is too cramped on phones). */}
        <div className="space-y-2 sm:hidden">
          {(() => {
            const agenda = Array.from({ length: daysInMonth }, (_, i) => i + 1)
              .map((day) => ({
                day,
                dayDoses: (byDay.get(day) ?? []).slice().sort(byTime),
              }))
              .filter((d) => d.dayDoses.length > 0);
            if (agenda.length === 0) {
              return (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  No doses logged this month.
                </p>
              );
            }
            return agenda.map(({ day, dayDoses }) => {
              const face = moodFace(averageMood(dayDoses.map((d) => d.mood)));
              const isToday = isThisMonth && day === todayDate;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    "focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg border p-2.5 text-left focus-visible:ring-2 focus-visible:outline-none",
                    day === selected
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex w-9 shrink-0 flex-col items-center">
                    <span className="eyebrow text-muted-foreground">
                      {new Date(year, monthIndex, day).toLocaleString(
                        undefined,
                        { weekday: "short" },
                      )}
                    </span>
                    <span
                      className={cn(
                        "num text-lg font-semibold",
                        isToday ? "text-primary" : "text-foreground",
                      )}
                    >
                      {day}
                    </span>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-0.5">
                    {dayDoses.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-baseline gap-1.5 text-xs"
                      >
                        {multiProfile ? (
                          <ProfileDot color={d.profileColor} />
                        ) : (
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: accent }}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {shortPeptide(d.peptideName)}
                        </span>
                        {d.site ? (
                          <span className="text-muted-foreground/80 shrink-0 text-[10px]">
                            {shortSite(d.site)}
                          </span>
                        ) : null}
                        <span className="num text-muted-foreground shrink-0">
                          {d.amount}
                          {d.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {face ? (
                    <span className="text-base" title={`Mood: ${face.label}`}>
                      {face.emoji}
                    </span>
                  ) : null}
                </button>
              );
            });
          })()}
        </div>
      </div>

      <aside className="space-y-3">
        {nextSite ? (
          <div className="card-surface rounded-[14px] p-3 [box-shadow:var(--shadow-card)]">
            <div className="eyebrow text-muted-foreground">SITE ROTATION</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Last used</span>
              <span className="text-foreground font-medium">{lastSite}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-xs">
                Next suggested
              </span>
              <span className="text-primary font-semibold">{nextSite}</span>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow text-muted-foreground">SELECTED DAY</div>
            <h3 className="font-display text-foreground mt-0.5 text-[15px] font-semibold">
              {new Date(year, monthIndex, selected).toLocaleString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
          </div>
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
            className="card-surface space-y-2 rounded-[14px] p-3"
          >
            <input type="hidden" name="takenAt" value={selectedTakenAt} />
            <Select name="peptideId" required>
              <SelectTrigger className="px-2.5 py-1.5">
                <SelectValue>
                  {(value) =>
                    value
                      ? (peptides.find((p) => p.id === value)?.name ?? value)
                      : "— Select peptide —"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {peptides.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                name="amount"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                required
                placeholder="Amount"
                className="px-2.5 py-1.5"
              />
              <Select name="unit" defaultValue="mcg">
                <SelectTrigger className="px-2.5 py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
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
          <p className="text-muted-foreground rounded-[10px] border border-dashed p-4 text-sm">
            No doses logged on this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedDoses
              .slice()
              .sort(
                (a, b) =>
                  a.takenAtISO.localeCompare(b.takenAtISO) ||
                  a.id.localeCompare(b.id),
              )
              .map((d) => (
                <li
                  key={d.id}
                  className="card-surface rounded-[14px] p-3 text-sm [box-shadow:var(--shadow-card)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground flex items-center gap-1.5 font-medium">
                      {multiProfile ? (
                        <ProfileDot color={d.profileColor} />
                      ) : null}
                      {d.peptideName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="num text-foreground text-[13px]">
                        {d.amount} {d.unit}
                      </span>
                      {moodFace(d.mood) ? (
                        <span title={`Mood: ${moodFace(d.mood)!.label}`}>
                          {moodFace(d.mood)!.emoji}
                        </span>
                      ) : null}
                      {d.energy != null ? (
                        <span
                          className="num text-muted-foreground text-[11px]"
                          title={`Energy: ${d.energy}/5`}
                        >
                          ⚡{d.energy}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {multiProfile ? `${d.profileName} · ` : ""}
                    <span className="num">
                      {new Date(d.takenAtISO).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {d.site ? ` · ${d.site}` : ""}
                    {d.cycleName ? ` · ${d.cycleName}` : ""}
                  </div>
                  {d.sideEffects.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {d.sideEffects.map((se) => (
                        <span
                          key={se}
                          className="bg-warn-wash text-warn-foreground rounded-full px-2 py-0.5 text-[10px] font-medium"
                        >
                          {se}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {d.notes ? (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      {d.notes}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

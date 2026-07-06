import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { DoseCalendar } from "@/components/calendar/dose-calendar";
import { CycleGantt } from "@/components/cycles/cycle-gantt";
import { Button } from "@/components/ui/button";
import { getAllUsers } from "@/lib/active-user";
import {
  getAllCyclesForTimeline,
  getAllDoseLogsInRange,
  getCurrentUser,
  getCyclesForTimeline,
  getDoseLogsInRange,
  listPeptides,
} from "@/lib/queries";
import { buildCycleLanes } from "@/lib/cycle-timeline";
import type { ScheduleConfig } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

function parseMonth(value?: string): { year: number; monthIndex: number } {
  const now = new Date();
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; span?: string }>;
}) {
  const { month, view, span: spanParam } = await searchParams;
  const { year, monthIndex } = parseMonth(month);
  const isAll = view === "all";
  const span: "month" | "year" = spanParam === "year" ? "year" : "month";

  const [user, peptides] = await Promise.all([
    getCurrentUser(),
    listPeptides(),
  ]);

  const monthParam = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const spanSuffix = span === "year" ? "&span=year" : "";
  const viewToggle = [
    {
      label: "This profile",
      href: `/calendar?month=${monthParam}${spanSuffix}`,
      on: !isAll,
    },
    {
      label: "All profiles",
      href: `/calendar?month=${monthParam}&view=all${spanSuffix}`,
      on: isAll,
    },
  ];
  const viewSuffix = isAll ? "&view=all" : "";
  const spanToggle = [
    {
      label: "Month",
      href: `/calendar?month=${monthParam}${viewSuffix}`,
      on: span === "month",
    },
    {
      label: "Year",
      href: `/calendar?month=${monthParam}${viewSuffix}&span=year`,
      on: span === "year",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Calendar"
        description="Your logged doses, visualized by day. Compare profiles with the overlay."
        accentColor={isAll ? undefined : (user.color ?? undefined)}
        actions={
          <Button render={<Link href="/log" />}>
            <Plus className="size-4" />
            Log dose
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="border-border bg-card inline-flex rounded-[10px] border p-0.5 text-sm [box-shadow:var(--shadow-card)]">
          {viewToggle.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={cn(
                "rounded-[8px] px-3 py-1.5 font-medium transition-colors",
                t.on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="border-border bg-card inline-flex rounded-[10px] border p-0.5 text-sm [box-shadow:var(--shadow-card)]">
          {spanToggle.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={cn(
                "rounded-[8px] px-3 py-1.5 font-medium transition-colors",
                t.on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {span === "year" ? (
        <YearView isAll={isAll} />
      ) : (
        <MonthView
          year={year}
          monthIndex={monthIndex}
          isAll={isAll}
          user={user}
          peptides={peptides.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}

async function YearView({ isAll }: { isAll: boolean }) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [cycles, doseLogs] = isAll
    ? await Promise.all([
        getAllCyclesForTimeline(),
        getAllDoseLogsInRange(yearStart, now),
      ])
    : await Promise.all([
        getCyclesForTimeline(),
        getDoseLogsInRange(yearStart, now),
      ]);

  const lanes = buildCycleLanes({
    cycles: cycles.map((c) => ({
      ...c,
      scheduleConfig: c.scheduleConfig as ScheduleConfig | null,
    })),
    doseLogs,
    from: yearStart,
    to: now,
    now,
  });

  return (
    <div className="card-surface rounded-[20px] p-4 [box-shadow:var(--shadow-card)] sm:p-6">
      <Eyebrow className="mb-4">This year</Eyebrow>
      <CycleGantt
        lanes={lanes}
        from={yearStart.getTime()}
        to={now.getTime()}
        now={now.getTime()}
      />
    </div>
  );
}

async function MonthView({
  year,
  monthIndex,
  isAll,
  user,
  peptides,
}: {
  year: number;
  monthIndex: number;
  isAll: boolean;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  peptides: { id: string; name: string }[];
}) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  let doses;
  let legend: { name: string; color: string | null }[];

  if (isAll) {
    const [logs, users] = await Promise.all([
      getAllDoseLogsInRange(start, end),
      getAllUsers(),
    ]);
    doses = logs.map((d) => ({
      id: d.id,
      peptideName: d.peptide.name,
      amount: d.amount,
      unit: d.unit,
      takenAtISO: d.takenAt.toISOString(),
      site: d.site,
      cycleName: d.cycle?.name ?? null,
      mood: d.mood,
      energy: d.energy,
      notes: d.notes,
      sideEffects: asStringArray(d.sideEffects),
      profileName: d.user?.name ?? "Unknown",
      profileColor: d.user?.color ?? null,
    }));
    legend = users.map((u) => ({ name: u.name, color: u.color }));
  } else {
    const logs = await getDoseLogsInRange(start, end);
    doses = logs.map((d) => ({
      id: d.id,
      peptideName: d.peptide.name,
      amount: d.amount,
      unit: d.unit,
      takenAtISO: d.takenAt.toISOString(),
      site: d.site,
      cycleName: d.cycle?.name ?? null,
      mood: d.mood,
      energy: d.energy,
      notes: d.notes,
      sideEffects: asStringArray(d.sideEffects),
      profileName: user.name,
      profileColor: user.color,
    }));
    legend = [{ name: user.name, color: user.color }];
  }

  return (
    <div className="card-surface rounded-[20px] p-4 [box-shadow:var(--shadow-card)] sm:p-6">
      <DoseCalendar
        year={year}
        monthIndex={monthIndex}
        doses={doses}
        multiProfile={isAll}
        legend={legend}
        view={isAll ? "all" : undefined}
        accentColor={user.color}
        profileName={user.name}
        peptides={peptides}
      />
    </div>
  );
}

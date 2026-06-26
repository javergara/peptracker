import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { DoseCalendar } from "@/components/calendar/dose-calendar";
import { Button } from "@/components/ui/button";
import { getAllUsers } from "@/lib/active-user";
import {
  getAllDoseLogsInRange,
  getCurrentUser,
  getDoseLogsInRange,
  listPeptides,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

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
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month, view } = await searchParams;
  const { year, monthIndex } = parseMonth(month);
  const isAll = view === "all";

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const [user, peptides] = await Promise.all([
    getCurrentUser(),
    listPeptides(),
  ]);

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
      profileName: user.name,
      profileColor: user.color,
    }));
    legend = [{ name: user.name, color: user.color }];
  }

  const monthParam = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const toggle = [
    {
      label: "This profile",
      href: `/calendar?month=${monthParam}`,
      on: !isAll,
    },
    {
      label: "All profiles",
      href: `/calendar?month=${monthParam}&view=all`,
      on: isAll,
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

      <div className="mb-4 inline-flex rounded-[10px] border border-[#ECE8F7] bg-white p-0.5 text-sm [box-shadow:var(--shadow-card)]">
        {toggle.map((t) => (
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
          peptides={peptides.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}

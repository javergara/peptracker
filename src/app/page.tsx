import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Flame,
  Plus,
  Syringe,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { DueOverdueCard } from "@/components/dashboard/due-overdue-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getActiveCycles,
  getCurrentUser,
  getDoseLogsInRange,
  getRecentDoseLogs,
  listPeptides,
} from "@/lib/queries";
import { computeAdherence } from "@/lib/adherence";
import {
  cycleProgress,
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";
import { formatDate } from "@/lib/dates";

export default async function DashboardPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [user, activeCycles, peptides, recentDoses, rangeLogs] =
    await Promise.all([
      getCurrentUser(),
      getActiveCycles(),
      listPeptides(),
      getRecentDoseLogs(8),
      getDoseLogsInRange(thirtyDaysAgo, now),
    ]);

  const accent = user.color ?? undefined;

  const cycleLikes: CycleLike[] = activeCycles.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    scheduleConfig: c.scheduleConfig as ScheduleConfig | null,
    peptide: c.peptide ? { name: c.peptide.name } : null,
    stack: c.stack ? { name: c.stack.name } : null,
  }));

  const todays = getTodaysDoses(cycleLikes, now);
  const dosesThisWeek = recentDoses.filter((d) => d.takenAt >= weekAgo).length;
  const adherence = computeAdherence(cycleLikes, rangeLogs, 30, now);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={`${user.name}'s protocols at a glance.`}
        accentColor={accent}
        actions={
          <Button render={<Link href="/cycles/new" />}>
            <Plus className="size-4" />
            New cycle
          </Button>
        }
      />
      <Disclaimer className="mb-6" />

      {/* Stat cards — 6 across on large screens */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active cycles"
          value={activeCycles.length}
          icon={<CalendarRange className="size-5" />}
        />
        <StatCard
          label="Doses this week"
          value={dosesThisWeek}
          icon={<Syringe className="size-5" />}
        />
        <StatCard
          label="Today's doses due"
          value={todays.reduce((sum, t) => sum + t.times, 0)}
          icon={<Activity className="size-5" />}
        />
        <StatCard
          label="Peptides in library"
          value={peptides.length}
          icon={<BookOpen className="size-5" />}
        />
        {/* Adherence + streak inline — reuse AdherenceCards for the two extra slots */}
        <StatCard
          label="30-day adherence"
          value={adherence.percent !== null ? `${adherence.percent}%` : "—"}
          icon={<Activity className="size-5" />}
          hint={
            adherence.percent !== null
              ? `${adherence.logged} of ${adherence.expected} doses`
              : "No scheduled doses"
          }
        />
        <StatCard
          label="Current streak"
          value={adherence.streak === 0 ? "—" : `${adherence.streak}d`}
          icon={<Flame className="size-5" />}
          hint={
            adherence.streak > 0
              ? "Consecutive days on schedule"
              : "Log a dose to start"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s doses</CardTitle>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-6" />}
                title="Nothing due today"
                description="Active cycles with a dose scheduled for today will appear here."
              />
            ) : (
              <ul className="divide-y">
                {todays.map(({ cycle, times }) => (
                  <li
                    key={cycle.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <Link
                        href={`/cycles/${cycle.id}`}
                        className="font-medium hover:underline"
                      >
                        {cycle.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {cycle.peptide?.name ?? cycle.stack?.name ?? "—"}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {times}× today
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {cycleLikes.length === 0 ? (
              <EmptyState
                icon={<CalendarRange className="size-6" />}
                title="No active cycles"
                description="Start a cycle from a peptide or stack to track it here."
                action={
                  <Button size="sm" render={<Link href="/cycles/new" />}>
                    New cycle
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-4">
                {cycleLikes.map((c) => {
                  const prog = cycleProgress(c.startDate, c.endDate);
                  return (
                    <li key={c.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          href={`/cycles/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {prog.percent !== null
                            ? `${prog.percent}%`
                            : `Day ${prog.daysElapsed + 1}`}
                        </span>
                      </div>
                      <Progress
                        value={prog.percent ?? 0}
                        style={
                          accent
                            ? ({ "--pc": accent } as CSSProperties)
                            : undefined
                        }
                        className={
                          accent
                            ? "[&_[data-slot=progress-indicator]]:bg-[var(--pc)]"
                            : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due / Overdue widget */}
      <div className="mt-6">
        <DueOverdueCard cycles={cycleLikes} logs={rangeLogs} now={now} />
      </div>

      {/* Recent doses with profile-color left border accent */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent doses</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDoses.length === 0 ? (
            <EmptyState
              icon={<Syringe className="size-6" />}
              title="No doses logged yet"
              description="Log your first dose to start building a history."
              action={
                <Button size="sm" render={<Link href="/log" />}>
                  Log a dose
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1 p-0" />
                  <TableHead>Peptide</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Site</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDoses.map((d) => (
                  <TableRow key={d.id} className="relative">
                    {/* Profile-color accent dot on the left */}
                    <TableCell className="w-1 p-0 pr-2">
                      {accent ? (
                        <span
                          aria-hidden
                          className="block h-4 w-1 rounded-full"
                          style={{ background: accent }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {d.peptide.name}
                    </TableCell>
                    <TableCell>
                      {d.amount} {d.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(d.takenAt, "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.site ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";

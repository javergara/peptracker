import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Plus,
  Syringe,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
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
  getRecentDoseLogs,
  listPeptides,
} from "@/lib/queries";
import {
  cycleProgress,
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";
import { formatDate } from "@/lib/dates";

export default async function DashboardPage() {
  const [user, activeCycles, peptides, recentDoses] = await Promise.all([
    getCurrentUser(),
    getActiveCycles(),
    listPeptides(),
    getRecentDoseLogs(8),
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

  const todays = getTodaysDoses(cycleLikes, new Date());

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dosesThisWeek = recentDoses.filter((d) => d.takenAt >= weekAgo).length;

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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <TableHead>Peptide</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Site</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDoses.map((d) => (
                  <TableRow key={d.id}>
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

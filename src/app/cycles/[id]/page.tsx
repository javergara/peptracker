import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CycleActions } from "@/components/cycles/cycle-actions";
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
import { logDose } from "@/lib/actions/doses";
import { getCurrentUser, getCycle } from "@/lib/queries";
import { cycleProgress, type ScheduleConfig } from "@/lib/schedule";
import { formatDate } from "@/lib/dates";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, cycle] = await Promise.all([getCurrentUser(), getCycle(id)]);
  if (!cycle) notFound();

  const prog = cycleProgress(cycle.startDate, cycle.endDate);
  const cfg = cycle.scheduleConfig as ScheduleConfig | null;

  // Peptides available to log for this cycle.
  const peptideOptions = cycle.peptide
    ? [cycle.peptide]
    : (cycle.stack?.items.map((i) => i.peptide) ?? []);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={cycle.name}
        description={`${cycle.peptide?.name ?? cycle.stack?.name ?? "—"} · ${formatDate(
          cycle.startDate,
        )}${cycle.endDate ? ` → ${formatDate(cycle.endDate)}` : ""}`}
        accentColor={user.color ?? undefined}
        actions={
          <Button variant="outline" render={<Link href="/cycles" />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <CycleActions id={cycle.id} status={cycle.status} />
        <div className="min-w-48 flex-1">
          <div className="text-muted-foreground mb-1 flex justify-between text-xs">
            <span>Progress</span>
            <span>
              {prog.percent !== null
                ? `${prog.percent}%`
                : `Day ${prog.daysElapsed + 1}`}
            </span>
          </div>
          <Progress
            value={prog.percent ?? 0}
            style={
              user.color ? ({ "--pc": user.color } as CSSProperties) : undefined
            }
            className={
              user.color
                ? "[&_[data-slot=progress-indicator]]:bg-[var(--pc)]"
                : undefined
            }
          />
        </div>
      </div>

      {cfg ? (
        <p className="text-muted-foreground mb-6 text-sm">
          Schedule: {cfg.frequency}
          {cfg.dosePerAdmin ? ` · ${cfg.dosePerAdmin} ${cfg.unit ?? ""}` : ""}
        </p>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log a dose for this cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={logDose}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="cycleId" value={cycle.id} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Peptide</label>
              <select name="peptideId" required className={inputCls}>
                {peptideOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount</label>
              <input
                name="amount"
                type="number"
                step="any"
                min="0"
                required
                defaultValue={cfg?.dosePerAdmin ?? ""}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <select
                name="unit"
                defaultValue={cfg?.unit ?? "mcg"}
                className={inputCls}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Site</label>
              <input
                name="site"
                placeholder="e.g. L abdomen"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">Log dose</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dose history ({cycle.doseLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cycle.doseLogs.length === 0 ? (
            <EmptyState title="No doses logged for this cycle yet." />
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
                {cycle.doseLogs.map((d) => (
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

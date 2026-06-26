import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, listCycles } from "@/lib/queries";
import { cycleProgress, type ScheduleConfig } from "@/lib/schedule";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cycles" };

// Status semantics follow the Peptra palette: active = periwinkle/violet,
// planned (queued) = slate, paused (rest) = lilac, completed = muted.
const STATUS_BADGE: Record<string, string> = {
  active: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  planned: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  paused: "bg-purple-400/15 text-purple-700 dark:text-purple-300",
  completed: "bg-muted text-muted-foreground",
};

export default async function CyclesPage() {
  const [user, cycles] = await Promise.all([getCurrentUser(), listCycles()]);
  const accent = user.color ?? "#7C3AED";
  const now = new Date();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cycles"
        description={`${user.name}'s peptide protocols and their progress.`}
        accentColor={accent}
        actions={
          <Button
            className="[box-shadow:0_10px_22px_-10px_rgba(124,58,237,.85)] [background:linear-gradient(180deg,#8B47F0,#7C3AED)] hover:[background:linear-gradient(180deg,#9B57F0,#8C4AED)]"
            render={<Link href="/cycles/new" />}
          >
            <Plus className="size-4" />
            New cycle
          </Button>
        }
      />

      {cycles.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="size-6" />}
          title="No cycles yet"
          description="Create a cycle from a peptide or stack to start tracking doses and progress."
          action={
            <Button render={<Link href="/cycles/new" />}>New cycle</Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {cycles.map((c) => {
            const prog = cycleProgress(c.startDate, c.endDate, now);
            const pct = prog.percent ?? 0;
            const weekNum =
              prog.daysElapsed > 0 ? Math.ceil((prog.daysElapsed + 1) / 7) : 1;
            const totalWeeks =
              prog.totalDays != null ? Math.ceil(prog.totalDays / 7) : null;
            const cfg = c.scheduleConfig as ScheduleConfig | null;

            return (
              <Link
                key={c.id}
                href={`/cycles/${c.id}`}
                className={cn(
                  "card-surface block rounded-[18px] p-5 no-underline transition-shadow hover:[box-shadow:var(--shadow-card-hover)]",
                )}
                style={{ borderLeft: `4px solid ${accent}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Left: name + subtitle */}
                  <div className="min-w-0">
                    <Eyebrow className="mb-1">
                      {c.peptide?.name ?? c.stack?.name ?? "Protocol"}
                    </Eyebrow>
                    <p className="font-display text-foreground text-[15px] font-semibold">
                      {c.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">
                      {formatDate(c.startDate)}
                      {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                      {cfg?.frequency ? ` · ${cfg.frequency}` : ""}
                    </p>
                  </div>

                  {/* Right: dose count + status */}
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="num text-foreground text-[22px] leading-none font-semibold">
                        {c._count.doseLogs}
                      </span>
                      <p className="text-muted-foreground text-[11px]">doses</p>
                    </div>
                    <Badge variant="outline" className={STATUS_BADGE[c.status]}>
                      {c.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar — only when there's an end date */}
                {c.endDate ? (
                  <div className="mt-4">
                    <div className="mb-[5px] flex items-baseline justify-between">
                      <span className="text-muted-foreground text-[11px]">
                        Progress
                      </span>
                      <span className="num text-[11px] text-[#8B86AD]">
                        {pct}%
                        {totalWeeks != null
                          ? ` · wk ${weekNum}/${totalWeeks}`
                          : ""}
                      </span>
                    </div>
                    <div className="bg-accent h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full [background:var(--gradient-gauge)]"
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser, listCycles } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Cycles" };

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  planned: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-muted text-muted-foreground",
};

export default async function CyclesPage() {
  const [user, cycles] = await Promise.all([getCurrentUser(), listCycles()]);
  const accent = user.color ?? undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cycles"
        description={`${user.name}'s peptide protocols and their progress.`}
        accentColor={accent}
        actions={
          <Button render={<Link href="/cycles/new" />}>
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
          {cycles.map((c) => (
            <Card
              key={c.id}
              className="hover:border-primary/40 border-l-4 transition-colors"
              style={accent ? { borderLeftColor: accent } : undefined}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/cycles/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {c.peptide?.name ?? c.stack?.name ?? "—"} ·{" "}
                    {formatDate(c.startDate)}
                    {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {c._count.doseLogs} doses
                  </span>
                  <Badge variant="outline" className={STATUS_BADGE[c.status]}>
                    {c.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

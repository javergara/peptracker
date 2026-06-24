import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { DoseCalendar } from "@/components/calendar/dose-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDoseLogsInRange } from "@/lib/queries";

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
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { year, monthIndex } = parseMonth(month);

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const logs = await getDoseLogsInRange(start, end);

  const doses = logs.map((d) => ({
    id: d.id,
    peptideName: d.peptide.name,
    amount: d.amount,
    unit: d.unit,
    takenAtISO: d.takenAt.toISOString(),
    site: d.site,
    cycleName: d.cycle?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Calendar"
        description="Your logged doses, visualized by day. Switch profiles in the sidebar to view someone else's."
        actions={
          <Button render={<Link href="/log" />}>
            <Plus className="size-4" />
            Log dose
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <DoseCalendar year={year} monthIndex={monthIndex} doses={doses} />
        </CardContent>
      </Card>
    </div>
  );
}

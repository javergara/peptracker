import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CycleForm } from "@/components/cycles/cycle-form";
import { Button } from "@/components/ui/button";
import { updateCycle } from "@/lib/actions/cycles";
import {
  getCycle,
  getCurrentUser,
  listPeptides,
  listStacks,
} from "@/lib/queries";
import type { ScheduleConfig } from "@/lib/schedule";
import { parseDoseAmount } from "@/lib/cycles";
import { toDateInputValue } from "@/lib/dates";
import { asDosage } from "@/types/peptide";

export const metadata = { title: "Edit Cycle" };
export const dynamic = "force-dynamic";

export default async function EditCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, cycle, peptidesRaw, stacksRaw] = await Promise.all([
    getCurrentUser(),
    getCycle(id),
    listPeptides(),
    listStacks(),
  ]);
  if (!cycle) notFound();

  const cfg = (cycle.scheduleConfig as ScheduleConfig | null) ?? null;

  const peptides = peptidesRaw.map((p) => ({
    id: p.id,
    name: p.name,
    protocols: asDosage(p.dosage)?.protocols,
  }));

  const stacks = stacksRaw.map((s) => ({
    id: s.id,
    name: s.name,
    items: s.items.map((i) => ({
      peptideId: i.peptideId,
      peptideName: i.peptide.name,
      ...parseDoseAmount(i.dose),
    })),
  }));
  const source = cycle.peptideId
    ? `peptide:${cycle.peptideId}`
    : cycle.stackId
      ? `stack:${cycle.stackId}`
      : "";

  async function action(formData: FormData) {
    "use server";
    await updateCycle(id, formData);
    redirect(`/cycles/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Edit Cycle"
        description={cycle.name}
        accentColor={user.color ?? undefined}
        actions={
          <Button variant="outline" render={<Link href={`/cycles/${id}`} />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <div className="card-surface rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
        <CycleForm
          peptides={peptides}
          stacks={stacks}
          action={action}
          submitLabel="Save changes"
          defaults={{
            name: cycle.name,
            source,
            startDate: toDateInputValue(cycle.startDate),
            endDate: cycle.endDate
              ? toDateInputValue(cycle.endDate)
              : undefined,
            status: cycle.status,
            frequency: cfg?.frequency ?? "daily",
            daysOfWeek: cfg?.daysOfWeek,
            timesPerDay: cfg?.timesPerDay,
            dosePerAdmin: cfg?.dosePerAdmin ?? undefined,
            unit: cfg?.unit ?? "mcg",
            washoutDays: cycle.washoutDays ?? undefined,
            // Per-peptide dose + optional schedule override (stack cycles
            // only). `startDate`/`endDate` are stored as plain yyyy-MM-dd
            // strings already, so no date parsing is needed here.
            items: Object.fromEntries(
              (cfg?.items ?? []).map((it) => [
                it.peptideId,
                {
                  dose: it.dose,
                  unit: it.unit,
                  frequency: it.frequency,
                  daysOfWeek: it.daysOfWeek,
                  timesPerDay: it.timesPerDay,
                  startDate: it.startDate,
                  endDate: it.endDate,
                },
              ]),
            ),
            titrationLabel: cfg?.titration?.label,
            notes: cycle.notes ?? undefined,
          }}
        />
      </div>
    </div>
  );
}

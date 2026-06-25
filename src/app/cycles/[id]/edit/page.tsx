import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CycleForm } from "@/components/cycles/cycle-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateCycle } from "@/lib/actions/cycles";
import { getCycle, listPeptides, listStacks } from "@/lib/queries";
import type { ScheduleConfig } from "@/lib/schedule";
import { toDateInputValue } from "@/lib/dates";

export const metadata = { title: "Edit Cycle" };
export const dynamic = "force-dynamic";

export default async function EditCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cycle, peptides, stacks] = await Promise.all([
    getCycle(id),
    listPeptides(),
    listStacks(),
  ]);
  if (!cycle) notFound();

  const cfg = (cycle.scheduleConfig as ScheduleConfig | null) ?? null;
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
        actions={
          <Button variant="outline" render={<Link href={`/cycles/${id}`} />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
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
              dosePerAdmin: cfg?.dosePerAdmin ?? undefined,
              unit: cfg?.unit ?? "mcg",
              notes: cycle.notes ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

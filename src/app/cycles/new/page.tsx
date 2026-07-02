import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CycleForm } from "@/components/cycles/cycle-form";
import { Button } from "@/components/ui/button";
import { createCycle } from "@/lib/actions/cycles";
import { getCurrentUser, listPeptides, listStacks } from "@/lib/queries";
import { parseDoseAmount } from "@/lib/cycles";

export const metadata = { title: "New Cycle" };

export default async function NewCyclePage() {
  const [user, peptides, stacksRaw] = await Promise.all([
    getCurrentUser(),
    listPeptides(),
    listStacks(),
  ]);

  const stacks = stacksRaw.map((s) => ({
    id: s.id,
    name: s.name,
    items: s.items.map((i) => ({
      peptideId: i.peptideId,
      peptideName: i.peptide.name,
      ...parseDoseAmount(i.dose),
    })),
  }));

  async function action(formData: FormData) {
    "use server";
    const id = await createCycle(formData);
    redirect(`/cycles/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Cycle"
        description="Track a protocol built from a single peptide or a stack."
        accentColor={user.color ?? undefined}
        actions={
          <Button variant="outline" render={<Link href="/cycles" />}>
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
          submitLabel="Create cycle"
        />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

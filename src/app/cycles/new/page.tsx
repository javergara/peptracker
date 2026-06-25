import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CycleForm } from "@/components/cycles/cycle-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCycle } from "@/lib/actions/cycles";
import { listPeptides, listStacks } from "@/lib/queries";

export const metadata = { title: "New Cycle" };

export default async function NewCyclePage() {
  const [peptides, stacks] = await Promise.all([listPeptides(), listStacks()]);

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
        actions={
          <Button variant="outline" render={<Link href="/cycles" />}>
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
            submitLabel="Create cycle"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";

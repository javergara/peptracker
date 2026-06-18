import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { StackBuilder } from "@/components/stacks/stack-builder";
import { Button } from "@/components/ui/button";
import { getAllInteractionRows, listPeptides } from "@/lib/queries";

export const metadata = { title: "Build a Stack" };

export default async function NewStackPage() {
  const [peptides, interactionRows] = await Promise.all([
    listPeptides(),
    getAllInteractionRows(),
  ]);

  const options = peptides.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Build a Stack"
        description="Combine peptides into a custom stack. Interaction warnings update live as you select."
        actions={
          <Button variant="outline" render={<Link href="/stacks" />}>
            <ArrowLeft className="size-4" />
            Back to stacks
          </Button>
        }
      />
      <Disclaimer className="mb-6" />
      <StackBuilder peptides={options} interactionRows={interactionRows} />
    </div>
  );
}

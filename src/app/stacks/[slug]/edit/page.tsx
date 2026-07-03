import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import {
  getAllInteractionRows,
  getCurrentUser,
  getStackBySlug,
  listPeptides,
} from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { StackBuilder } from "@/components/stacks/stack-builder";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stack = await getStackBySlug(slug);
  if (!stack) return { title: "Stack not found" };
  return { title: `Edit ${stack.name}` };
}

export default async function EditStackPage({ params }: Props) {
  const { slug } = await params;
  const [stack, user] = await Promise.all([
    getStackBySlug(slug),
    getCurrentUser(),
  ]);

  // Only the owning profile can edit their own custom stack; presets (and
  // other profiles' stacks) 404 rather than redirect, matching notFound()
  // behavior used elsewhere for unauthorized/unknown resources.
  if (!stack || stack.isPreset || stack.userId !== user.id) notFound();

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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Edit ${stack.name}`}
        description="Update the stack's details, members, and dosing. Interaction warnings update live as you select."
        actions={
          <Button
            variant="outline"
            render={<Link href={`/stacks/${stack.slug}`} />}
          >
            <ArrowLeft className="size-4" />
            Back to stack
          </Button>
        }
      />
      <Disclaimer className="mb-6" />
      <div className="card-surface rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
        <StackBuilder
          peptides={options}
          interactionRows={interactionRows}
          stack={{
            id: stack.id,
            name: stack.name,
            goal: stack.goal ?? "",
            description: stack.description ?? "",
            items: stack.items.map((item) => ({
              peptideId: item.peptideId,
              dose: item.dose ?? "",
              notes: item.notes ?? "",
            })),
          }}
        />
      </div>
    </div>
  );
}

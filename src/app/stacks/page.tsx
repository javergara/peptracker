import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { listStacks } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { GoalBadges } from "@/components/common/badges";
import { Eyebrow } from "@/components/common/eyebrow";
import { Disclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteStackButton } from "@/components/stacks/delete-stack-button";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Stacks" };

export default async function StacksPage() {
  const stacks = await listStacks();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Stacks"
        description="Curated peptide protocol combinations."
        actions={
          <Button render={<Link href="/stacks/new" />} className="btn-gradient">
            <Plus className="size-4" />
            Build a stack
          </Button>
        }
      />

      <Disclaimer />

      {stacks.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-8" />}
          title="No stacks yet"
          description="Create your first peptide stack or browse preset protocols."
          action={
            <Button render={<Link href="/stacks/new" />}>
              <Plus className="size-4" />
              Build a stack
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stacks.map((stack) => (
            <StackCard key={stack.id} stack={stack} />
          ))}
        </div>
      )}
    </div>
  );
}

type Stack = Awaited<ReturnType<typeof listStacks>>[number];

function StackCard({ stack }: { stack: Stack }) {
  const tags = asStringArray(stack.tags);

  return (
    <div className="card-surface relative flex flex-col gap-3 rounded-[18px] p-5">
      {/* Goal eyebrow */}
      {stack.goal && <Eyebrow>{stack.goal}</Eyebrow>}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/stacks/${stack.slug}`}
            className="font-display text-foreground text-base font-semibold hover:underline"
          >
            {stack.name}
          </Link>
          {stack.isPreset && (
            <Badge variant="secondary" className="text-xs">
              Preset
            </Badge>
          )}
        </div>
        {!stack.isPreset && (
          <DeleteStackButton id={stack.id} name={stack.name} />
        )}
      </div>

      {/* Goal tags */}
      {tags.length > 0 && <GoalBadges tags={tags} />}

      {/* Peptide chips */}
      {stack.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stack.items.map((item) => (
            <span
              key={item.id}
              className="bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {item.peptide.name}
            </span>
          ))}
        </div>
      )}

      {/* Peptide count + footer link */}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          <span className="num">{stack.items.length}</span> peptide
          {stack.items.length !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/stacks/${stack.slug}`}
          className="text-primary text-xs font-medium hover:underline"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

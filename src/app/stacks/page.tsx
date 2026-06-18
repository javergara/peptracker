import Link from "next/link";
import { Layers, Plus, Trash2 } from "lucide-react";

import { listStacks } from "@/lib/queries";
import { deleteStack } from "@/lib/actions/stacks";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { GoalBadges } from "@/components/common/badges";
import { Disclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Stacks" };

export default async function StacksPage() {
  const stacks = await listStacks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stacks"
        description="Curated peptide protocol combinations."
        actions={
          <Button render={<Link href="/stacks/new" />} size="default">
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

  async function handleDelete() {
    "use server";
    await deleteStack(stack.id);
  }

  return (
    <div className="bg-card border-border relative flex flex-col gap-3 rounded-xl border p-5 transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/stacks/${stack.slug}`}
            className="text-base font-semibold hover:underline"
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
          <form action={handleDelete}>
            <button
              type="submit"
              aria-label={`Delete ${stack.name}`}
              className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        )}
      </div>

      {/* Goal */}
      {stack.goal && (
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {stack.goal}
        </p>
      )}

      {/* Goal tags */}
      {tags.length > 0 && <GoalBadges tags={tags} />}

      {/* Peptide chips */}
      {stack.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stack.items.map((item) => (
            <span
              key={item.id}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {item.peptide.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer link */}
      <Link
        href={`/stacks/${stack.slug}`}
        className="text-primary mt-auto text-xs font-medium hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}

export const dynamic = "force-dynamic";

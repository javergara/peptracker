import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getStackBySlug, getPeptideInteractions } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { GoalBadges, InteractionBadge } from "@/components/common/badges";
import { Disclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { asStringArray } from "@/types/peptide";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stack = await getStackBySlug(slug);
  if (!stack) return { title: "Stack not found" };
  return { title: stack.name };
}

export default async function StackDetailPage({ params }: Props) {
  const { slug } = await params;
  const stack = await getStackBySlug(slug);
  if (!stack) notFound();

  const tags = asStringArray(stack.tags);
  const memberIds = new Set(stack.items.map((i) => i.peptide.id));

  // Gather interactions among members — deduplicate by sorted id pair
  const seen = new Set<string>();
  const interactions: {
    peptideAName: string;
    peptideBName: string;
    kind: string;
    note: string | null;
  }[] = [];

  for (const item of stack.items) {
    const rows = await getPeptideInteractions(item.peptide.id);
    for (const row of rows) {
      if (!memberIds.has(row.other.id)) continue;
      const key = [item.peptide.id, row.other.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      interactions.push({
        peptideAName: item.peptide.name,
        peptideBName: row.other.name,
        kind: row.kind,
        note: row.note,
      });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={stack.name}
        description={stack.description ?? undefined}
        actions={
          stack.isPreset ? <Badge variant="secondary">Preset</Badge> : undefined
        }
      />

      <Disclaimer />

      {/* Goal & tags */}
      {(stack.goal || tags.length > 0) && (
        <section className="space-y-2">
          {stack.goal && (
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Goal: {stack.goal}
            </p>
          )}
          {tags.length > 0 && <GoalBadges tags={tags} />}
        </section>
      )}

      {/* Schedule / timing table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Protocol Schedule</h2>
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-border border-b text-left">
                <th className="px-4 py-3 font-medium">Peptide</th>
                <th className="px-4 py-3 font-medium">Dose</th>
                <th className="px-4 py-3 font-medium">Frequency</th>
                <th className="px-4 py-3 font-medium">Timing</th>
              </tr>
            </thead>
            <tbody>
              {stack.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/peptides/${item.peptide.slug}`}
                      className="text-primary hover:underline"
                    >
                      {item.peptide.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {item.dose ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {item.frequency ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {item.timing ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactions panel */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Interactions Within Stack</h2>
        {interactions.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
            No known interactions among the members of this stack.
          </p>
        ) : (
          <div className="space-y-2">
            {interactions.map((ix, i) => (
              <div
                key={i}
                className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="shrink-0">
                  <InteractionBadge kind={ix.kind} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {ix.peptideAName} × {ix.peptideBName}
                  </p>
                  {ix.note && (
                    <p className="text-muted-foreground text-sm">{ix.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

import { getStackBySlug, getPeptideInteractions } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { GoalBadges, InteractionBadge } from "@/components/common/badges";
import { Eyebrow } from "@/components/common/eyebrow";
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back nav */}
      <Link
        href="/stacks"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Stacks
      </Link>

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
        <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
          {stack.goal && <Eyebrow className="mb-3">{stack.goal}</Eyebrow>}
          {tags.length > 0 && <GoalBadges tags={tags} />}
        </div>
      )}

      {/* Protocol schedule table */}
      <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
        <Eyebrow className="mb-4">PROTOCOL SCHEDULE</Eyebrow>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="text-muted-foreground eyebrow pr-4 pb-3 font-normal">
                  PEPTIDE
                </th>
                <th className="text-muted-foreground eyebrow pr-4 pb-3 font-normal">
                  DOSE
                </th>
                <th className="text-muted-foreground eyebrow pr-4 pb-3 font-normal">
                  FREQUENCY
                </th>
                <th className="text-muted-foreground eyebrow pb-3 font-normal">
                  TIMING
                </th>
              </tr>
            </thead>
            <tbody>
              {stack.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-border hover:bg-accent/30 border-b transition-colors last:border-0"
                >
                  <td className="py-3 pr-4 font-medium">
                    <Link
                      href={`/peptides/${item.peptide.slug}`}
                      className="text-primary hover:underline"
                    >
                      {item.peptide.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground num py-3 pr-4">
                    {item.dose ?? "—"}
                  </td>
                  <td className="text-muted-foreground py-3 pr-4">
                    {item.frequency ?? "—"}
                  </td>
                  <td className="text-muted-foreground py-3">
                    {item.timing ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactions panel */}
      <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
        <Eyebrow className="mb-4">INTERACTIONS WITHIN STACK</Eyebrow>
        {interactions.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
            No known interactions among the members of this stack.
          </p>
        ) : (
          <div className="space-y-2">
            {interactions.map((ix, i) => (
              <div
                key={i}
                className="border-border bg-background flex flex-col gap-1.5 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="shrink-0">
                  <InteractionBadge kind={ix.kind} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-foreground text-sm font-medium">
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
      </div>
    </div>
  );
}

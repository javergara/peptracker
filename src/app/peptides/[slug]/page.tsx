import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Clock,
  RotateCcw,
  Thermometer,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";

import { getPeptideBySlug, getPeptideInteractions } from "@/lib/queries";
import {
  asStringArray,
  asDosage,
  asReconstitution,
  asReferences,
} from "@/types/peptide";
import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { ReferenceList } from "@/components/common/reference-list";
import {
  CategoryBadge,
  RouteBadge,
  GoalBadges,
  InteractionBadge,
} from "@/components/common/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReconstitutionCalculator } from "@/components/peptides/reconstitution-calculator";

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const peptide = await getPeptideBySlug(slug);
  if (!peptide) return { title: "Peptide not found" };
  return {
    title: `${peptide.name} — Peptides Knowledge Base`,
    description: peptide.summary ?? undefined,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PeptideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const peptide = await getPeptideBySlug(slug);
  if (!peptide) notFound();

  const interactions = await getPeptideInteractions(peptide.id);

  const aliases = asStringArray(peptide.aliases);
  const tags = asStringArray(peptide.tags);
  const benefits = asStringArray(peptide.benefits);
  const risks = asStringArray(peptide.risks);
  const sideEffects = asStringArray(peptide.sideEffects);
  const contraindications = asStringArray(peptide.contraindications);
  const references = asReferences(peptide.references);
  const dosage = asDosage(peptide.dosage);
  const reconstitution = asReconstitution(peptide.reconstitution);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back nav */}
      <Link
        href="/peptides"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        ← Back to Knowledge Base
      </Link>

      {/* Header */}
      <PageHeader
        title={peptide.name}
        description={
          aliases.length > 0
            ? `Also known as: ${aliases.join(", ")}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={peptide.category} />
            <RouteBadge route={peptide.route} />
          </div>
        }
      />

      {tags.length > 0 && <GoalBadges tags={tags} />}

      <Disclaimer />

      {/* Main content tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dosing">Dosing</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          {interactions.length > 0 && (
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          )}
          {references.length > 0 && (
            <TabsTrigger value="references">References</TabsTrigger>
          )}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {peptide.summary}
              </p>
            </CardContent>
          </Card>

          {/* Mechanism */}
          {peptide.mechanism && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-4" />
                  Mechanism of Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {peptide.mechanism}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Benefits & Risks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-emerald-700 dark:text-emerald-400">
                    Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1.5 text-sm">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-emerald-500">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-amber-700 dark:text-amber-400">
                    Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1.5 text-sm">
                    {risks.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-amber-500">⚠</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side effects */}
          {sideEffects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Side Effects</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                  {sideEffects.map((se, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-rose-400">•</span>
                      {se}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quick facts */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <FactRow
                  label="Route"
                  value={peptide.route}
                  icon={<Zap className="size-3.5" />}
                />
                <FactRow
                  label="Frequency"
                  value={peptide.frequency}
                  icon={<RotateCcw className="size-3.5" />}
                />
                <FactRow
                  label="Half-life"
                  value={peptide.halfLife}
                  icon={<Clock className="size-3.5" />}
                />
                <FactRow
                  label="Cycle length"
                  value={peptide.cycleLength}
                  icon={<RotateCcw className="size-3.5" />}
                />
                <FactRow
                  label="Storage"
                  value={peptide.storage}
                  icon={<Thermometer className="size-3.5" />}
                />
                <FactRow label="Status" value={peptide.status} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dosing ── */}
        <TabsContent value="dosing" className="space-y-4 pt-4">
          {dosage ? (
            <Card>
              <CardHeader>
                <CardTitle>Dosing Protocol</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-emerald-700 dark:text-emerald-400">
                        Low
                      </TableCell>
                      <TableCell>{dosage.low}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-sky-700 dark:text-sky-400">
                        Standard
                      </TableCell>
                      <TableCell>{dosage.standard}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-amber-700 dark:text-amber-400">
                        High
                      </TableCell>
                      <TableCell>{dosage.high}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {dosage.notes && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {dosage.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No structured dosing data available.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reconstitution calculator */}
          <ReconstitutionCalculator
            defaultVialMg={reconstitution?.vialMg}
            defaultBacWaterMl={reconstitution?.bacWaterMl}
            peptideId={peptide.id}
          />

          {reconstitution?.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Reconstitution Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {reconstitution.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Safety ── */}
        <TabsContent value="safety" className="space-y-4 pt-4">
          {contraindications.length > 0 && (
            <Card className="border-rose-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="size-4" />
                  Contraindications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  {contraindications.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-rose-400">✗</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {sideEffects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Side Effects</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                  {sideEffects.map((se, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-amber-400">•</span>
                      {se}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {contraindications.length === 0 && sideEffects.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No safety data recorded yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Interactions ── */}
        {interactions.length > 0 && (
          <TabsContent value="interactions" className="space-y-3 pt-4">
            {interactions.map((interaction) => (
              <Card key={interaction.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4">
                  <div className="shrink-0">
                    <InteractionBadge kind={interaction.kind} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Link
                      href={`/peptides/${interaction.other.slug}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {interaction.other.name}
                    </Link>
                    {interaction.note && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {interaction.note}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* ── References ── */}
        {references.length > 0 && (
          <TabsContent value="references" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <ReferenceList references={references} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function FactRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </dt>
      <dd className="col-span-1">{value}</dd>
    </>
  );
}

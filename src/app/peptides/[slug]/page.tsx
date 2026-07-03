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
  ChevronLeft,
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
import { Eyebrow } from "@/components/common/eyebrow";
import {
  CategoryBadge,
  RouteBadge,
  GoalBadges,
  InteractionBadge,
} from "@/components/common/badges";
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
import { calculateReconstitution } from "@/lib/reconstitution";

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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back nav */}
      <Link
        href="/peptides"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Knowledge Base
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
          <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
            <Eyebrow className="mb-3">SUMMARY</Eyebrow>
            <div className="flex items-start gap-2">
              <Info className="text-primary mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground leading-relaxed">
                {peptide.summary}
              </p>
            </div>
          </div>

          {/* Mechanism */}
          {peptide.mechanism && (
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-3">MECHANISM OF ACTION</Eyebrow>
              <div className="flex items-start gap-2">
                <Zap className="text-primary mt-0.5 size-4 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">
                  {peptide.mechanism}
                </p>
              </div>
            </div>
          )}

          {/* Benefits & Risks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {benefits.length > 0 && (
              <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
                <Eyebrow className="text-ok mb-3">BENEFITS</Eyebrow>
                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-violet-500">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {risks.length > 0 && (
              <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
                <Eyebrow className="text-warn-foreground mb-3">RISKS</Eyebrow>
                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  {risks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-amber-500">⚠</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Side effects */}
          {sideEffects.length > 0 && (
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-3">SIDE EFFECTS</Eyebrow>
              <ul className="text-muted-foreground grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                {sideEffects.map((se, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-rose-400">•</span>
                    {se}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick facts */}
          <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
            <Eyebrow className="mb-4">QUICK FACTS</Eyebrow>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
              <FactRow
                label="ROUTE"
                value={peptide.route}
                icon={<Zap className="size-3.5" />}
              />
              <FactRow
                label="FREQUENCY"
                value={peptide.frequency}
                icon={<RotateCcw className="size-3.5" />}
              />
              <FactRow
                label="HALF-LIFE"
                value={peptide.halfLife}
                icon={<Clock className="size-3.5" />}
              />
              <FactRow
                label="CYCLE LENGTH"
                value={peptide.cycleLength}
                icon={<RotateCcw className="size-3.5" />}
              />
              <FactRow
                label="STORAGE"
                value={peptide.storage}
                icon={<Thermometer className="size-3.5" />}
              />
              <FactRow label="STATUS" value={peptide.status} />
            </dl>
          </div>
        </TabsContent>

        {/* ── Dosing ── */}
        <TabsContent value="dosing" className="space-y-4 pt-4">
          {dosage ? (
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-4">DOSING PROTOCOL</Eyebrow>
              <div className="space-y-4">
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
                      <TableCell className="font-medium text-indigo-700 dark:text-indigo-400">
                        Low
                      </TableCell>
                      <TableCell className="num">{dosage.low}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-violet-700 dark:text-violet-400">
                        Standard
                      </TableCell>
                      <TableCell className="num">{dosage.standard}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-amber-700 dark:text-amber-400">
                        High
                      </TableCell>
                      <TableCell className="num">{dosage.high}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dosage.unit}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {(dosage.timing || dosage.maxDose) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {dosage.timing && (
                      <p>
                        <span className="text-muted-foreground">Timing:</span>{" "}
                        {dosage.timing}
                      </p>
                    )}
                    {dosage.maxDose && (
                      <p>
                        <span className="text-muted-foreground">Max dose:</span>{" "}
                        <span className="num">{dosage.maxDose}</span>
                      </p>
                    )}
                  </div>
                )}

                {dosage.protocols && dosage.protocols.length > 0 && (
                  <div className="space-y-4">
                    <Eyebrow className="mt-2">TITRATION SCHEDULE</Eyebrow>
                    {dosage.protocols.map((proto, pi) => (
                      <div key={pi} className="space-y-2">
                        {proto.label && (
                          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                            {proto.label}
                          </p>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Weeks</TableHead>
                              <TableHead>Dose</TableHead>
                              {reconstitution ? (
                                <TableHead>Volume</TableHead>
                              ) : null}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {proto.steps.map((step, si) => {
                              const doseMcg =
                                step.unit === "mg"
                                  ? step.amount * 1000
                                  : step.amount;
                              const units = reconstitution
                                ? calculateReconstitution({
                                    vialMg: reconstitution.vialMg,
                                    bacWaterMl: reconstitution.bacWaterMl,
                                    doseMcg,
                                  }).insulinUnits
                                : null;
                              return (
                                <TableRow key={si}>
                                  <TableCell className="num text-muted-foreground">
                                    {step.weeks}
                                  </TableCell>
                                  <TableCell>
                                    <span className="num font-medium">
                                      {step.amount} {step.unit}
                                    </span>
                                    {step.note ? (
                                      <span className="text-muted-foreground ml-2 text-xs">
                                        {step.note}
                                      </span>
                                    ) : null}
                                  </TableCell>
                                  {reconstitution ? (
                                    <TableCell className="num text-muted-foreground">
                                      {units ? `${units} u` : "—"}
                                    </TableCell>
                                  ) : null}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                    {reconstitution
                      ? (() => {
                          const c = calculateReconstitution({
                            vialMg: reconstitution.vialMg,
                            bacWaterMl: reconstitution.bacWaterMl,
                            doseMcg: 100,
                          });
                          const mcgPerUnit = c.concentrationMcgPerMl
                            ? Math.round(c.concentrationMcgPerMl / 100)
                            : 0;
                          return (
                            <p className="text-muted-foreground text-xs">
                              Volume (insulin-syringe units) shown for a{" "}
                              <span className="num">
                                {reconstitution.vialMg}
                              </span>{" "}
                              mg vial reconstituted with{" "}
                              <span className="num">
                                {reconstitution.bacWaterMl}
                              </span>{" "}
                              mL BAC water
                              {mcgPerUnit ? (
                                <>
                                  {" "}
                                  — ≈ <span className="num">
                                    {mcgPerUnit}
                                  </span>{" "}
                                  mcg per unit on a U-100 syringe
                                </>
                              ) : (
                                ""
                              )}
                              . Recalculate for your own vial below.
                            </p>
                          );
                        })()
                      : null}
                  </div>
                )}

                {dosage.notes && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {dosage.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card-surface rounded-[18px] p-8 text-center [box-shadow:var(--shadow-card)]">
              <p className="text-muted-foreground text-sm">
                No structured dosing data available.
              </p>
            </div>
          )}

          {/* Reconstitution calculator */}
          <ReconstitutionCalculator
            defaultVialMg={reconstitution?.vialMg}
            defaultBacWaterMl={reconstitution?.bacWaterMl}
            peptideId={peptide.id}
          />

          {reconstitution?.notes && (
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-3">RECONSTITUTION NOTES</Eyebrow>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {reconstitution.notes}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Safety ── */}
        <TabsContent value="safety" className="space-y-4 pt-4">
          {contraindications.length > 0 && (
            <div className="card-surface rounded-[18px] border border-rose-500/20 p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-3 text-rose-600 dark:text-rose-400">
                CONTRAINDICATIONS
              </Eyebrow>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  {contraindications.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-rose-400">✗</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {sideEffects.length > 0 && (
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-3">SIDE EFFECTS</Eyebrow>
              <ul className="text-muted-foreground grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                {sideEffects.map((se, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-amber-400">•</span>
                    {se}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contraindications.length === 0 && sideEffects.length === 0 && (
            <div className="card-surface rounded-[18px] p-8 text-center [box-shadow:var(--shadow-card)]">
              <p className="text-muted-foreground text-sm">
                No safety data recorded yet.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Interactions ── */}
        {interactions.length > 0 && (
          <TabsContent value="interactions" className="space-y-3 pt-4">
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="card-surface flex flex-col gap-3 rounded-[18px] p-4 [box-shadow:var(--shadow-card)] sm:flex-row sm:items-start sm:gap-4"
              >
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
              </div>
            ))}
          </TabsContent>
        )}

        {/* ── References ── */}
        {references.length > 0 && (
          <TabsContent value="references" className="pt-4">
            <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
              <Eyebrow className="mb-4">REFERENCES</Eyebrow>
              <ReferenceList references={references} />
            </div>
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
        {icon && (
          <span className="text-primary shrink-0" aria-hidden>
            {icon}
          </span>
        )}
        <span className="eyebrow">{label}</span>
      </dt>
      <dd className="text-foreground col-span-1 text-sm font-medium">
        {value}
      </dd>
    </>
  );
}

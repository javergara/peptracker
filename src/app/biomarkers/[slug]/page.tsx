import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpDown,
  BookOpen,
  FlaskConical,
  Info,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import {
  getBiomarker,
  getCurrentUser,
  getInterventionBands,
  listLabsForBiomarker,
} from "@/lib/queries";
import {
  asRefRanges,
  asReferences,
  ageFromBirthYear,
  resolveRange,
  SYSTEM_LABELS,
  type BiomarkerSystem,
} from "@/types/biomarker";
import { asStringArray } from "@/types/peptide";
import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { ReferenceList } from "@/components/common/reference-list";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkerTimelineChart } from "@/components/metrics/marker-timeline-chart";
import { SYSTEM_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const biomarker = await getBiomarker(slug);
  if (!biomarker) return { title: "Biomarker not found" };
  return {
    title: `${biomarker.name} — Biomarkers`,
    description: biomarker.summary,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BiomarkerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [biomarker, user, labs] = await Promise.all([
    getBiomarker(slug),
    getCurrentUser(),
    listLabsForBiomarker(slug),
  ]);

  if (!biomarker) notFound();

  // Intervention bands — only fetch when there are labs.
  let bands: {
    id: string;
    label: string;
    kind: "cycle" | "supplement";
    start: number;
    end: number | null;
  }[] = [];

  if (labs.length > 0) {
    const earliestLab = labs[0].takenAt;
    const rawBands = await getInterventionBands(earliestLab, new Date());
    bands = rawBands.map((b) => ({
      id: b.id,
      label: b.label,
      kind: b.kind,
      start: b.start.getTime(),
      end: b.end ? b.end.getTime() : null,
    }));
  }

  // Parse Json columns.
  const aliases = asStringArray(biomarker.aliases);
  const raises = asStringArray(biomarker.raises);
  const lowers = asStringArray(biomarker.lowers);
  const confounders = asStringArray(biomarker.confounders);
  const relatedPeptides = asStringArray(biomarker.relatedPeptides);
  const references = asReferences(biomarker.references);
  const ranges = asRefRanges(biomarker.ranges);

  const system = biomarker.system as BiomarkerSystem;

  // Resolve profile-specific reference range.
  const age = ageFromBirthYear(user.birthYear);
  const resolved = resolveRange(ranges, { sex: user.sex, age });

  // Latest lab for ref lines.
  const latest = labs.length > 0 ? labs[labs.length - 1] : null;
  const refLow = latest?.refLow ?? resolved?.low ?? null;
  const refHigh = latest?.refHigh ?? resolved?.high ?? null;

  const hasProfileInfo = user.sex || user.birthYear;

  // Chart points (epoch ms).
  const points = labs.map((l) => ({ t: l.takenAt.getTime(), value: l.value }));

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back nav */}
      <Link
        href="/biomarkers"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        ← Back to Biomarkers
      </Link>

      {/* Header */}
      <PageHeader
        title={biomarker.name}
        description={
          aliases.length > 0
            ? `Also known as: ${aliases.join(", ")}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(SYSTEM_BADGE[system])}>
              {SYSTEM_LABELS[system]}
            </Badge>
            <span className="text-muted-foreground num text-sm">
              {biomarker.unit}
            </span>
          </div>
        }
      />

      <Disclaimer />

      {/* Main content tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="your-history">Your History</TabsTrigger>
          {(raises.length > 0 ||
            lowers.length > 0 ||
            confounders.length > 0) && (
            <TabsTrigger value="factors">Factors</TabsTrigger>
          )}
          {relatedPeptides.length > 0 && (
            <TabsTrigger value="peptides">Related Peptides</TabsTrigger>
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
                What it is
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {biomarker.summary}
              </p>
            </CardContent>
          </Card>

          {/* What it means */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="size-4" />
                What it means
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {biomarker.whatItMeans}
              </p>
            </CardContent>
          </Card>

          {/* Reference range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="size-4" />
                Typical Reference Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resolved ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-2">
                    {resolved.low != null && resolved.high != null ? (
                      <p className="text-foreground text-lg font-semibold">
                        <span className="num">
                          {resolved.low}–{resolved.high}
                        </span>{" "}
                        <span className="text-muted-foreground text-sm font-normal">
                          {resolved.unit ?? biomarker.unit}
                        </span>
                      </p>
                    ) : resolved.low != null ? (
                      <p className="text-foreground text-lg font-semibold">
                        &gt; <span className="num">{resolved.low}</span>{" "}
                        <span className="text-muted-foreground text-sm font-normal">
                          {resolved.unit ?? biomarker.unit}
                        </span>
                      </p>
                    ) : resolved.high != null ? (
                      <p className="text-foreground text-lg font-semibold">
                        &lt; <span className="num">{resolved.high}</span>{" "}
                        <span className="text-muted-foreground text-sm font-normal">
                          {resolved.unit ?? biomarker.unit}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {resolved.note && (
                    <p className="text-muted-foreground text-sm">
                      {resolved.note}
                    </p>
                  )}
                  {!hasProfileInfo && (
                    <p className="text-muted-foreground text-xs">
                      Showing default range. Set your sex and birth year in{" "}
                      <Link
                        href="/settings"
                        className="text-primary hover:underline"
                      >
                        Settings
                      </Link>{" "}
                      for a personalised range.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No reference range data available.{" "}
                  {!hasProfileInfo && (
                    <>
                      Set your sex and birth year in{" "}
                      <Link
                        href="/settings"
                        className="text-primary hover:underline"
                      >
                        Settings
                      </Link>{" "}
                      for a sex/age-specific range.
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Your History ── */}
        <TabsContent value="your-history" className="space-y-4 pt-4">
          {labs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Results Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkerTimelineChart
                  points={points}
                  bands={bands}
                  refLow={refLow}
                  refHigh={refHigh}
                  unit={biomarker.unit}
                  color={user.color ?? "var(--chart-1)"}
                />
                {/* Latest value callout */}
                {latest && (
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">
                        Latest value:
                      </span>{" "}
                      <span className="num font-medium">{latest.value}</span>{" "}
                      <span className="text-muted-foreground">
                        {latest.unit ?? biomarker.unit}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Results:</span>{" "}
                      <span className="num font-medium">{labs.length}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<FlaskConical className="size-8" />}
              title="No lab results yet"
              description={`Log a "${biomarker.name}" result on the Labs page to see your history here.`}
              action={
                <Link
                  href="/labs"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Go to Labs
                </Link>
              }
            />
          )}
        </TabsContent>

        {/* ── Factors ── */}
        {(raises.length > 0 || lowers.length > 0 || confounders.length > 0) && (
          <TabsContent value="factors" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {raises.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                      <TrendingUp className="size-4" />
                      What raises it
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-muted-foreground space-y-1.5 text-sm">
                      {raises.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-rose-400">↑</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {lowers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <TrendingDown className="size-4" />
                      What lowers it
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-muted-foreground space-y-1.5 text-sm">
                      {lowers.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-indigo-400">↓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {confounders.length > 0 && (
              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="size-4" />
                    Confounders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1.5 text-sm">
                    {confounders.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-amber-400">⚠</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── Related Peptides ── */}
        {relatedPeptides.length > 0 && (
          <TabsContent value="peptides" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Related Peptides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {relatedPeptides.map((slugStr) => {
                    const label = slugStr
                      .split("-")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(" ");
                    return (
                      <li key={slugStr} className="flex items-center gap-2">
                        <span className="text-muted-foreground">•</span>
                        <Link
                          href={`/peptides/${slugStr}`}
                          className="text-primary hover:underline"
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
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

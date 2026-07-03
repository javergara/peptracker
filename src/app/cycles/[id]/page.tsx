import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Pencil,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { CycleActions } from "@/components/cycles/cycle-actions";
import { CycleLogFields } from "@/components/cycles/cycle-log-fields";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { DoseRowActions } from "@/components/log/dose-row-actions";
import { ActiveLevelsChart } from "@/components/metrics/active-levels-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { logDose } from "@/lib/actions/doses";
import {
  getActiveCyclePeptideIds,
  getAllInteractionRows,
  getCurrentUser,
  getCycle,
  getActiveVialsForPeptide,
  getLabResultsInRange,
  getMeasurementsInRange,
  getPricedSupplyForPeptide,
  listBiomarkers,
  listPeptides,
} from "@/lib/queries";
import { cycleProgress, type ScheduleConfig } from "@/lib/schedule";
import { doseDefaultsByPeptide } from "@/lib/cycles";
import { addDays, formatDate } from "@/lib/dates";
import { activeLevelSeries, type PkDose } from "@/lib/pk";
import { suggestNextSite } from "@/lib/sites";
import { findInteractions } from "@/lib/interactions";
import {
  BASELINE_WINDOW_DAYS,
  computeCycleInsights,
  type MetricPoint,
} from "@/lib/cycle-insights";
import {
  estimateCyclePeptideCost,
  sumCyclePeptideCosts,
} from "@/lib/cycle-cost";
import { formatCost } from "@/lib/cost";
import { toMcg } from "@/lib/stock";
import { cn } from "@/lib/utils";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MEASUREMENT_LABELS: Record<string, string> = {
  weight: "Weight",
  bodyFat: "Body fat",
  sleep: "Sleep",
  recovery: "Recovery",
};

/** Clinical-tone pill classes for an interaction kind (ok/warn/bad tokens). */
const INTERACTION_TONE: Record<string, string> = {
  avoid: "bg-bad-wash text-bad border-transparent",
  caution: "bg-warn-wash text-warn-foreground border-transparent",
  synergy: "bg-ok-wash text-ok border-transparent",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Whether an insight's direction is clinically/goal meaningful, and which way
 * is "good" — only for metrics we know a direction for (the four measurement
 * types with an obvious goal, or a biomarker with a catalog `direction`).
 * Everything else renders neutral (no ok/bad coloring).
 */
function insightGoodDirection(
  key: string,
  biomarkerDirection: Map<string, string | null>,
): "up" | "down" | null {
  if (key === "weight" || key === "bodyFat") return "down";
  if (key === "sleep" || key === "recovery") return "up";
  const dir = biomarkerDirection.get(key);
  if (dir === "high") return "down"; // higher is worse -> good direction is down
  if (dir === "low") return "up"; // lower is worse -> good direction is up
  return null;
}

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, cycle] = await Promise.all([getCurrentUser(), getCycle(id)]);
  if (!cycle) notFound();

  const prog = cycleProgress(cycle.startDate, cycle.endDate);
  const cfg = cycle.scheduleConfig as ScheduleConfig | null;

  // Peptides available to log for this cycle.
  const peptideOptions = cycle.peptide
    ? [cycle.peptide]
    : (cycle.stack?.items.map((i) => i.peptide) ?? []);

  // Per-peptide dose defaults for the log form: a single-peptide cycle maps its
  // one peptide to dosePerAdmin/unit; a stack cycle uses its per-peptide items.
  const doseByPeptide = cycle.peptide
    ? {
        [cycle.peptide.id]: {
          dose: cfg?.dosePerAdmin,
          unit: cfg?.unit ?? "mcg",
        },
      }
    : doseDefaultsByPeptide(cfg?.items);

  // Active vials for single-peptide cycles
  const activeVials = cycle.peptide
    ? await getActiveVialsForPeptide(cycle.peptide.id)
    : [];

  // Suggest next injection site from cycle dose history
  const lastSite = cycle.doseLogs.find((d) => d.site)?.site ?? null;
  const suggestedSite = suggestNextSite(lastSite);

  // Active-levels (estimated PK) — group this cycle's doses by peptide, keep
  // only peptides with a configured half-life. Uses ALL of the cycle's
  // already-loaded doseLogs (not just the display window) so a dose taken
  // just before the window still contributes its decaying tail correctly.
  const now = new Date();
  const windowEnd = cycle.endDate && cycle.endDate < now ? cycle.endDate : now;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const windowStartDate = new Date(
    Math.max(cycle.startDate.getTime(), windowEnd.getTime() - FOURTEEN_DAYS_MS),
  );
  const activeLevelsFrom = windowStartDate.getTime();
  const activeLevelsTo = windowEnd.getTime();

  const pkGroups = new Map<
    string,
    { name: string; halfLifeHours: number; doses: PkDose[] }
  >();
  for (const d of cycle.doseLogs) {
    const hl = d.peptide.halfLifeHours;
    if (!hl || hl <= 0) continue;
    const group = pkGroups.get(d.peptideId) ?? {
      name: d.peptide.name,
      halfLifeHours: hl,
      doses: [],
    };
    group.doses.push({ t: d.takenAt.getTime(), amount: d.amount });
    pkGroups.set(d.peptideId, group);
  }
  const activeLevelSeriesData = Array.from(pkGroups.values()).map((g) => ({
    peptideName: g.name,
    points: activeLevelSeries(
      g.doses,
      g.halfLifeHours,
      activeLevelsFrom,
      activeLevelsTo,
    ),
  }));
  const hasConfiguredHalfLife = peptideOptions.some(
    (p) => p.halfLifeHours != null && p.halfLifeHours > 0,
  );

  const vialsForForm = activeVials.map((v) => ({
    id: v.id,
    label: v.label,
    remainingMcg: v.remainingMcg,
    peptideName: cycle.peptide?.name ?? undefined,
  }));

  // --- Cycle insights ("what changed during this cycle") --------------------
  // Compares each measurement/lab metric's pre-cycle baseline (avg of the
  // BASELINE_WINDOW_DAYS before start) against its latest in-cycle value.
  // Correlational only — see the disclaimer + the card's own caption.
  const insightsWindowEnd = cycle.endDate ?? now;
  const baselineStart = new Date(
    cycle.startDate.getTime() - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const [measurementsInRange, labsInRange, biomarkers] = await Promise.all([
    getMeasurementsInRange(baselineStart, insightsWindowEnd),
    getLabResultsInRange(baselineStart, insightsWindowEnd),
    listBiomarkers(),
  ]);
  const biomarkerDirection = new Map(
    biomarkers.map((b) => [b.slug, b.direction]),
  );
  const metricPoints: MetricPoint[] = [
    ...measurementsInRange.map((m) => ({
      key: m.type === "custom" ? `custom:${m.label ?? "Custom"}` : m.type,
      label:
        m.type === "custom"
          ? (m.label ?? "Custom")
          : (MEASUREMENT_LABELS[m.type] ?? m.type),
      unit: m.unit,
      date: m.recordedAt,
      value: m.value,
    })),
    ...labsInRange.map((l) => ({
      key: l.biomarkerSlug ?? `lab:${l.marker}`,
      label: l.marker,
      unit: l.unit,
      date: l.takenAt,
      value: l.value,
    })),
  ];
  const insights = computeCycleInsights(
    metricPoints,
    cycle.startDate,
    insightsWindowEnd,
  );

  // --- Live interaction guard -------------------------------------------
  // Only meaningful while THIS cycle is active — checks for synergy/caution/
  // avoid edges among every peptide currently in play across ALL active
  // cycles (a stack cycle's own peptides included), read-only.
  let activeInteractionEdges: {
    aName: string;
    bName: string;
    kind: string;
    note: string;
  }[] = [];
  if (cycle.status === "active") {
    const [activePeptideIds, interactionRows, allPeptides] = await Promise.all([
      getActiveCyclePeptideIds(),
      getAllInteractionRows(),
      listPeptides(),
    ]);
    const peptideNameById = new Map(allPeptides.map((p) => [p.id, p.name]));
    activeInteractionEdges = findInteractions(
      activePeptideIds,
      interactionRows,
    ).map((edge) => ({
      aName: peptideNameById.get(edge.peptideAId) ?? "Unknown",
      bName: peptideNameById.get(edge.peptideBId) ?? "Unknown",
      kind: edge.kind,
      note: edge.note,
    }));
  }

  // --- Cost per cycle ---------------------------------------------------
  // One cost input per dosed peptide (single-peptide cycles have one; stack
  // cycles have one per stack item), priced from the peptide's most recently
  // priced vial/stock. `prog.totalDays` is null for an open-ended cycle, so
  // the projection falls back to a per-month estimate.
  const peptideCostInputs: { peptideId: string; doseMcg: number | null }[] =
    cycle.peptide
      ? [
          {
            peptideId: cycle.peptide.id,
            doseMcg: toMcg(cfg?.dosePerAdmin, cfg?.unit),
          },
        ]
      : (cfg?.items ?? []).map((it) => ({
          peptideId: it.peptideId,
          doseMcg: toMcg(it.dose, it.unit),
        }));
  const doseCountByPeptide = new Map<string, number>();
  for (const d of cycle.doseLogs) {
    doseCountByPeptide.set(
      d.peptideId,
      (doseCountByPeptide.get(d.peptideId) ?? 0) + 1,
    );
  }
  const supplies =
    peptideCostInputs.length > 0
      ? await Promise.all(
          peptideCostInputs.map((i) => getPricedSupplyForPeptide(i.peptideId)),
        )
      : [];
  const peptideCosts = peptideCostInputs.map((input, i) =>
    estimateCyclePeptideCost(
      {
        peptideId: input.peptideId,
        doseMcg: input.doseMcg,
        frequency: cfg?.frequency ?? "daily",
        supply: supplies[i],
        loggedDoseCount: doseCountByPeptide.get(input.peptideId) ?? 0,
      },
      prog.totalDays,
    ),
  );
  const costSummary = sumCyclePeptideCosts(peptideCosts);

  // --- Washout ------------------------------------------------------------
  const washoutUntil =
    cycle.washoutDays != null && cycle.endDate
      ? addDays(cycle.endDate, cycle.washoutDays)
      : null;
  const inWashout =
    washoutUntil != null && cycle.endDate != null
      ? now >= cycle.endDate && now <= washoutUntil
      : false;

  const pct = prog.percent ?? 0;
  const weekNum =
    prog.daysElapsed > 0 ? Math.ceil((prog.daysElapsed + 1) / 7) : 1;
  const totalWeeks =
    prog.totalDays != null ? Math.ceil(prog.totalDays / 7) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={cycle.name}
        description={`${cycle.peptide?.name ?? cycle.stack?.name ?? "—"} · ${formatDate(
          cycle.startDate,
        )}${cycle.endDate ? ` → ${formatDate(cycle.endDate)}` : ""}`}
        accentColor={user.color ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href={`/cycles/${cycle.id}/edit`} />}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="outline" render={<Link href="/cycles" />}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />
      <Disclaimer className="mb-6" />

      {/* Ink hero — dominant metric for this cycle */}
      <InkPanel variant="hero" className="mb-6 p-6">
        <Eyebrow className="text-ink-accent">CYCLE PROGRESS</Eyebrow>
        <div className="mt-3 flex items-end gap-4">
          <span className="num text-ink-foreground text-[56px] leading-[.9] font-semibold">
            {pct}
            <span className="text-ink-muted text-[28px] font-medium">%</span>
          </span>
          {totalWeeks != null ? (
            <span className="num text-ink-muted pb-2 text-[18px]">
              wk{" "}
              <span className="text-ink-foreground font-semibold">
                {weekNum}
              </span>
              <span className="text-ink-faint"> / {totalWeeks}</span>
            </span>
          ) : (
            <span className="num text-ink-muted pb-2 text-[16px]">
              day{" "}
              <span className="text-ink-foreground font-semibold">
                {prog.daysElapsed + 1}
              </span>
            </span>
          )}
        </div>
        {/* Gradient progress bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full [background:var(--gradient-gauge)]"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {cfg ? (
          <p className="text-ink-muted mt-3 text-[13px]">
            {cfg.frequency}
            {cfg.daysOfWeek?.length
              ? ` (${cfg.daysOfWeek.map((d) => DAY_ABBR[d] ?? d).join(", ")})`
              : ""}
            {(cfg.timesPerDay ?? 1) > 1 ? ` · ${cfg.timesPerDay}×/day` : ""}
            {cfg.dosePerAdmin
              ? ` · ${cfg.dosePerAdmin} ${cfg.unit ?? "mcg"} per dose`
              : ""}
          </p>
        ) : null}
      </InkPanel>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CycleActions id={cycle.id} status={cycle.status} />
      </div>

      {hasConfiguredHalfLife ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-4">Active levels · est.</Eyebrow>
          <ActiveLevelsChart
            series={activeLevelSeriesData}
            from={activeLevelsFrom}
            to={activeLevelsTo}
          />
        </section>
      ) : peptideOptions.length > 0 ? (
        <p className="text-muted-foreground mb-6 text-xs">
          Add a half-life to{" "}
          {peptideOptions.length > 1 ? "a peptide" : "this peptide"} to chart
          its estimated active levels.
        </p>
      ) : null}

      {cycle.notes ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-2">Notes</Eyebrow>
          <p className="text-foreground text-sm whitespace-pre-wrap">
            {cycle.notes}
          </p>
        </section>
      ) : null}

      {/* Live interaction guard — active cycle only, edges among everything
          currently being dosed together. */}
      {activeInteractionEdges.length > 0 ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-1 flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" aria-hidden />
            Live interaction guard
          </Eyebrow>
          <p className="text-muted-foreground mb-4 text-xs">
            Peptides currently active together across your cycles.
          </p>
          <div className="space-y-2.5">
            {activeInteractionEdges.map((edge, i) => (
              <div
                key={`${edge.aName}-${edge.bName}-${i}`}
                className="border-border flex items-start gap-3 rounded-xl border p-3"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-0.5 shrink-0 capitalize",
                    INTERACTION_TONE[edge.kind],
                  )}
                >
                  {edge.kind}
                </Badge>
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium">
                    {edge.aName} + {edge.bName}
                  </p>
                  <p className="text-muted-foreground text-xs">{edge.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Cycle insights — what changed during this cycle vs. its baseline. */}
      {insights.length > 0 ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-1">What changed during this cycle</Eyebrow>
          <p className="text-muted-foreground mb-4 text-xs">
            Associations only — not proof of cause.
          </p>
          <div>
            {insights.map((insight, i) => {
              const good = insightGoodDirection(
                insight.key,
                biomarkerDirection,
              );
              const color =
                insight.direction === "flat" || good == null
                  ? "var(--muted-foreground)"
                  : insight.direction === good
                    ? "var(--ok)"
                    : "var(--bad)";
              const Icon =
                insight.direction === "up"
                  ? TrendingUp
                  : insight.direction === "down"
                    ? TrendingDown
                    : Minus;
              return (
                <div
                  key={insight.key}
                  className={cn(
                    "flex items-center justify-between gap-3 py-2.5",
                    i < insights.length - 1 && "border-border border-b",
                  )}
                >
                  <span className="text-foreground text-sm font-medium">
                    {insight.label}
                  </span>
                  <span className="num flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {round1(insight.baseline)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground font-semibold">
                      {round1(insight.latest)}
                    </span>
                    {insight.unit ? (
                      <span className="text-muted-foreground text-xs">
                        {insight.unit}
                      </span>
                    ) : null}
                    <Icon className="size-3.5" style={{ color }} aria-hidden />
                    {insight.deltaPct != null ? (
                      <span style={{ color }} className="text-xs">
                        {insight.deltaPct > 0 ? "+" : ""}
                        {round1(insight.deltaPct)}%
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Cost per cycle — only when a priced vial/stock exists for a dosed peptide. */}
      {costSummary.hasData ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-4">Cost estimate</Eyebrow>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Spent so far</p>
              <p className="num text-foreground text-2xl font-semibold">
                {formatCost(costSummary.spentSoFar)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {cycle.endDate
                  ? "Projected for full cycle"
                  : "Projected per month"}
              </p>
              <p className="num text-foreground text-2xl font-semibold">
                {formatCost(costSummary.projected)}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Estimated from your most recently priced vial/stock — actual prices
            may vary.
          </p>
        </section>
      ) : null}

      {/* Washout — planned rest period after the cycle ends. */}
      {washoutUntil ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-2">Washout</Eyebrow>
          <p className="text-foreground text-sm">
            Rest period until{" "}
            <span className="num font-semibold">
              {formatDate(washoutUntil)}
            </span>
            {inWashout ? (
              <Badge
                variant="outline"
                className="bg-warn-wash text-warn-foreground ml-2 border-transparent align-middle"
              >
                Currently in washout
              </Badge>
            ) : null}
          </p>
        </section>
      ) : null}

      <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
        <Eyebrow className="mb-4">Log a dose for this cycle</Eyebrow>
        <ActionForm
          action={logDose}
          success="Dose logged"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="cycleId" value={cycle.id} />
          <CycleLogFields
            peptideOptions={peptideOptions}
            doseByPeptide={doseByPeptide}
          />

          {/* Enriched optional fields — spans the full grid */}
          <div className="contents">
            <DoseFormFields
              vials={vialsForForm}
              suggestedSite={suggestedSite}
              lastSite={lastSite}
              weightUnit={user.weightUnit}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <SubmitButton>Log dose</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card-surface rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
        <Eyebrow className="mb-4">
          Dose history · <span className="num">{cycle.doseLogs.length}</span>
        </Eyebrow>
        {cycle.doseLogs.length === 0 ? (
          <EmptyState title="No doses logged for this cycle yet." />
        ) : (
          <div>
            {/* Column headers */}
            <div className="eyebrow border-border text-muted-foreground mb-0.5 grid grid-cols-[1.6fr_.8fr_1fr_.9fr_.5fr] border-b px-1 pb-[9px]">
              <span>PEPTIDE</span>
              <span>AMOUNT</span>
              <span>WHEN</span>
              <span>SITE</span>
              <span />
            </div>
            {cycle.doseLogs.map((d, i) => (
              <div
                key={d.id}
                className={`grid grid-cols-[1.6fr_.8fr_1fr_.9fr_.5fr] items-center px-1 py-[11px] text-[13px] ${
                  i < cycle.doseLogs.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <span className="text-foreground flex items-center gap-[9px] font-medium">
                  <span
                    className="block h-[18px] w-[3px] shrink-0 rounded-full"
                    style={{ background: user.color ?? "#7C3AED" }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    {d.peptide.name}
                    {d.notes ? (
                      <span
                        className="text-muted-foreground block max-w-[200px] truncate text-xs font-normal"
                        title={d.notes}
                      >
                        {d.notes}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="num text-foreground">
                  {d.amount} {d.unit}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(d.takenAt, "MMM d · HH:mm")}
                </span>
                <span className="text-muted-foreground">{d.site ?? "—"}</span>
                <span className="flex justify-end">
                  <DoseRowActions id={d.id} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

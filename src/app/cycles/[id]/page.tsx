import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { EmptyState } from "@/components/common/empty-state";
import { CycleActions } from "@/components/cycles/cycle-actions";
import { CycleLogFields } from "@/components/cycles/cycle-log-fields";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { DoseRowActions } from "@/components/log/dose-row-actions";
import { Button } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { logDose } from "@/lib/actions/doses";
import {
  getCurrentUser,
  getCycle,
  getActiveVialsForPeptide,
} from "@/lib/queries";
import { cycleProgress, type ScheduleConfig } from "@/lib/schedule";
import { doseDefaultsByPeptide } from "@/lib/cycles";
import { formatDate } from "@/lib/dates";
import { suggestNextSite } from "@/lib/sites";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const vialsForForm = activeVials.map((v) => ({
    id: v.id,
    label: v.label,
    remainingMcg: v.remainingMcg,
    peptideName: cycle.peptide?.name ?? undefined,
  }));

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

      {cycle.notes ? (
        <section className="card-surface mb-6 rounded-[18px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-2">Notes</Eyebrow>
          <p className="text-foreground text-sm whitespace-pre-wrap">
            {cycle.notes}
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

import {
  Check,
  TriangleAlert,
  CircleAlert,
  FlaskConical,
  Bell,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { RangeTrack } from "@/components/common/range-track";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { DeleteLabButton } from "@/components/labs/delete-lab-button";
import { PanelEntryForm } from "@/components/labs/panel-entry-form";
import { RecheckRow } from "@/components/labs/recheck-row";
import { MarkerTimelineChart } from "@/components/metrics/marker-timeline-chart";
import { ActionForm, SubmitButton } from "@/components/common/action-form";

import { addLab } from "@/lib/actions/labs";
import { addLabReminder } from "@/lib/actions/labReminders";
import {
  listLabs,
  getCurrentUser,
  listBiomarkers,
  listLabReminders,
  getInterventionBands,
} from "@/lib/queries";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { SYSTEM_LABELS, BIOMARKER_SYSTEMS } from "@/types/biomarker";
import { SYSTEM_BADGE, LAB_STATUS_STYLE } from "@/lib/constants";
import { labStatus, LAB_STATUS_LABEL } from "@/lib/labs";
import { cn } from "@/lib/utils";

export const metadata = { title: "Labs & Bloodwork" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

// ---------------------------------------------------------------------------
// RangeBadge — preserved for per-entry detail rows
// ---------------------------------------------------------------------------
function RangeBadge({
  value,
  refLow,
  refHigh,
}: {
  value: number;
  refLow: number | null;
  refHigh: number | null;
}) {
  if (refLow === null && refHigh === null) return null;
  const tooLow = refLow !== null && value < refLow;
  const tooHigh = refHigh !== null && value > refHigh;
  if (tooLow)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        Low
      </span>
    );
  if (tooHigh)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        High
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
      In range
    </span>
  );
}

// ---------------------------------------------------------------------------
// DeltaBadge — direction relative to in-range
// ---------------------------------------------------------------------------
function DeltaBadge({
  first,
  latest,
  refLow,
  refHigh,
}: {
  first: number;
  latest: number;
  refLow: number | null;
  refHigh: number | null;
}) {
  const delta = latest - first;
  if (delta === 0) return null;

  const inRange = (v: number) => {
    if (refLow !== null && v < refLow) return false;
    if (refHigh !== null && v > refHigh) return false;
    return true;
  };
  const firstIn = inRange(first);
  const latestIn = inRange(latest);
  const good = !firstIn && latestIn;

  const sign = delta > 0 ? "▲" : "▼";
  const abs = Math.abs(delta);
  const display = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 text-xs font-medium",
        good
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-amber-700 dark:text-amber-300",
      )}
    >
      {sign} {display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// countLabStatuses — counts ok/borderline/bad across the latest reading of
// each distinct marker that has a reference range.
// ---------------------------------------------------------------------------
function countLabStatuses(
  latestByKey: Array<{
    value: number;
    refLow: number | null;
    refHigh: number | null;
  }>,
) {
  let ok = 0;
  let borderline = 0;
  let bad = 0;
  for (const lab of latestByKey) {
    const result = labStatus(lab.value, lab.refLow, lab.refHigh);
    if (!result.hasRange) continue;
    if (result.status === "ok") ok++;
    else if (result.status === "borderline") borderline++;
    else bad++;
  }
  return { ok, borderline, bad };
}

// ---------------------------------------------------------------------------
// RefRangeCaption — "ref X–Y unit" or "optimal < X" / "optimal > X"
// ---------------------------------------------------------------------------
function RefRangeCaption({
  refLow,
  refHigh,
  unit,
}: {
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
}) {
  const u = unit ? ` ${unit}` : "";
  if (refLow !== null && refHigh !== null) {
    return (
      <span className="num text-[11px]" style={{ color: "#8B86AD" }}>
        ref {refLow}–{refHigh}
        {u}
      </span>
    );
  }
  if (refHigh !== null) {
    return (
      <span className="num text-[11px]" style={{ color: "#8B86AD" }}>
        optimal &lt; {refHigh}
        {u}
      </span>
    );
  }
  if (refLow !== null) {
    return (
      <span className="num text-[11px]" style={{ color: "#8B86AD" }}>
        optimal &gt; {refLow}
        {u}
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function LabsPage() {
  const now = new Date();

  const [labs, user, biomarkers, reminders] = await Promise.all([
    listLabs(),
    getCurrentUser(),
    listBiomarkers(),
    listLabReminders(),
  ]);

  const profileColor = user.color ?? "var(--chart-1)";

  // Build slug → biomarker map for fast system lookup
  const bmMap = new Map(biomarkers.map((b) => [b.slug, b]));

  // Determine full date span for intervention bands (oldest lab → now)
  const oldestLab = labs[0];
  const bandsStart = oldestLab ? oldestLab.takenAt : now;
  const bands =
    labs.length > 0 ? await getInterventionBands(bandsStart, now) : [];
  const bandsSerialized = bands.map((b) => ({
    id: b.id,
    label: b.label,
    kind: b.kind as "cycle" | "supplement",
    start: b.start.getTime(),
    end: b.end ? b.end.getTime() : null,
  }));

  // Group labs by (biomarkerSlug ?? marker), then by system
  // labs are already ordered oldest→newest by listLabs()
  const byKey = new Map<string, typeof labs>();
  for (const lab of labs) {
    const key = lab.biomarkerSlug ?? lab.marker;
    const arr = byKey.get(key) ?? [];
    arr.push(lab);
    byKey.set(key, arr);
  }

  // Assign each key a system
  function getSystem(key: string): string {
    const bm = bmMap.get(key);
    if (bm) return bm.system;
    return "OTHER";
  }

  // Group marker keys by system in canonical order
  const bySystem = new Map<string, string[]>();
  for (const sys of BIOMARKER_SYSTEMS) {
    bySystem.set(sys, []);
  }
  for (const key of byKey.keys()) {
    const sys = getSystem(key);
    const arr = bySystem.get(sys) ?? bySystem.get("OTHER")!;
    arr.push(key);
  }

  const hasLabs = byKey.size > 0;
  const today = toDateInputValue(now);

  // Reminder helpers
  const pendingReminders = reminders.filter((r) => !r.completedAt);
  const completedReminders = reminders.filter((r) => r.completedAt);

  // Compute count tiles: latest reading per marker
  const latestReadings = [...byKey.values()].map((rows) => {
    const latest = rows[rows.length - 1];
    return {
      value: latest.value,
      refLow: latest.refLow,
      refHigh: latest.refHigh,
    };
  });
  const statusCounts = countLabStatuses(latestReadings);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Labs & Bloodwork"
        description="Bloodwork markers against reference ranges."
        accentColor={profileColor}
      />

      <Disclaimer className="mb-6" />

      {/* ------------------------------------------------------------------ */}
      {/* COUNT TILES                                                          */}
      {/* ------------------------------------------------------------------ */}
      {hasLabs && (
        <div className="mb-6 flex flex-wrap gap-3">
          {/* In range */}
          <div className="card-surface flex flex-1 items-center gap-3 rounded-2xl px-4 py-3.5">
            <div className="bg-ok-wash text-ok flex size-[38px] shrink-0 items-center justify-center rounded-[10px]">
              <Check className="size-[18px]" strokeWidth={2} />
            </div>
            <div>
              <div className="num text-foreground text-[22px] leading-none font-semibold">
                {statusCounts.ok}
              </div>
              <div className="eyebrow mt-1">in range</div>
            </div>
          </div>

          {/* Borderline */}
          <div className="card-surface flex flex-1 items-center gap-3 rounded-2xl px-4 py-3.5">
            <div className="bg-warn-wash text-warn-foreground flex size-[38px] shrink-0 items-center justify-center rounded-[10px]">
              <TriangleAlert className="size-[18px]" strokeWidth={1.8} />
            </div>
            <div>
              <div className="num text-foreground text-[22px] leading-none font-semibold">
                {statusCounts.borderline}
              </div>
              <div className="eyebrow mt-1">borderline</div>
            </div>
          </div>

          {/* Out of range */}
          <div className="card-surface flex flex-1 items-center gap-3 rounded-2xl px-4 py-3.5">
            <div className="bg-bad-wash text-bad flex size-[38px] shrink-0 items-center justify-center rounded-[10px]">
              <CircleAlert className="size-[18px]" strokeWidth={1.8} />
            </div>
            <div>
              <div className="num text-foreground text-[22px] leading-none font-semibold">
                {statusCounts.bad}
              </div>
              <div className="eyebrow mt-1">out of range</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RESULTS grouped by system → marker                                  */}
      {/* ------------------------------------------------------------------ */}
      {!hasLabs ? (
        <EmptyState
          icon={<FlaskConical className="size-6" />}
          title="No lab results yet"
          description="Log a panel or add a single result below to start tracking biomarker trends."
        />
      ) : (
        <div className="space-y-8">
          {BIOMARKER_SYSTEMS.map((sys) => {
            const keys = bySystem.get(sys) ?? [];
            if (keys.length === 0) return null;

            // Separate keys with range (for the track list) from those without
            const keysWithRange = keys.filter((key) => {
              const rows = byKey.get(key)!;
              const latest = rows[rows.length - 1];
              return latest.refLow !== null || latest.refHigh !== null;
            });

            return (
              <section key={sys} aria-labelledby={`section-${sys}`}>
                {/* System heading */}
                <div className="mb-3 flex items-center gap-2">
                  <h2
                    id={`section-${sys}`}
                    className="text-base font-semibold tracking-tight"
                  >
                    {SYSTEM_LABELS[sys]}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      SYSTEM_BADGE[sys],
                    )}
                  >
                    {keys.length} marker{keys.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Reference-range track list (markers with a range) */}
                {keysWithRange.length > 0 && (
                  <div className="card-surface mb-4 rounded-[18px] px-[22px] py-2">
                    {keysWithRange.map((key, i) => {
                      const rows = byKey.get(key)!;
                      const latest = rows[rows.length - 1];
                      const bm = bmMap.get(key);
                      const markerName = bm?.name ?? latest.marker;
                      const rail = labStatus(
                        latest.value,
                        latest.refLow,
                        latest.refHigh,
                      );
                      const style = LAB_STATUS_STYLE[rail.status];
                      const statusLabel = LAB_STATUS_LABEL[rail.status];

                      return (
                        <div
                          key={key}
                          className={cn(
                            "grid items-center gap-[18px] py-[15px]",
                            "grid-cols-1 sm:grid-cols-[185px_1fr_132px]",
                            i < keysWithRange.length - 1 &&
                              "border-b border-[#F4F1FA] dark:border-white/5",
                          )}
                        >
                          {/* LEFT: name + ref caption */}
                          <div>
                            <div className="text-foreground text-sm font-medium">
                              {markerName}
                            </div>
                            <RefRangeCaption
                              refLow={latest.refLow}
                              refHigh={latest.refHigh}
                              unit={latest.unit}
                            />
                          </div>

                          {/* MIDDLE: range track rail */}
                          <RangeTrack
                            value={latest.value}
                            refLow={latest.refLow}
                            refHigh={latest.refHigh}
                          />

                          {/* RIGHT: value + status */}
                          <div className="text-right sm:text-right">
                            <span className="num text-foreground text-lg font-semibold">
                              {latest.value}
                            </span>
                            {latest.unit ? (
                              <span
                                className="ml-1 text-[11px]"
                                style={{ color: "#8B86AD" }}
                              >
                                {latest.unit}
                              </span>
                            ) : null}
                            <div
                              className={cn(
                                "text-[11px] font-medium",
                                style.text,
                              )}
                            >
                              {statusLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Per-marker detail cards with timeline charts */}
                <div className="grid gap-4">
                  {keys.map((key) => {
                    const rows = byKey.get(key)!;
                    const first = rows[0];
                    const latest = rows[rows.length - 1];
                    const bm = bmMap.get(key);

                    const points = rows.map((r) => ({
                      t: r.takenAt.getTime(),
                      value: r.value,
                    }));

                    return (
                      <div key={key} className="card-surface rounded-2xl">
                        {/* Card header */}
                        <div className="border-border border-b px-5 pt-4 pb-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <Eyebrow className="mb-1">
                                {SYSTEM_LABELS[sys]}
                              </Eyebrow>
                              <h3 className="text-base font-semibold tracking-tight">
                                {bm?.name ?? latest.marker}
                              </h3>
                              {latest.unit ? (
                                <span className="text-muted-foreground text-xs">
                                  {latest.unit}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="num text-base font-semibold">
                                {latest.value}
                              </span>
                              {rows.length > 1 ? (
                                <DeltaBadge
                                  first={first.value}
                                  latest={latest.value}
                                  refLow={latest.refLow}
                                  refHigh={latest.refHigh}
                                />
                              ) : null}
                              <RangeBadge
                                value={latest.value}
                                refLow={latest.refLow}
                                refHigh={latest.refHigh}
                              />
                            </div>
                          </div>
                          {latest.refLow !== null || latest.refHigh !== null ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              Reference range:{" "}
                              {latest.refLow !== null ? latest.refLow : "—"} –{" "}
                              {latest.refHigh !== null ? latest.refHigh : "—"}
                              {latest.unit ? ` ${latest.unit}` : ""}
                            </p>
                          ) : null}
                        </div>

                        {/* Card body */}
                        <div className="px-5 pt-4 pb-4">
                          {/* Timeline chart when ≥2 readings */}
                          {rows.length >= 2 ? (
                            <div className="mb-4">
                              <MarkerTimelineChart
                                points={points}
                                bands={bandsSerialized}
                                refLow={latest.refLow}
                                refHigh={latest.refHigh}
                                unit={latest.unit}
                                color={profileColor}
                              />
                            </div>
                          ) : (
                            <p className="text-muted-foreground mb-4 text-sm">
                              Add more results for this marker to see a trend
                              chart.
                            </p>
                          )}

                          {/* Individual entries — newest first */}
                          <div className="divide-y">
                            {[...rows].reverse().map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between py-2"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-muted-foreground text-xs">
                                    {formatDate(r.takenAt, "MMM d, yyyy")}
                                  </span>
                                  <span className="num text-sm font-medium">
                                    {r.value}
                                    {r.unit ? ` ${r.unit}` : ""}
                                  </span>
                                  <RangeBadge
                                    value={r.value}
                                    refLow={r.refLow}
                                    refHigh={r.refHigh}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.notes ? (
                                    <span
                                      className="text-muted-foreground max-w-[180px] truncate text-xs"
                                      title={r.notes}
                                    >
                                      {r.notes}
                                    </span>
                                  ) : null}
                                  <DeleteLabButton id={r.id} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ENTRY SECTION                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-10 space-y-2">
        <Eyebrow className="mb-3">Add results</Eyebrow>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Log a panel */}
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">Panel entry</Eyebrow>
              <h2 className="text-base font-semibold tracking-tight">
                Log a panel
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Enter results from a full blood panel at once. Fill in only the
                markers you have — empty fields are skipped.
              </p>
            </div>
            <div className="px-5 py-4">
              <PanelEntryForm
                biomarkers={biomarkers.map((b) => ({
                  slug: b.slug,
                  name: b.name,
                  system: b.system,
                  unit: b.unit,
                }))}
              />
            </div>
          </div>

          {/* Add a single result */}
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">Single result</Eyebrow>
              <h2 className="text-base font-semibold tracking-tight">
                Add a single result
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Log one marker. Choose a catalog entry to auto-fill unit and
                reference range, or enter a custom marker name.
              </p>
            </div>
            <div className="px-5 py-4">
              <ActionForm
                action={addLab}
                success="Lab result added"
                className="grid gap-4 sm:grid-cols-2"
              >
                {/* Biomarker select */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="lab-biomarker"
                    className="text-sm font-medium"
                  >
                    Catalog marker
                  </label>
                  <select
                    id="lab-biomarker"
                    name="biomarkerSlug"
                    defaultValue=""
                    className={inputCls}
                  >
                    <option value="">— custom entry —</option>
                    {BIOMARKER_SYSTEMS.map((sys) => {
                      const group = biomarkers.filter((b) => b.system === sys);
                      if (group.length === 0) return null;
                      return (
                        <optgroup key={sys} label={SYSTEM_LABELS[sys]}>
                          {group.map((b) => (
                            <option key={b.slug} value={b.slug}>
                              {b.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Custom marker name (free-form fallback) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="lab-marker" className="text-sm font-medium">
                    Marker name{" "}
                    <span className="text-muted-foreground font-normal">
                      (required for custom)
                    </span>
                  </label>
                  <input
                    id="lab-marker"
                    name="marker"
                    placeholder="e.g. IGF-1, Free T, HbA1c"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-value" className="text-sm font-medium">
                    Value <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="lab-value"
                    name="value"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-unit" className="text-sm font-medium">
                    Unit{" "}
                    <span className="text-muted-foreground font-normal">
                      (auto-filled from catalog)
                    </span>
                  </label>
                  <input
                    id="lab-unit"
                    name="unit"
                    placeholder="ng/mL, pg/mL…"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-low" className="text-sm font-medium">
                    Ref Low
                  </label>
                  <input
                    id="lab-low"
                    name="refLow"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="optional"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-high" className="text-sm font-medium">
                    Ref High
                  </label>
                  <input
                    id="lab-high"
                    name="refHigh"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="optional"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-date" className="text-sm font-medium">
                    Date taken
                  </label>
                  <input
                    id="lab-date"
                    name="takenAt"
                    type="date"
                    defaultValue={today}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lab-notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <input
                    id="lab-notes"
                    name="notes"
                    placeholder="optional"
                    className={inputCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <SubmitButton>
                    <FlaskConical className="size-4" />
                    Add result
                  </SubmitButton>
                </div>
              </ActionForm>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RECHECKS                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-10" aria-labelledby="rechecks-heading">
        <div className="mb-3 flex items-center gap-2">
          <Eyebrow>Recheck reminders</Eyebrow>
          {pendingReminders.length > 0 ? (
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
              {pendingReminders.length} pending
            </span>
          ) : null}
        </div>
        <h2
          id="rechecks-heading"
          className="mb-4 text-base font-semibold tracking-tight"
        >
          Lab recheck reminders
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Schedule form */}
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">Schedule</Eyebrow>
              <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Bell className="size-4" />
                Schedule a recheck
              </h3>
            </div>
            <div className="px-5 py-4">
              <ActionForm
                action={addLabReminder}
                success="Reminder scheduled"
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="reminder-label"
                    className="text-sm font-medium"
                  >
                    Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="reminder-label"
                    name="label"
                    required
                    placeholder="e.g. Recheck ALT / AST"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reminder-due" className="text-sm font-medium">
                    Due date <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="reminder-due"
                    name="dueAt"
                    type="date"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reminder-biomarker"
                    className="text-sm font-medium"
                  >
                    Biomarker{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <select
                    id="reminder-biomarker"
                    name="biomarkerSlug"
                    defaultValue=""
                    className={inputCls}
                  >
                    <option value="">— none —</option>
                    {BIOMARKER_SYSTEMS.map((sys) => {
                      const group = biomarkers.filter((b) => b.system === sys);
                      if (group.length === 0) return null;
                      return (
                        <optgroup key={sys} label={SYSTEM_LABELS[sys]}>
                          {group.map((b) => (
                            <option key={b.slug} value={b.slug}>
                              {b.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="reminder-note"
                    className="text-sm font-medium"
                  >
                    Note{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="reminder-note"
                    name="note"
                    placeholder="e.g. Fast for 12 h beforehand"
                    className={inputCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <SubmitButton>
                    <Bell className="size-4" />
                    Schedule
                  </SubmitButton>
                </div>
              </ActionForm>
            </div>
          </div>

          {/* Reminders list */}
          <div className="card-surface rounded-2xl">
            <div className="border-border border-b px-5 pt-4 pb-3">
              <Eyebrow className="mb-1">Upcoming &amp; past</Eyebrow>
              <h3 className="text-base font-semibold tracking-tight">
                Reminders
              </h3>
            </div>
            <div className="px-5 py-4">
              {reminders.length === 0 ? (
                <EmptyState
                  icon={<Bell className="size-5" />}
                  title="No reminders yet"
                  description="Schedule a recheck to keep your bloodwork on track."
                />
              ) : (
                <div className="divide-y">
                  {pendingReminders.map((r) => (
                    <RecheckRow
                      key={r.id}
                      id={r.id}
                      label={r.label}
                      dueAt={r.dueAt.toISOString()}
                      note={r.note}
                      completedAt={null}
                      biomarkerName={
                        r.biomarkerSlug
                          ? (bmMap.get(r.biomarkerSlug)?.name ?? null)
                          : null
                      }
                      isOverdue={r.dueAt <= now}
                    />
                  ))}
                  {completedReminders.map((r) => (
                    <RecheckRow
                      key={r.id}
                      id={r.id}
                      label={r.label}
                      dueAt={r.dueAt.toISOString()}
                      note={r.note}
                      completedAt={r.completedAt!.toISOString()}
                      biomarkerName={
                        r.biomarkerSlug
                          ? (bmMap.get(r.biomarkerSlug)?.name ?? null)
                          : null
                      }
                      isOverdue={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

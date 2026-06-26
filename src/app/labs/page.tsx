import { FlaskConical, Bell } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { DeleteLabButton } from "@/components/labs/delete-lab-button";
import { PanelEntryForm } from "@/components/labs/panel-entry-form";
import { RecheckRow } from "@/components/labs/recheck-row";
import { MarkerTimelineChart } from "@/components/metrics/marker-timeline-chart";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SYSTEM_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Labs & Bloodwork" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

// ---------------------------------------------------------------------------
// RangeBadge — preserved from original page
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
// Delta badge — direction relative to in-range
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

  // "toward in-range" is good (green), "away" is amber
  const inRange = (v: number) => {
    if (refLow !== null && v < refLow) return false;
    if (refHigh !== null && v > refHigh) return false;
    return true;
  };
  const firstIn = inRange(first);
  const latestIn = inRange(latest);
  // moved from out → in = good, in → out = amber, both out = neutral amber
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
    // Try to match by marker name if slug lookup fails
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

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Labs & Bloodwork"
        description="Track biomarker trends alongside your peptide cycles."
        accentColor={profileColor}
      />

      <Disclaimer className="mb-6" />

      {/* ------------------------------------------------------------------ */}
      {/* ENTRY SECTION                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Log a panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4" />
              Log a panel
            </CardTitle>
            <CardDescription>
              Enter results from a full blood panel at once. Fill in only the
              markers you have — empty fields are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PanelEntryForm
              biomarkers={biomarkers.map((b) => ({
                slug: b.slug,
                name: b.name,
                system: b.system,
                unit: b.unit,
              }))}
            />
          </CardContent>
        </Card>

        {/* Add a single result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4" />
              Add a single result
            </CardTitle>
            <CardDescription>
              Log one marker. Choose a catalog entry to auto-fill unit and
              reference range, or enter a custom marker name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={addLab}
              success="Lab result added"
              className="grid gap-4 sm:grid-cols-2"
            >
              {/* Biomarker select */}
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="lab-biomarker" className="text-sm font-medium">
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
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RESULTS grouped by system → marker                                  */}
      {/* ------------------------------------------------------------------ */}
      {!hasLabs ? (
        <EmptyState
          icon={<FlaskConical className="size-6" />}
          title="No lab results yet"
          description="Log a panel or add a single result above to start tracking biomarker trends."
        />
      ) : (
        <div className="space-y-8">
          {BIOMARKER_SYSTEMS.map((sys) => {
            const keys = bySystem.get(sys) ?? [];
            if (keys.length === 0) return null;

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

                <div className="grid gap-4">
                  {keys.map((key) => {
                    const rows = byKey.get(key)!;
                    // rows are oldest → newest from listLabs()
                    const first = rows[0];
                    const latest = rows[rows.length - 1];
                    const bm = bmMap.get(key);

                    const points = rows.map((r) => ({
                      t: r.takenAt.getTime(),
                      value: r.value,
                    }));

                    return (
                      <Card key={key}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <CardTitle>{bm?.name ?? latest.marker}</CardTitle>
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
                            <p className="text-muted-foreground text-xs">
                              Reference range:{" "}
                              {latest.refLow !== null ? latest.refLow : "—"} –{" "}
                              {latest.refHigh !== null ? latest.refHigh : "—"}
                              {latest.unit ? ` ${latest.unit}` : ""}
                            </p>
                          ) : null}
                        </CardHeader>

                        <CardContent>
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RECHECKS                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-10" aria-labelledby="rechecks-heading">
        <div className="mb-4 flex items-center gap-2">
          <h2
            id="rechecks-heading"
            className="text-base font-semibold tracking-tight"
          >
            Lab recheck reminders
          </h2>
          {pendingReminders.length > 0 ? (
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
              {pendingReminders.length} pending
            </span>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Schedule form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4" />
                Schedule a recheck
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Reminders list */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming &amp; past</CardTitle>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <EmptyState
                  icon={<Bell className="size-5" />}
                  title="No reminders yet"
                  description="Schedule a recheck to keep your bloodwork on track."
                />
              ) : (
                <div className="divide-y">
                  {/* Pending (due first) */}
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
                  {/* Completed (struck-through, below) */}
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
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

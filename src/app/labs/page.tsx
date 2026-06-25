import { FlaskConical } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { DeleteLabButton } from "@/components/labs/delete-lab-button";
import { MetricChart } from "@/components/metrics/metric-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addLab } from "@/lib/actions/labs";
import { listLabs, getCurrentUser } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Labs & Bloodwork" };

export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

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

  if (tooLow) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        Low
      </span>
    );
  }
  if (tooHigh) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        High
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
      In range
    </span>
  );
}

export default async function LabsPage() {
  const [labs, user] = await Promise.all([listLabs(), getCurrentUser()]);

  const profileColor = user.color ?? "var(--chart-1)";

  // Group by marker (already ordered asc by takenAt).
  const byMarker = new Map<string, typeof labs>();
  for (const lab of labs) {
    const arr = byMarker.get(lab.marker) ?? [];
    arr.push(lab);
    byMarker.set(lab.marker, arr);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Labs & Bloodwork"
        description="Track biomarker trends alongside your peptide cycles."
        accentColor={profileColor}
      />

      <Disclaimer className="mb-6" />

      {/* Add lab result form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add lab result</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={addLab}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Marker <span className="text-destructive">*</span>
              </label>
              <input
                name="marker"
                required
                placeholder="e.g. IGF-1, Free T, HbA1c"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Value <span className="text-destructive">*</span>
              </label>
              <input
                name="value"
                type="number"
                step="any"
                required
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <input
                name="unit"
                placeholder="ng/mL, pg/mL…"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ref Low</label>
              <input
                name="refLow"
                type="number"
                step="any"
                placeholder="optional"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ref High</label>
              <input
                name="refHigh"
                type="number"
                step="any"
                placeholder="optional"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date taken</label>
              <input name="takenAt" type="date" className={inputCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium">Notes</label>
              <input name="notes" placeholder="optional" className={inputCls} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">
                <FlaskConical className="size-4" />
                Add result
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results grouped by marker */}
      {byMarker.size === 0 ? (
        <EmptyState
          icon={<FlaskConical className="size-6" />}
          title="No lab results yet"
          description="Add your first lab result above to start tracking biomarker trends."
        />
      ) : (
        <div className="grid gap-6">
          {Array.from(byMarker.entries()).map(([marker, rows]) => {
            const latest = rows[rows.length - 1];
            const chartData = rows.map((r) => ({
              date: formatDate(r.takenAt, "MMM d"),
              value: r.value,
            }));
            return (
              <Card key={marker}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>{marker}</CardTitle>
                      {latest.unit ? (
                        <span className="text-muted-foreground text-sm font-normal">
                          ({latest.unit})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num text-base font-semibold">
                        {latest.value}
                      </span>
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
                  {rows.length > 1 ? (
                    <MetricChart
                      data={chartData}
                      color={profileColor}
                      unit={latest.unit}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Add more results for this marker to see a trend chart.
                    </p>
                  )}

                  {/* Individual entries */}
                  <div className="mt-4 divide-y">
                    {[...rows].reverse().map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-3">
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
                              className="text-muted-foreground max-w-[200px] truncate text-xs"
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
      )}
    </div>
  );
}

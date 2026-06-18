import { LineChart as LineChartIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { MetricChart } from "@/components/metrics/metric-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addMeasurement } from "@/lib/actions/measurements";
import { listMeasurements } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Metrics" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

const TYPE_LABELS: Record<string, string> = {
  weight: "Weight",
  bodyFat: "Body fat",
  sleep: "Sleep",
  recovery: "Recovery",
  custom: "Custom",
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default async function MetricsPage() {
  const measurements = await listMeasurements();

  // Group by type (already ordered by recordedAt asc).
  const byType = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m);
    byType.set(m.type, arr);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Metrics"
        description="Track outcomes over time and correlate them with your cycles."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a measurement</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={addMeasurement}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select name="type" defaultValue="weight" className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Label</label>
              <input name="label" placeholder="optional" className={inputCls} />
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
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <input
                name="unit"
                placeholder="kg, %, hrs…"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <input name="recordedAt" type="date" className={inputCls} />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <Button type="submit">Add measurement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {byType.size === 0 ? (
        <EmptyState
          icon={<LineChartIcon className="size-6" />}
          title="No measurements yet"
          description="Add your first measurement above to see trends here."
        />
      ) : (
        <div className="grid gap-6">
          {Array.from(byType.entries()).map(([type, rows], idx) => {
            const data = rows.map((r) => ({
              date: formatDate(r.recordedAt, "MMM d"),
              value: r.value,
            }));
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle>
                    {TYPE_LABELS[type] ?? type}
                    {rows[0]?.unit ? (
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        ({rows[0].unit})
                      </span>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MetricChart
                    data={data}
                    color={CHART_COLORS[idx % CHART_COLORS.length]}
                    unit={rows[0]?.unit}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

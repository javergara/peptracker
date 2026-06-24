import {
  GitCompareArrows,
  LineChart as LineChartIcon,
  Smile,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { MetricChart } from "@/components/metrics/metric-chart";
import { CorrelationChart } from "@/components/metrics/correlation-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addMeasurement } from "@/lib/actions/measurements";
import {
  listMeasurements,
  getCurrentUser,
  getDoseLogsInRange,
  listLabs,
} from "@/lib/queries";
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

export default async function MetricsPage() {
  const now = new Date();
  const start90 = new Date(now);
  start90.setDate(start90.getDate() - 90);

  const [measurements, user, doseLogs, labs] = await Promise.all([
    listMeasurements(),
    getCurrentUser(),
    getDoseLogsInRange(start90, now),
    listLabs(),
  ]);

  const profileColor = user.color ?? "var(--chart-1)";

  // Bodyweight vs IGF-1 correlation: merge both series by calendar day.
  const weights = measurements.filter((m) => m.type === "weight");
  const igf = labs.filter((l) => /igf/i.test(l.marker));
  const corrMap = new Map<
    string,
    { ts: number; date: string; weight: number | null; igf: number | null }
  >();
  function corrKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  for (const w of weights) {
    const key = corrKey(w.recordedAt);
    const e = corrMap.get(key) ?? {
      ts: w.recordedAt.getTime(),
      date: formatDate(w.recordedAt, "MMM d"),
      weight: null,
      igf: null,
    };
    e.weight = w.value;
    corrMap.set(key, e);
  }
  for (const l of igf) {
    const key = corrKey(l.takenAt);
    const e = corrMap.get(key) ?? {
      ts: l.takenAt.getTime(),
      date: formatDate(l.takenAt, "MMM d"),
      weight: null,
      igf: null,
    };
    e.igf = l.value;
    corrMap.set(key, e);
  }
  const correlation = Array.from(corrMap.values()).sort((a, b) => a.ts - b.ts);
  const hasCorrelation = weights.length > 0 && igf.length > 0;
  const weightUnit = weights[0]?.unit ?? "kg";
  const igfUnit = igf[0]?.unit ?? "ng/mL";

  // Group measurements by type (already ordered by recordedAt asc).
  const byType = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m);
    byType.set(m.type, arr);
  }

  // Build mood & energy chart points from dose logs.
  const moodPoints = doseLogs
    .filter((d) => d.mood != null)
    .map((d) => ({
      date: formatDate(d.takenAt, "MMM d"),
      value: d.mood as number,
    }));

  const energyPoints = doseLogs
    .filter((d) => d.energy != null)
    .map((d) => ({
      date: formatDate(d.takenAt, "MMM d"),
      value: d.energy as number,
    }));

  const hasMoodData = moodPoints.length > 0 || energyPoints.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Metrics"
        description="Track outcomes over time and correlate them with your cycles."
        accentColor={profileColor}
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
          {Array.from(byType.entries()).map(([type, rows]) => {
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
                    color={profileColor}
                    unit={rows[0]?.unit}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bodyweight vs IGF-1 correlation */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Correlation
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Bodyweight vs IGF-1
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasCorrelation ? (
              <CorrelationChart
                data={correlation}
                leftLabel={`Weight (${weightUnit})`}
                rightLabel={`IGF-1 (${igfUnit})`}
                leftColor={profileColor}
                rightColor="var(--chart-3)"
              />
            ) : (
              <EmptyState
                icon={<GitCompareArrows className="size-6" />}
                title="Not enough data to correlate yet"
                description="Log bodyweight on the Metrics page and IGF-1 results on the Labs page to overlay them here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mood & Energy trends from dose logs (last 90 days) */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Mood &amp; Energy (last 90 days)
        </h2>
        {hasMoodData ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smile className="size-4" />
                  Mood
                  <span className="text-muted-foreground text-sm font-normal">
                    (1–5)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {moodPoints.length > 0 ? (
                  <MetricChart
                    data={moodPoints}
                    color={profileColor}
                    unit="/ 5"
                  />
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No mood ratings logged yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-4" />
                  Energy
                  <span className="text-muted-foreground text-sm font-normal">
                    (1–5)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {energyPoints.length > 0 ? (
                  <MetricChart
                    data={energyPoints}
                    color={profileColor}
                    unit="/ 5"
                  />
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No energy ratings logged yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={<Smile className="size-6" />}
            title="No mood or energy data yet"
            description="Rate your mood and energy (1–5) when logging a dose to see trends here."
          />
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

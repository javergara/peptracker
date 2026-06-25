import { Suspense } from "react";
import { GitCompareArrows, LineChart as LineChartIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CorrelationChart } from "@/components/metrics/correlation-chart";
import { CorrelationExplorer } from "@/components/metrics/correlation-explorer";
import {
  MetricsTrends,
  type TrendSeries,
} from "@/components/metrics/metrics-trends";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // Selectable series (metric types + lab markers) for the correlation explorer.
  const corrSeries: {
    key: string;
    label: string;
    unit?: string | null;
    points: { t: number; value: number }[];
  }[] = [];
  const mByType = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = mByType.get(m.type) ?? [];
    arr.push(m);
    mByType.set(m.type, arr);
  }
  for (const [type, rows] of mByType) {
    corrSeries.push({
      key: `m:${type}`,
      label: TYPE_LABELS[type] ?? type,
      unit: rows[0]?.unit ?? null,
      points: rows
        .map((r) => ({ t: r.recordedAt.getTime(), value: r.value }))
        .sort((a, b) => a.t - b.t),
    });
  }
  const lByMarker = new Map<string, typeof labs>();
  for (const l of labs) {
    const arr = lByMarker.get(l.marker) ?? [];
    arr.push(l);
    lByMarker.set(l.marker, arr);
  }
  for (const [marker, rows] of lByMarker) {
    corrSeries.push({
      key: `l:${marker}`,
      label: marker,
      unit: rows[0]?.unit ?? null,
      points: rows
        .map((r) => ({ t: r.takenAt.getTime(), value: r.value }))
        .sort((a, b) => a.t - b.t),
    });
  }

  // Group measurements by type (already ordered by recordedAt asc).
  const byType = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m);
    byType.set(m.type, arr);
  }

  // Build one combined, toggleable trend dataset: measurement types + mood +
  // energy + lab markers. Each series keeps real values (its own hidden axis).
  const TREND_PALETTE = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "#818cf8",
    "#a855f7",
    "#22d3ee",
    "#f472b6",
  ];
  const trendSeries: TrendSeries[] = [];
  let colorIdx = 0;
  const nextColor = () => TREND_PALETTE[colorIdx++ % TREND_PALETTE.length];

  for (const [type, rows] of byType) {
    trendSeries.push({
      key: `m:${type}`,
      label: TYPE_LABELS[type] ?? type,
      unit: rows[0]?.unit ?? null,
      color: nextColor(),
      points: rows
        .map((r) => ({ t: r.recordedAt.getTime(), value: r.value }))
        .sort((a, b) => a.t - b.t),
    });
  }

  const moodPts = doseLogs
    .filter((d) => d.mood != null)
    .map((d) => ({ t: d.takenAt.getTime(), value: d.mood as number }))
    .sort((a, b) => a.t - b.t);
  const energyPts = doseLogs
    .filter((d) => d.energy != null)
    .map((d) => ({ t: d.takenAt.getTime(), value: d.energy as number }))
    .sort((a, b) => a.t - b.t);
  if (moodPts.length > 0)
    trendSeries.push({
      key: "mood",
      label: "Mood",
      unit: "/5",
      color: "#a855f7",
      points: moodPts,
    });
  if (energyPts.length > 0)
    trendSeries.push({
      key: "energy",
      label: "Energy",
      unit: "/5",
      color: "#22d3ee",
      points: energyPts,
    });

  for (const [marker, rows] of lByMarker) {
    trendSeries.push({
      key: `l:${marker}`,
      label: marker,
      unit: rows[0]?.unit ?? null,
      color: nextColor(),
      points: rows
        .map((r) => ({ t: r.takenAt.getTime(), value: r.value }))
        .sort((a, b) => a.t - b.t),
    });
  }

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
          <ActionForm
            action={addMeasurement}
            success="Measurement added"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1.5">
              <label htmlFor="m-type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="m-type"
                name="type"
                defaultValue="weight"
                className={inputCls}
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-label" className="text-sm font-medium">
                Label
              </label>
              <input
                id="m-label"
                name="label"
                placeholder="optional"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-value" className="text-sm font-medium">
                Value <span className="text-destructive">*</span>
              </label>
              <input
                id="m-value"
                name="value"
                type="number"
                step="any"
                inputMode="decimal"
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-unit" className="text-sm font-medium">
                Unit
              </label>
              <input
                id="m-unit"
                name="unit"
                placeholder="kg, %, hrs…"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="m-date"
                name="recordedAt"
                type="date"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <SubmitButton>Add measurement</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="size-4" />
            Trends
          </CardTitle>
          <CardDescription>
            Toggle any series. Lines share a timeline but keep their own scale,
            so you can see how mood moves as your weight (or labs) change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <MetricsTrends series={trendSeries} />
          </Suspense>
        </CardContent>
      </Card>

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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Correlate any two markers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CorrelationExplorer series={corrSeries} color={profileColor} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

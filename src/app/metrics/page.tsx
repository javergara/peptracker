import { Suspense } from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { CorrelationExplorer } from "@/components/metrics/correlation-explorer";
import {
  MetricsTrends,
  type TrendSeries,
} from "@/components/metrics/metrics-trends";
import {
  MetricsRangeControl,
  DEFAULT_RANGE,
} from "@/components/metrics/range-control";
import type { RangeValue } from "@/components/metrics/range-control";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { MeasurementRow } from "@/components/metrics/measurement-row";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMeasurement } from "@/lib/actions/measurements";
import {
  listMeasurements,
  getCurrentUser,
  getDoseLogsInRange,
  listCheckIns,
  listLabs,
} from "@/lib/queries";
import { toDateInputValue } from "@/lib/dates";
import { asCheckInRatings, CHECKIN_MARKERS } from "@/types/checkin";
import { GitCompareArrows } from "lucide-react";

export const metadata = { title: "Metrics" };

const TYPE_LABELS: Record<string, string> = {
  weight: "Weight",
  bodyFat: "Body fat",
  sleep: "Sleep",
  recovery: "Recovery",
  custom: "Custom",
};

/** Convert a range string to milliseconds. */
function rangeToDays(range: RangeValue): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
  }
}

/** Clip points to the window [windowStart, now]. */
function clipPoints(
  points: { t: number; value: number }[],
  windowStart: number,
): { t: number; value: number }[] {
  return points.filter((p) => p.t >= windowStart);
}

/** Metric tile for the 4-col summary row. */
function MetricTile({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  improving,
}: {
  label: string;
  value: string;
  unit: string;
  delta: string | null;
  deltaLabel: string;
  improving: boolean | null;
}) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-[5px] flex items-baseline gap-[5px]">
        <span className="num text-foreground text-2xl font-semibold">
          {value}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </div>
      <div
        className="mt-0.5 text-xs"
        style={{
          color:
            improving === true
              ? "var(--ok)"
              : improving === false
                ? "var(--bad)"
                : "var(--muted-foreground)",
        }}
      >
        {delta !== null
          ? `${improving === false ? "▲" : improving === true ? "▼" : ""} ${delta} / ${deltaLabel}`
          : "— no data"}
      </div>
    </div>
  );
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const rawRange = params.range as RangeValue | undefined;
  const validRanges: RangeValue[] = ["7d", "30d", "90d", "1y"];
  const range: RangeValue =
    rawRange && validRanges.includes(rawRange) ? rawRange : DEFAULT_RANGE;

  const now = new Date();
  const today = toDateInputValue(now);
  const rangeMs = rangeToDays(range) * 86_400_000;
  const windowStart = now.getTime() - rangeMs;

  // Fetch all-time for chart data (correlation explorer needs full history),
  // then clip to the range window for display.
  const fetchStart = new Date(now);
  fetchStart.setDate(fetchStart.getDate() - 365);

  const [measurements, user, doseLogs, labs, checkIns] = await Promise.all([
    listMeasurements(),
    getCurrentUser(),
    getDoseLogsInRange(fetchStart, now),
    listLabs(),
    listCheckIns(),
  ]);

  const profileColor = user.color ?? "var(--chart-1)";

  // --- Metric tiles: latest value + delta within the range window -----------
  const TILE_TYPES = [
    { key: "weight", label: "Weight", defaultUnit: "kg" },
    { key: "bodyFat", label: "Body fat", defaultUnit: "%" },
    { key: "sleep", label: "Sleep", defaultUnit: "h avg" },
    { key: "recovery", label: "Recovery", defaultUnit: "/100" },
  ] as const;

  const rangeLabel = range; // e.g. "30d"

  const tiles = TILE_TYPES.map(({ key, label, defaultUnit }) => {
    const rows = measurements.filter((m) => m.type === key);
    if (rows.length === 0) {
      return {
        label,
        value: "—",
        unit: defaultUnit,
        delta: null,
        deltaLabel: rangeLabel,
        improving: null,
      };
    }
    const unit = rows[0].unit ?? defaultUnit;
    const latest = rows[rows.length - 1].value;

    // Find the first point at or after windowStart for delta calculation.
    const windowRows = rows.filter(
      (m) => m.recordedAt.getTime() >= windowStart,
    );
    let delta: string | null = null;
    let improving: boolean | null = null;

    if (windowRows.length >= 2) {
      const first = windowRows[0].value;
      const diff = latest - first;
      // "Improving" direction: weight & bodyFat lower is better; sleep & recovery higher is better.
      const lowerIsBetter = key === "weight" || key === "bodyFat";
      improving = lowerIsBetter ? diff < -0.05 : diff > 0.05;
      if (Math.abs(diff) <= 0.05) improving = null; // stable
      const sign = diff >= 0 ? "▲" : "▼";
      delta = `${sign} ${Math.abs(diff).toFixed(1)} ${unit}`;
    } else if (windowRows.length === 1) {
      delta = "stable";
      improving = null;
    }

    return {
      label,
      value: latest.toString(),
      unit,
      delta,
      deltaLabel: rangeLabel,
      improving,
    };
  });

  // --- Recent measurements (newest first, for the editable history list) ---
  const recentMeasurements = [...measurements]
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 10);

  // --- Selectable series for CorrelationExplorer (all-time, not windowed) ---
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

  // --- Trend series (windowed to selected range) ----------------------------
  const byType = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m);
    byType.set(m.type, arr);
  }

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
    const allPoints = rows
      .map((r) => ({ t: r.recordedAt.getTime(), value: r.value }))
      .sort((a, b) => a.t - b.t);
    const windowed = clipPoints(allPoints, windowStart);
    if (windowed.length > 0) {
      trendSeries.push({
        key: `m:${type}`,
        label: TYPE_LABELS[type] ?? type,
        unit: rows[0]?.unit ?? null,
        color: nextColor(),
        points: windowed,
      });
    } else {
      // Still include the series color slot so colors stay stable across ranges.
      nextColor();
    }
  }

  const moodPts = clipPoints(
    doseLogs
      .filter((d) => d.mood != null)
      .map((d) => ({ t: d.takenAt.getTime(), value: d.mood as number }))
      .sort((a, b) => a.t - b.t),
    windowStart,
  );
  const energyPts = clipPoints(
    doseLogs
      .filter((d) => d.energy != null)
      .map((d) => ({ t: d.takenAt.getTime(), value: d.energy as number }))
      .sort((a, b) => a.t - b.t),
    windowStart,
  );
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

  // Daily check-in markers (mood, energy, sleep, libido, …) — each becomes
  // its own selectable trend series, same 1-5 scale as mood/energy above.
  const checkInsByMarker = new Map<string, { t: number; value: number }[]>();
  for (const c of checkIns) {
    const ratings = asCheckInRatings(c.ratings);
    for (const [key, value] of Object.entries(ratings)) {
      const arr = checkInsByMarker.get(key) ?? [];
      arr.push({ t: c.date.getTime(), value });
      checkInsByMarker.set(key, arr);
    }
  }
  for (const marker of CHECKIN_MARKERS) {
    const rows = checkInsByMarker.get(marker.key);
    if (!rows || rows.length === 0) continue;
    const allPoints = [...rows].sort((a, b) => a.t - b.t);
    const windowed = clipPoints(allPoints, windowStart);
    if (windowed.length > 0) {
      trendSeries.push({
        key: `c:${marker.key}`,
        label: marker.label,
        unit: "/5",
        color: nextColor(),
        points: windowed,
      });
    } else {
      nextColor();
    }
  }

  for (const [marker, rows] of lByMarker) {
    const allPoints = rows
      .map((r) => ({ t: r.takenAt.getTime(), value: r.value }))
      .sort((a, b) => a.t - b.t);
    const windowed = clipPoints(allPoints, windowStart);
    if (windowed.length > 0) {
      trendSeries.push({
        key: `l:${marker}`,
        label: marker,
        unit: rows[0]?.unit ?? null,
        color: nextColor(),
        points: windowed,
      });
    } else {
      nextColor();
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header with range control + Add button */}
      <PageHeader
        title="Metrics"
        description="Body, mood &amp; bloodwork on one timeline."
        accentColor={profileColor}
        actions={
          <div className="flex items-center gap-3">
            <Suspense>
              <MetricsRangeControl />
            </Suspense>
            {/* Add measurement — opens the form card below via scroll or anchor */}
            <a
              href="#add-measurement"
              className="btn-gradient focus-visible:ring-ring inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[13.5px] font-semibold text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              <Plus className="size-[15px]" strokeWidth={1.8} />
              Add
            </a>
          </div>
        }
      />

      {/* Four metric tiles */}
      <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-4">
        {tiles.map((t) => (
          <MetricTile
            key={t.label}
            label={t.label}
            value={t.value}
            unit={t.unit}
            delta={t.delta}
            deltaLabel={t.deltaLabel}
            improving={t.improving}
          />
        ))}
      </div>

      {/* Trends card */}
      <Card className="card-surface">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold">
                Trends — last {range}
              </CardTitle>
              <CardDescription className="mt-0.5 text-[12.5px]">
                Toggle any series. Lines share a timeline but keep their own
                scale.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense>
            <MetricsTrends series={trendSeries} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Correlation explorer */}
      <section aria-label="Correlation explorer">
        <h2 className="font-display mb-4 text-base font-semibold tracking-tight">
          Correlation
        </h2>
        {corrSeries.length >= 2 ? (
          <Card className="card-surface">
            <CardContent className="pt-6">
              <Suspense>
                <CorrelationExplorer series={corrSeries} color={profileColor} />
              </Suspense>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-surface">
            <CardContent className="py-8">
              <EmptyState
                icon={<GitCompareArrows className="size-6" />}
                title="Need at least two data series"
                description="Log metrics (e.g. bodyweight) and lab results to correlate them here."
              />
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent measurements — editable history */}
      <Card className="card-surface">
        <CardHeader>
          <CardTitle>Recent measurements</CardTitle>
          <CardDescription className="text-[12.5px]">
            Latest logged entries. Edit or remove any row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMeasurements.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No measurements logged yet.
            </p>
          ) : (
            <div className="divide-y">
              {recentMeasurements.map((m) => (
                <MeasurementRow
                  key={m.id}
                  id={m.id}
                  typeLabel={TYPE_LABELS[m.type] ?? m.type}
                  label={m.label}
                  value={m.value}
                  unit={m.unit}
                  recordedAt={m.recordedAt.toISOString()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add measurement form */}
      <Card className="card-surface" id="add-measurement">
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
              <Select name="type" defaultValue="weight">
                <SelectTrigger id="m-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-label" className="text-sm font-medium">
                Label
              </label>
              <Input
                id="m-label"
                name="label"
                placeholder="optional"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-value" className="text-sm font-medium">
                Value <span className="text-destructive">*</span>
              </label>
              <Input
                id="m-value"
                name="value"
                type="number"
                step="any"
                inputMode="decimal"
                min="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-unit" className="text-sm font-medium">
                Unit
              </label>
              <Input
                id="m-unit"
                name="unit"
                placeholder="kg, %, hrs…"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="m-date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="m-date"
                name="recordedAt"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <SubmitButton>Add measurement</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";

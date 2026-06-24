"use client";

import * as React from "react";
import { AlertTriangle, GitCompareArrows } from "lucide-react";

import { correlationStrength, linearRegression } from "@/lib/stats";
import { ScatterCorrelation } from "@/components/metrics/scatter-correlation";
import { EmptyState } from "@/components/common/empty-state";

export interface CorrSeries {
  key: string;
  label: string;
  unit?: string | null;
  /** sorted ascending by t (ms) */
  points: { t: number; value: number }[];
}

const PAIR_WINDOW_MS = 14 * 86_400_000;

/** Pair each Y point with the nearest X point within the time window. */
function pair(
  xs: { t: number; value: number }[],
  ys: { t: number; value: number }[],
) {
  const out: { x: number; y: number }[] = [];
  for (const y of ys) {
    let best: { diff: number; value: number } | null = null;
    for (const x of xs) {
      const diff = Math.abs(x.t - y.t);
      if (diff <= PAIR_WINDOW_MS && (!best || diff < best.diff)) {
        best = { diff, value: x.value };
      }
    }
    if (best) out.push({ x: best.value, y: y.value });
  }
  return out;
}

const selectCls =
  "border-input bg-background focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function CorrelationExplorer({
  series,
  color = "var(--chart-1)",
}: {
  series: CorrSeries[];
  color?: string;
}) {
  const usable = series.filter((s) => s.points.length > 0);

  const defaultX =
    usable.find((s) => /weight/i.test(s.label))?.key ?? usable[0]?.key ?? "";
  const defaultY =
    usable.find((s) => /igf/i.test(s.label))?.key ??
    usable.find((s) => s.key !== defaultX)?.key ??
    "";

  const [xKey, setXKey] = React.useState(defaultX);
  const [yKey, setYKey] = React.useState(defaultY);

  const xs = usable.find((s) => s.key === xKey);
  const ys = usable.find((s) => s.key === yKey);

  const points =
    xs && ys && xs.key !== ys.key ? pair(xs.points, ys.points) : [];
  const reg = linearRegression(points);
  const hasFit = points.length >= 2;
  const thin = points.length > 0 && points.length < 5;

  if (usable.length < 2) {
    return (
      <EmptyState
        icon={<GitCompareArrows className="size-6" />}
        title="Need at least two data series"
        description="Log metrics (e.g. bodyweight) and lab results to correlate them here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs font-medium">
            X axis
          </span>
          <select
            value={xKey}
            onChange={(e) => setXKey(e.target.value)}
            className={selectCls}
          >
            {usable.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
                {s.unit ? ` (${s.unit})` : ""}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted-foreground pb-2.5">vs</span>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs font-medium">
            Y axis
          </span>
          <select
            value={yKey}
            onChange={(e) => setYKey(e.target.value)}
            className={selectCls}
          >
            {usable.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
                {s.unit ? ` (${s.unit})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {xKey === yKey ? (
        <p className="text-muted-foreground text-sm">
          Pick two different series to correlate.
        </p>
      ) : hasFit ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              Pearson r = <strong style={{ color }}>{reg.r.toFixed(2)}</strong>
            </span>
            <span className="text-muted-foreground">
              R² = {reg.r2.toFixed(2)}
            </span>
            <span className="text-muted-foreground">n = {reg.n}</span>
            <span className="text-muted-foreground">
              {correlationStrength(reg.r)}{" "}
              {reg.slope >= 0 ? "positive" : "negative"}
            </span>
          </div>
          {thin ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0" />
              Only {reg.n} paired points — too few to be meaningful (aim for
              5+).
            </div>
          ) : null}
          <ScatterCorrelation
            points={points}
            slope={reg.slope}
            intercept={reg.intercept}
            xLabel={`${xs?.label}${xs?.unit ? ` (${xs.unit})` : ""}`}
            yLabel={`${ys?.label}${ys?.unit ? ` (${ys.unit})` : ""}`}
            color={color}
          />
        </>
      ) : (
        <EmptyState
          icon={<GitCompareArrows className="size-6" />}
          title="Not enough paired points"
          description="Each Y reading is paired with the nearest X reading within 14 days. Log both near the same dates."
        />
      )}
    </div>
  );
}

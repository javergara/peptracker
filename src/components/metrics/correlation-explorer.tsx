"use client";

import * as React from "react";
import { AlertTriangle, GitCompareArrows } from "lucide-react";

import { correlationStrength, linearRegression } from "@/lib/stats";
import { ScatterCorrelation } from "@/components/metrics/scatter-correlation";
import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";

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

/** Plain-language description of the correlation direction + strength. */
function corrSentence(
  r: number,
  strength: string,
  xLabel: string,
  yLabel: string,
): string {
  const dir = r >= 0 ? "positive" : "inverse";
  const dirWord = r >= 0 ? "rises" : "falls";
  const capStrength = strength.charAt(0).toUpperCase() + strength.slice(1);
  return `${capStrength} ${dir} relationship — as ${xLabel} increases, ${yLabel} ${dirWord}.`;
}

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
  const strength = correlationStrength(reg.r);

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
      {/* Series pickers */}
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
          {/* Scatter chart + Ink result panel side by side */}
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[1.1fr_1fr]">
            {/* Scatter chart */}
            <div className="card-surface rounded-[18px] p-5">
              <h3 className="font-display mb-1 text-base font-semibold">
                Correlation explorer
              </h3>
              <p className="text-muted-foreground mb-4 text-[12.5px]">
                {xs?.label} × {ys?.label} · paired within 14 days
              </p>
              <ScatterCorrelation
                points={points}
                slope={reg.slope}
                intercept={reg.intercept}
                xLabel={`${xs?.label}${xs?.unit ? ` (${xs.unit})` : ""}`}
                yLabel={`${ys?.label}${ys?.unit ? ` (${ys.unit})` : ""}`}
                color={color}
              />
            </div>

            {/* Ink result panel */}
            <InkPanel className="flex flex-col justify-center p-6">
              <Eyebrow className="text-[#C4B5FD]">Pearson Correlation</Eyebrow>

              {/* Giant r value */}
              <div className="my-3 flex items-baseline gap-2">
                <span
                  className="num text-[58px] leading-none font-semibold"
                  style={{ color: "#EFEBFA" }}
                >
                  {reg.r >= 0 ? "" : "−"}
                  {Math.abs(reg.r).toFixed(2)}
                </span>
              </div>

              {/* Plain-language sentence */}
              <p
                className="mb-5 text-[13px] leading-[1.55]"
                style={{ color: "#A8A2CC" }}
              >
                {corrSentence(
                  reg.r,
                  strength,
                  xs?.label ?? "X",
                  ys?.label ?? "Y",
                )}
              </p>

              {/* R² / n / strength row */}
              <div className="flex gap-6">
                <div>
                  <div
                    className="eyebrow"
                    style={{ color: "#8E88B4", fontSize: "10px" }}
                  >
                    R²
                  </div>
                  <div
                    className="num mt-0.5 text-xl font-semibold"
                    style={{ color: "#EFEBFA" }}
                  >
                    {reg.r2.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    className="eyebrow"
                    style={{ color: "#8E88B4", fontSize: "10px" }}
                  >
                    Samples
                  </div>
                  <div
                    className="num mt-0.5 text-xl font-semibold"
                    style={{ color: "#EFEBFA" }}
                  >
                    n = {reg.n}
                  </div>
                </div>
                <div>
                  <div
                    className="eyebrow"
                    style={{ color: "#8E88B4", fontSize: "10px" }}
                  >
                    Strength
                  </div>
                  <div
                    className="num mt-0.5 text-xl font-semibold capitalize"
                    style={{ color: "#C4B5FD" }}
                  >
                    {strength}
                  </div>
                </div>
              </div>
            </InkPanel>
          </div>

          {thin ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0" />
              Only {reg.n} paired points — too few to be meaningful (aim for
              5+).
            </div>
          ) : null}
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

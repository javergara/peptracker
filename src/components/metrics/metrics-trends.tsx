"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";

export interface TrendSeries {
  key: string;
  label: string;
  unit?: string | null;
  color: string;
  /** sorted ascending by t (ms) */
  points: { t: number; value: number }[];
}

/**
 * One chart for every logged series, toggled on/off from the legend. Because
 * the series share a timeline but not a scale (weight ~80kg vs mood 1–5), each
 * line gets its own hidden Y axis so the *shapes* line up over time; the tooltip
 * shows the real values. Series logged at the same time land on the same row.
 *
 * The primary series (weight if present, else first active) gets a soft
 * area-gradient fill under its line per the Clinical Instrument design spec.
 */
export function MetricsTrends({ series }: { series: TrendSeries[] }) {
  const usable = React.useMemo(
    () => series.filter((s) => s.points.length > 0),
    [series],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = React.useState<Set<string>>(() => {
    // Restore from the URL (?series=key1,key2) if present and valid.
    const fromUrl = searchParams.get("series");
    if (fromUrl) {
      const valid = new Set(usable.map((s) => s.key));
      const restored = new Set(fromUrl.split(",").filter((k) => valid.has(k)));
      if (restored.size > 0) return restored;
    }
    const init = new Set<string>();
    const weight = usable.find((s) => /weight/i.test(s.label));
    const mood = usable.find((s) => /mood/i.test(s.label));
    if (weight) init.add(weight.key);
    if (mood) init.add(mood.key);
    if (init.size === 0) usable.slice(0, 2).forEach((s) => init.add(s.key));
    return init;
  });

  // Merge all series into one row per day (same-time logs share a row).
  const rows = React.useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    for (const s of usable) {
      for (const p of s.points) {
        const d = new Date(p.t);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const row = byDay.get(dayKey) ?? {
          t: p.t,
          date: d.toLocaleString(undefined, { month: "short", day: "numeric" }),
        };
        row[s.key] = p.value;
        if (p.t < (row.t as number)) row.t = p.t;
        byDay.set(dayKey, row);
      }
    }
    return Array.from(byDay.values()).sort(
      (a, b) => (a.t as number) - (b.t as number),
    );
  }, [usable]);

  const unitByLabel = React.useMemo(
    () => Object.fromEntries(usable.map((s) => [s.label, s.unit])),
    [usable],
  );

  function toggle(key: string) {
    const next = new Set(active);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setActive(next);

    // Keep the selection in the URL so it's shareable / survives reload.
    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("series", Array.from(next).join(","));
    else params.delete("series");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (usable.length === 0) {
    return (
      <EmptyState
        icon={<LineChartIcon className="size-6" />}
        title="No data to chart yet"
        description="Log measurements, weight (when logging a dose), mood/energy, or lab results to see them here."
      />
    );
  }

  const activeSeries = usable.filter((s) => active.has(s.key));

  // Primary series = weight if active, else first active series.
  const primaryKey =
    activeSeries.find((s) => /weight/i.test(s.label))?.key ??
    activeSeries[0]?.key;

  return (
    <div className="space-y-4">
      {/* Legend chips — toggle series visibility */}
      <div className="flex flex-wrap gap-2">
        {usable.map((s) => {
          const on = active.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={on}
              className={cn(
                "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity focus-visible:ring-2 focus-visible:outline-none",
                on ? "bg-card" : "border-transparent opacity-45",
              )}
              style={on ? { borderColor: s.color } : undefined}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
              {s.unit ? ` (${s.unit})` : ""}
            </button>
          );
        })}
      </div>

      {activeSeries.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Select a series above to plot it.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          >
            {/* Gradient definition for the primary series area fill */}
            <defs>
              {activeSeries.map((s) => (
                <linearGradient
                  key={`grad-${s.key}`}
                  id={`grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {/* Lighter gridlines per design spec */}
            <CartesianGrid strokeDasharray="0" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 11,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              tickLine={false}
              axisLine={false}
            />
            {activeSeries.map((s) => (
              <YAxis
                key={s.key}
                yAxisId={s.key}
                hide
                domain={["auto", "auto"]}
              />
            ))}
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              formatter={(value, name) => [
                `${value}${unitByLabel[name as string] ? ` ${unitByLabel[name as string]}` : ""}`,
                name,
              ]}
            />

            {/* Primary series: Area with gradient fill + Line on top */}
            {activeSeries.map((s) =>
              s.key === primaryKey ? (
                <Area
                  key={s.key}
                  yAxisId={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill={`url(#grad-${s.key})`}
                  dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ) : (
                <Line
                  key={s.key}
                  yAxisId={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

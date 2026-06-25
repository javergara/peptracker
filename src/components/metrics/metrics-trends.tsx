"use client";

import * as React from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
 */
export function MetricsTrends({ series }: { series: TrendSeries[] }) {
  const usable = React.useMemo(
    () => series.filter((s) => s.points.length > 0),
    [series],
  );

  const [active, setActive] = React.useState<Set<string>>(() => {
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
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  return (
    <div className="space-y-4">
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
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 12,
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
            {activeSeries.map((s) => (
              <Line
                key={s.key}
                yAxisId={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: s.color }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

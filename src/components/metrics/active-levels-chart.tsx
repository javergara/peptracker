"use client";

import { Activity } from "lucide-react";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/empty-state";

/**
 * "Active Levels" — an estimated pharmacokinetic (PK) curve for one or more
 * peptides, overlaid on a shared timeline. The underlying math
 * (`src/lib/pk.ts`) is a simple one-compartment exponential-decay estimate
 * built from logged doses + each peptide's half-life — an educational
 * approximation of relative rise-and-fall, NOT a measured plasma
 * concentration.
 *
 * Because amounts/half-lives vary wildly across compounds, each peptide's
 * curve is normalized to ITS OWN peak (0-100) so multiple lines are visually
 * comparable on one axis — this shows *timing*, not comparative dose.
 */

export interface ActiveLevelPoint {
  t: number; // epoch ms
  level: number;
}

export interface ActiveLevelSeriesInput {
  peptideName: string;
  color?: string;
  points: ActiveLevelPoint[];
}

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ActiveLevelsChart({
  series,
  from,
  to,
}: {
  series: ActiveLevelSeriesInput[];
  from: number;
  to: number;
}) {
  const usable = series.filter((s) => s.points.length > 0);

  if (usable.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-6" />}
        title="No active-levels data yet"
        description="Log a dose for a peptide with a configured half-life to see its estimated curve here."
      />
    );
  }

  const spanHours = Math.max(1, (to - from) / 3_600_000);
  const tickFmt = spanHours <= 48 ? "HH:mm" : "MMM d";

  const keyed = usable.map((s, i) => {
    const peak = s.points.reduce((m, p) => Math.max(m, p.level), 0);
    return {
      key: `s${i}`,
      name: s.peptideName,
      color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      peak: peak > 0 ? peak : 1,
      points: s.points,
    };
  });

  // Merge every series' points into shared rows keyed by timestamp. Each
  // series' Line uses connectNulls so timestamps unique to another peptide
  // (e.g. its own dose instants) don't break its own curve.
  const rows = new Map<number, Record<string, number>>();
  for (const s of keyed) {
    for (const p of s.points) {
      const row = rows.get(p.t) ?? { t: p.t };
      row[s.key] = Math.round((p.level / s.peak) * 1000) / 10; // 0-100, 1dp
      rows.set(p.t, row);
    }
  }
  const data = Array.from(rows.values()).sort((a, b) => a.t - b.t);
  const pad = Math.max((to - from) * 0.02, 1);
  const domain: [number, number] = [from - pad, to + pad];

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[11px]">
        Est. level (relative)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={domain}
            scale="time"
            tickFormatter={(t) => format(new Date(t), tickFmt)}
            tick={{
              fontSize: 12,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{
              fontSize: 12,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(t) => format(new Date(Number(t)), "MMM d, HH:mm")}
            formatter={(value, name) => [`${value}% of peak`, name]}
          />
          {keyed.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend — swatch + peptide name */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {keyed.map((s) => (
          <span
            key={s.key}
            className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
          >
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        Estimated from logged doses and each peptide&apos;s half-life
        (one-compartment decay model) — an educational estimate, not a measured
        concentration. Each compound is scaled to its own peak; shows timing,
        not comparative dose.
      </p>
    </div>
  );
}

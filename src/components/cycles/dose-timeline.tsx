"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/empty-state";
import { activeLevelSeries, hoursUntilFraction, type PkDose } from "@/lib/pk";
import { cn } from "@/lib/utils";

/**
 * Dose-evolution chart with selectable peptides (chip toggles, URL-synced via
 * `?peptides=`, mirroring `metrics-trends.tsx`). Peptides with a known
 * half-life render an estimated active-level curve (`activeLevelSeries`);
 * peptides without one render raw dose dots instead. Each selected peptide
 * gets its own hidden Y axis so differently-scaled series (mcg vs mg) don't
 * clash on a shared timeline — same pattern as `MetricsTrends`.
 */

export interface DoseTimelineSeries {
  peptideId: string;
  peptideName: string;
  doses: { t: number; amount: number }[];
  halfLifeHours: number | null;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DoseTimeline({
  series,
  from,
  to,
  now,
}: {
  series: DoseTimelineSeries[];
  from: number;
  to: number;
  now: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const usable = React.useMemo(
    () => series.filter((s) => s.doses.length > 0),
    [series],
  );

  const [selected, setSelected] = React.useState<Set<string>>(() => {
    const fromUrl = searchParams.get("peptides");
    if (fromUrl) {
      const valid = new Set(usable.map((s) => s.peptideId));
      const restored = new Set(
        fromUrl.split(",").filter((id) => valid.has(id)),
      );
      if (restored.size > 0) return restored;
    }
    return new Set(usable.slice(0, 3).map((s) => s.peptideId));
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("peptides", Array.from(next).join(","));
    else params.delete("peptides");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (usable.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-6" />}
        title="No doses to chart yet"
        description="Log doses against a cycle to see estimated active levels here."
      />
    );
  }

  const colorFor = (peptideId: string) => {
    const idx = usable.findIndex((s) => s.peptideId === peptideId);
    return COLORS[Math.max(0, idx) % COLORS.length];
  };

  const active = usable.filter((s) => selected.has(s.peptideId));

  const curves = active.map((s) => {
    const color = colorFor(s.peptideId);
    const pkDoses: PkDose[] = s.doses.map((dose) => ({
      t: dose.t,
      amount: dose.amount,
    }));
    const hasHalfLife = (s.halfLifeHours ?? 0) > 0;
    const points = hasHalfLife
      ? activeLevelSeries(pkDoses, s.halfLifeHours as number, from, to)
      : [];
    const clearedHours = hasHalfLife
      ? hoursUntilFraction(pkDoses, s.halfLifeHours as number, now)
      : null;
    return { ...s, color, points, hasHalfLife, clearedHours };
  });

  return (
    <div className="space-y-4">
      {/* Chip toggles */}
      <div className="flex flex-wrap gap-2">
        {usable.map((s) => {
          const on = selected.has(s.peptideId);
          const color = colorFor(s.peptideId);
          return (
            <button
              key={s.peptideId}
              type="button"
              onClick={() => toggle(s.peptideId)}
              aria-pressed={on}
              className={cn(
                "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity focus-visible:ring-2 focus-visible:outline-none",
                on ? "bg-card" : "border-transparent opacity-45",
              )}
              style={on ? { borderColor: color } : undefined}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: color }}
              />
              {s.peptideName}
            </button>
          );
        })}
      </div>

      {curves.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Select a peptide above to plot it.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="0" stroke="var(--border)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={[from, to]}
                scale="time"
                tickFormatter={(t) => format(new Date(t), "MMM d")}
                tick={{
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
              />
              {curves.map((c) => (
                <YAxis
                  key={c.peptideId}
                  yAxisId={c.peptideId}
                  hide
                  domain={["auto", "auto"]}
                />
              ))}
              <ReferenceLine
                x={now}
                stroke="var(--primary)"
                strokeDasharray="4 4"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(t) =>
                  format(new Date(Number(t)), "MMM d, yyyy p")
                }
                formatter={(value, name) => [value, name]}
              />
              {curves.map((c) =>
                c.hasHalfLife ? (
                  <Line
                    key={c.peptideId}
                    data={c.points}
                    dataKey="level"
                    yAxisId={c.peptideId}
                    name={c.peptideName}
                    type="monotone"
                    stroke={c.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : (
                  <Scatter
                    key={c.peptideId}
                    data={c.doses}
                    dataKey="amount"
                    yAxisId={c.peptideId}
                    name={c.peptideName}
                    fill={c.color}
                    isAnimationActive={false}
                  />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Cleared-time annotations (per selected peptide with a half-life) */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {curves.map((c) => (
              <p key={c.peptideId} className="text-muted-foreground text-xs">
                <span className="font-medium" style={{ color: c.color }}>
                  {c.peptideName}
                </span>
                {c.hasHalfLife && c.clearedHours != null ? (
                  <>
                    {" "}
                    — mostly cleared in ~
                    <span className="num">{Math.round(c.clearedHours)}h</span>
                  </>
                ) : !c.hasHalfLife ? (
                  " — half-life unknown, showing logged doses"
                ) : null}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

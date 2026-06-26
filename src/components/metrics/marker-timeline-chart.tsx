"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A biomarker's trend with intervention bands (cycles + supplements) shaded
 * behind it and an optional reference-range band — the "exams correlated to
 * peptide use" view. Times are passed as epoch-millisecond numbers (serializable
 * from server components); the X axis is numeric/time so bands align with points.
 */

export interface TimelinePoint {
  t: number; // epoch ms
  value: number;
}

export interface TimelineBand {
  id: string;
  label: string;
  kind: "cycle" | "supplement";
  start: number; // epoch ms
  end: number | null; // null = ongoing
}

const BAND_FILL: Record<TimelineBand["kind"], string> = {
  cycle: "var(--chart-1)",
  supplement: "var(--chart-2)",
};

export function MarkerTimelineChart({
  points,
  bands = [],
  refLow,
  refHigh,
  unit,
  color = "var(--chart-1)",
}: {
  points: TimelinePoint[];
  bands?: TimelineBand[];
  refLow?: number | null;
  refHigh?: number | null;
  unit?: string | null;
  color?: string;
}) {
  if (points.length === 0) return null;

  const ts = points.map((p) => p.t);
  let min = Math.min(...ts);
  let max = Math.max(...ts);
  for (const b of bands) {
    min = Math.min(min, b.start);
    max = Math.max(max, b.end ?? max);
  }
  // Pad the domain a touch so edge points aren't clipped.
  const pad = Math.max((max - min) * 0.03, 86_400_000);
  const domain: [number, number] = [min - pad, max + pad];

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

          {/* Reference-range band (in-range zone). */}
          {refLow != null && refHigh != null ? (
            <ReferenceArea
              y1={refLow}
              y2={refHigh}
              fill="var(--chart-2)"
              fillOpacity={0.08}
              stroke="none"
            />
          ) : null}
          {refLow != null ? (
            <ReferenceLine
              y={refLow}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ) : null}
          {refHigh != null ? (
            <ReferenceLine
              y={refHigh}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ) : null}

          {/* Intervention bands (cycles + supplements). */}
          {bands.map((b) => (
            <ReferenceArea
              key={b.id}
              x1={b.start}
              x2={b.end ?? domain[1]}
              fill={BAND_FILL[b.kind]}
              fillOpacity={0.1}
              stroke="none"
            />
          ))}

          <XAxis
            dataKey="t"
            type="number"
            domain={domain}
            scale="time"
            tickFormatter={(t) => format(new Date(t), "MMM d")}
            tick={{
              fontSize: 12,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{
              fontSize: 12,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(t) => format(new Date(Number(t)), "MMM d, yyyy")}
            formatter={(value) => [
              `${value}${unit ? ` ${unit}` : ""}`,
              "Value",
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Band legend (what the shaded regions mean). */}
      {bands.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {bands.map((b) => (
            <span
              key={b.id}
              className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
            >
              <span
                className="inline-block size-2.5 rounded-[3px]"
                style={{ backgroundColor: BAND_FILL[b.kind], opacity: 0.5 }}
              />
              {b.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

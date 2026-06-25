"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ScatterPoint {
  x: number;
  y: number;
  date?: string;
}

/**
 * Scatter of paired (x, y) observations with a least-squares trend line drawn
 * from the regression slope/intercept across the observed x-range.
 */
export function ScatterCorrelation({
  points,
  slope,
  intercept,
  xLabel,
  yLabel,
  color = "var(--chart-1)",
}: {
  points: ScatterPoint[];
  slope: number;
  intercept: number;
  xLabel: string;
  yLabel: string;
  color?: string;
}) {
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const segment: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: xMin, y: slope * xMin + intercept },
    { x: xMax, y: slope * xMax + intercept },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: -4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          domain={["auto", "auto"]}
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
          tickLine={false}
          axisLine={false}
          label={{
            value: xLabel,
            position: "insideBottom",
            offset: -8,
            fontSize: 12,
            fill: "var(--muted-foreground)",
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          domain={["auto", "auto"]}
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
        />
        <ReferenceLine
          ifOverflow="extendDomain"
          segment={segment}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <Scatter data={points} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

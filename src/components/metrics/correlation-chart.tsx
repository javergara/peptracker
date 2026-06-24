"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CorrelationPoint {
  date: string;
  weight: number | null;
  igf: number | null;
}

/**
 * Dual-axis time series overlaying two markers (e.g. bodyweight vs IGF-1) so you
 * can eyeball how they move together. Lines connect across gaps since the two
 * series are usually sampled on different dates.
 */
export function CorrelationChart({
  data,
  leftLabel,
  rightLabel,
  leftColor = "var(--chart-1)",
  rightColor = "var(--chart-3)",
}: {
  data: CorrelationPoint[];
  leftLabel: string;
  rightLabel: string;
  leftColor?: string;
  rightColor?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: leftColor }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: rightColor }}
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
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="weight"
          name={leftLabel}
          stroke={leftColor}
          strokeWidth={2}
          dot={{ r: 3, fill: leftColor }}
          connectNulls
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="igf"
          name={rightLabel}
          stroke={rightColor}
          strokeWidth={2}
          dot={{ r: 3, fill: rightColor }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

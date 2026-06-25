"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { moodFace } from "@/lib/mood";

export interface MetricPoint {
  date: string;
  value: number;
}

/** Renders an emoji face instead of a plain dot (used for mood charts). */
function MoodDot(props: {
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
}) {
  const { cx, cy, value, index } = props;
  const face = moodFace(value);
  if (cx == null || cy == null || !face) return <g key={index} />;
  return (
    <text
      key={index}
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={16}
    >
      {face.emoji}
    </text>
  );
}

export function MetricChart({
  data,
  color = "var(--chart-1)",
  unit,
  mood = false,
}: {
  data: MetricPoint[];
  color?: string;
  unit?: string | null;
  /** When true, points render as mood-face emojis (1–5 scale). */
  mood?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
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
        <YAxis
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={mood ? [1, 5] : undefined}
          ticks={mood ? [1, 2, 3, 4, 5] : undefined}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(value) =>
            mood
              ? [
                  `${value} ${moodFace(Number(value))?.emoji ?? ""}`.trim(),
                  "Mood",
                ]
              : [`${value}${unit ? ` ${unit}` : ""}`, "Value"]
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={mood ? <MoodDot /> : { r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

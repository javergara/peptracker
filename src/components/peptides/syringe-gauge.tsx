"use client";

import { useId } from "react";

/**
 * A drawn insulin syringe (needle + graduated barrel + plunger) whose barrel
 * fills to the computed draw amount. Mirrors the `VialGauge` pattern
 * (src/components/common/vial-gauge.tsx): per-instance clip/gradient ids via
 * `useId`, tokens only, purely presentational.
 *
 * The barrel scale runs 0 (needle end) → `capacity` (plunger end), matching
 * how a real insulin syringe is printed. `units` over capacity is clamped for
 * the fill but flagged with an amber "exceeds syringe capacity" note.
 */

const BARREL_X = 34;
const BARREL_WIDTH = 150;
const BARREL_Y = 22;
const BARREL_HEIGHT = 24;

export function SyringeGauge({
  units,
  capacity = 100,
  width = 260,
  height = 84,
}: {
  /** Insulin syringe units to draw. */
  units: number;
  /** Syringe capacity in units (U-100 syringe = 100). */
  capacity?: number;
  width?: number;
  height?: number;
}) {
  const clipId = useId();
  const gradId = useId();

  const safeUnits = Math.max(0, units);
  const overCapacity = capacity > 0 && safeUnits > capacity;
  const pct = capacity > 0 ? Math.min(1, safeUnits / capacity) : 0;
  const fillWidth = BARREL_WIDTH * pct;

  // Major ticks at each 20% of capacity, minor ticks at each 10%.
  const majorStep = capacity / 5;
  const minorStep = capacity / 10;
  const majorTicks = Array.from({ length: 6 }, (_, i) => i * majorStep);
  const minorTicks = Array.from({ length: 11 }, (_, i) => i * minorStep).filter(
    (v) => v % majorStep !== 0,
  );

  const xForUnits = (u: number) => BARREL_X + (u / capacity) * BARREL_WIDTH;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 84"
      role="img"
      aria-label={`Draw ${Math.round(safeUnits * 10) / 10} of ${capacity} unit syringe${overCapacity ? ", exceeds syringe capacity" : ""}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop
            stopColor={overCapacity ? "var(--warn)" : "var(--gauge-start)"}
          />
          <stop
            offset="1"
            stopColor={
              overCapacity ? "var(--warn-foreground)" : "var(--gauge-end)"
            }
          />
        </linearGradient>
        <clipPath id={clipId}>
          <rect
            x={BARREL_X}
            y={BARREL_Y}
            width={BARREL_WIDTH}
            height={BARREL_HEIGHT}
            rx="5"
          />
        </clipPath>
      </defs>

      {/* Needle */}
      <line
        x1="4"
        y1={BARREL_Y + BARREL_HEIGHT / 2}
        x2={BARREL_X}
        y2={BARREL_Y + BARREL_HEIGHT / 2}
        stroke="var(--muted-foreground)"
        strokeWidth="2"
      />
      <polygon
        points={`4,${BARREL_Y + BARREL_HEIGHT / 2} 12,${BARREL_Y + BARREL_HEIGHT / 2 - 3} 12,${BARREL_Y + BARREL_HEIGHT / 2 + 3}`}
        fill="var(--muted-foreground)"
      />

      {/* Barrel body */}
      <rect
        x={BARREL_X}
        y={BARREL_Y}
        width={BARREL_WIDTH}
        height={BARREL_HEIGHT}
        rx="5"
        fill="var(--muted)"
        stroke="var(--border)"
      />

      {/* Fill (clipped to barrel, grows from the needle end) */}
      {pct > 0 ? (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={BARREL_X}
            y={BARREL_Y}
            width={fillWidth}
            height={BARREL_HEIGHT}
            fill={`url(#${gradId})`}
          />
        </g>
      ) : null}

      {/* Plunger stopper at the fill boundary */}
      <rect
        x={Math.min(BARREL_X + BARREL_WIDTH - 4, BARREL_X + fillWidth - 2)}
        y={BARREL_Y - 2}
        width="4"
        height={BARREL_HEIGHT + 4}
        rx="1"
        fill="var(--muted-foreground)"
        opacity="0.55"
      />

      {/* Plunger rod + thumb rest */}
      <line
        x1={BARREL_X + BARREL_WIDTH}
        y1={BARREL_Y + BARREL_HEIGHT / 2}
        x2={BARREL_X + BARREL_WIDTH + 26}
        y2={BARREL_Y + BARREL_HEIGHT / 2}
        stroke="var(--muted-foreground)"
        strokeWidth="2"
      />
      <rect
        x={BARREL_X + BARREL_WIDTH + 24}
        y={BARREL_Y - 4}
        width="6"
        height={BARREL_HEIGHT + 8}
        rx="1.5"
        fill="var(--muted-foreground)"
      />

      {/* Graduation ticks */}
      {minorTicks.map((u) => (
        <line
          key={`minor-${u}`}
          x1={xForUnits(u)}
          x2={xForUnits(u)}
          y1={BARREL_Y + BARREL_HEIGHT}
          y2={BARREL_Y + BARREL_HEIGHT + 4}
          stroke="var(--muted-foreground)"
          strokeWidth="1"
        />
      ))}
      {majorTicks.map((u) => (
        <g key={`major-${u}`}>
          <line
            x1={xForUnits(u)}
            x2={xForUnits(u)}
            y1={BARREL_Y + BARREL_HEIGHT}
            y2={BARREL_Y + BARREL_HEIGHT + 7}
            stroke="var(--muted-foreground)"
            strokeWidth="1.25"
          />
          <text
            x={xForUnits(u)}
            y={BARREL_Y + BARREL_HEIGHT + 18}
            textAnchor="middle"
            className="num"
            fontSize="8"
            fill="var(--muted-foreground)"
          >
            {Math.round(u)}
          </text>
        </g>
      ))}

      {/* Draw amount label above the fill */}
      <text
        x={BARREL_X + Math.max(fillWidth, 2) / 2}
        y={BARREL_Y - 8}
        textAnchor="middle"
        className="num"
        fontSize="11"
        fontWeight="600"
        fill={overCapacity ? "var(--warn-foreground)" : "var(--foreground)"}
      >
        {Math.round(safeUnits * 10) / 10} U
      </text>
    </svg>
  );
}

"use client";

import { useId } from "react";

/**
 * Instrument-style adherence gauge: an SVG donut with a violet gradient
 * progress arc and a big mono % in the center. Driven by a 0–100 `percent`.
 *
 * Geometry: r=50 → circumference ≈ 314; the arc dash length scales with percent.
 * Uses a per-instance gradient id (useId) so multiple rings on a page don't
 * collide, matching the PeptraMark pattern.
 */
export function AdherenceRing({
  percent,
  size = 116,
  label,
  subtitle = "on schedule",
  showSubtitle = true,
}: {
  percent: number;
  size?: number;
  /** Centered text; defaults to `${percent}%`. */
  label?: string;
  subtitle?: string;
  showSubtitle?: boolean;
}) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * 50; // ≈ 314.159
  const dash = (circumference * pct) / 100;
  const center = label ?? `${Math.round(pct)}%`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className="shrink-0"
      role="img"
      aria-label={`Adherence ${Math.round(pct)} percent`}
    >
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#EDE9FE"
        strokeWidth="13"
      />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y={showSubtitle ? 58 : 68}
        textAnchor="middle"
        className="num"
        fontSize="29"
        fontWeight="600"
        fill="var(--foreground)"
      >
        {center}
      </text>
      {showSubtitle ? (
        <text x="60" y="76" textAnchor="middle" fontSize="10.5" fill="#8B86AD">
          {subtitle}
        </text>
      ) : null}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="120" y2="120">
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

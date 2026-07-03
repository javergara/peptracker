"use client";

import { useId } from "react";

import type { VialGaugeStatus } from "@/lib/vials";

/**
 * A drawn vial (cap + rounded body with a hairline outline) whose fill level is
 * clipped to the body. The fill treatment encodes the vial's status:
 *   active  → violet gradient · soon → amber gradient · sealed → desaturated
 *   (half-opacity) · expired → red · empty → dashed baseline, no fill.
 *
 * `fillPercent` (0–100) sets the liquid height. Per-instance clip/gradient ids
 * (useId) keep multiple vials on a page from colliding.
 */

const BODY_TOP = 16;
const BODY_HEIGHT = 128;

type FillStyle = {
  cap: string;
  neck: string;
  bodyFill: string;
  bodyStroke: string;
  liquid: string;
  fillOpacity?: number;
};

function styleFor(status: VialGaugeStatus, gradId: string): FillStyle {
  switch (status) {
    case "soon":
      return {
        cap: "#F6D69A",
        neck: "#FBE7C2",
        bodyFill: "#FDF6E9",
        bodyStroke: "#F3E2BE",
        liquid: `url(#${gradId})`,
      };
    case "sealed":
      return {
        cap: "#C4D0EC",
        neck: "#D7DFF1",
        bodyFill: "#F4F6FC",
        bodyStroke: "#DEE4F2",
        liquid: `url(#${gradId})`,
        fillOpacity: 0.5,
      };
    case "expired":
      return {
        cap: "#E3B7B9",
        neck: "#EFD2D3",
        bodyFill: "#FBF1F1",
        bodyStroke: "#EFD2D3",
        liquid: "#D98789",
      };
    case "empty":
      return {
        cap: "#D9D2EC",
        neck: "#E6E1F3",
        bodyFill: "#F8F6FC",
        bodyStroke: "#E6E1F3",
        liquid: "transparent",
      };
    default: // active
      return {
        cap: "#C4B5FD",
        neck: "#DDD6F7",
        bodyFill: "#F6F3FD",
        bodyStroke: "#E1DAF2",
        liquid: `url(#${gradId})`,
      };
  }
}

export function VialGauge({
  fillPercent,
  status,
  width = 52,
  height = 140,
}: {
  fillPercent: number;
  status: VialGaugeStatus;
  width?: number;
  height?: number;
}) {
  const clipId = useId();
  const gradId = useId();
  const s = styleFor(status, gradId);

  const pct = Math.max(0, Math.min(100, fillPercent));
  const liquidHeight = (BODY_HEIGHT * pct) / 100;
  const liquidY = BODY_TOP + (BODY_HEIGHT - liquidHeight);

  // Amber gradient for "soon", violet otherwise.
  const gradStops =
    status === "soon"
      ? ["#F7B73E", "#E08C0B"]
      : status === "sealed"
        ? ["#94A3D8", "#6470B0"]
        : ["var(--gauge-start)", "var(--gauge-end)"];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 150"
      role="img"
      aria-label={`Vial ${status}, ${Math.round(pct)}% remaining`}
    >
      {/* cap + neck */}
      <rect x="22" y="2" width="16" height="8" rx="2" fill={s.cap} />
      <rect x="24" y="9" width="12" height="8" fill={s.neck} />
      <defs>
        <clipPath id={clipId}>
          <rect x="14" y={BODY_TOP} width="32" height={BODY_HEIGHT} rx="10" />
        </clipPath>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={gradStops[0]} />
          <stop offset="1" stopColor={gradStops[1]} />
        </linearGradient>
      </defs>
      {/* body */}
      <rect
        x="14"
        y={BODY_TOP}
        width="32"
        height={BODY_HEIGHT}
        rx="10"
        fill={s.bodyFill}
        stroke={s.bodyStroke}
      />
      {/* liquid (clipped to body) */}
      {status === "empty" ? (
        <line
          x1="20"
          y1="80"
          x2="40"
          y2="80"
          stroke="#D9D2EC"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      ) : pct > 0 ? (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="14"
            y={liquidY}
            width="32"
            height={liquidHeight}
            fill={s.liquid}
            fillOpacity={s.fillOpacity ?? 1}
          />
        </g>
      ) : null}
    </svg>
  );
}

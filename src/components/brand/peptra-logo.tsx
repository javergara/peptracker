"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The Peptra mark: a rounded "P" backbone + bowl with a single round counter
 * (the "residue node") punched through in negative space, filled with the brand
 * gradient. Uses a unique gradient/mask id per instance so multiple marks on a
 * page don't cross-reference each other.
 */
export function PeptraMark({ className }: { className?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = `pg-${raw}`;
  const m = `pm-${raw}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Peptra"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={g}
          x1="16"
          y1="10"
          x2="48"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="0.5" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <mask id={m}>
          <rect width="64" height="64" fill="white" />
          <circle cx="34" cy="26" r="7" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${m})`} fill={`url(#${g})`}>
        <rect x="18" y="12" width="12" height="42" rx="6" />
        <circle cx="32" cy="26" r="14" />
      </g>
    </svg>
  );
}

/** Mark + "Peptra" wordmark (Space Grotesk). Inherits text color from context. */
export function PeptraLogo({
  className,
  markClassName,
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PeptraMark className={cn("size-7 shrink-0", markClassName)} />
      <span
        className={cn(
          "font-display text-xl font-semibold tracking-tight",
          wordClassName,
        )}
      >
        Peptra
      </span>
    </span>
  );
}

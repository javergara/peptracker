import { cn } from "@/lib/utils";

/**
 * Dark "Ink" data-readout panel — the single most important metric on a screen
 * sits here on a violet-glow gradient, like a premium device readout. Pulls the
 * dark rail identity into the body.
 *
 * - `hero` (default): radial violet glow + Ink gradient, 20px radius. For the
 *   dashboard "doses due" hero and the Metrics correlation result.
 * - `strip`: flatter Ink gradient, for the Inventory summary strip.
 *
 * Text colors are baked to the Ink-panel palette (`#EFEBFA` / `#A8A2CC` muted)
 * so children read correctly regardless of the app theme. The eyebrow color
 * (`#C4B5FD`) is the violet-tinted variant for dark surfaces.
 */
export function InkPanel({
  variant = "hero",
  molecule = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "hero" | "strip";
  /** Render the faint molecule motif bleeding off the top-right corner. */
  molecule?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden text-[#EFEBFA]",
        variant === "hero"
          ? "rounded-[20px] [background:var(--gradient-ink-panel)]"
          : "rounded-2xl [background:var(--gradient-ink-strip)]",
        className,
      )}
      {...props}
    >
      {molecule ? (
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-8 opacity-[0.18]"
        >
          <circle cx="70" cy="90" r="26" stroke="#fff" strokeWidth="2" />
          <circle cx="118" cy="118" r="18" stroke="#fff" strokeWidth="2" />
          <path d="M88 100l18 10" stroke="#fff" strokeWidth="2" />
        </svg>
      ) : null}
      {children}
    </div>
  );
}

import { LAB_STATUS_STYLE } from "@/lib/constants";
import { labStatus } from "@/lib/labs";
import { cn } from "@/lib/utils";

/**
 * Lab reference-range "track": a rail with the normal band shown as a lilac
 * inset and a status-colored marker dot positioned by the value. Geometry +
 * status come from the pure `labStatus` helper, so the dot and the Labs count
 * tiles always agree. Renders nothing when there's no usable range.
 */
export function RangeTrack({
  value,
  refLow,
  refHigh,
  className,
}: {
  value: number;
  refLow: number | null | undefined;
  refHigh: number | null | undefined;
  className?: string;
}) {
  const rail = labStatus(value, refLow, refHigh);
  if (!rail.hasRange) return null;

  const style = LAB_STATUS_STYLE[rail.status];

  return (
    <div
      className={cn(
        "relative h-2.5 rounded-full bg-[#F1EEF9] dark:bg-white/10",
        className,
      )}
    >
      {/* normal band */}
      <div
        className="bg-accent absolute inset-y-0 rounded-full"
        style={{ left: `${rail.bandLeftPct}%`, right: `${rail.bandRightPct}%` }}
      />
      {/* marker dot */}
      <div
        className={cn(
          "absolute top-1/2 size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-sm",
          style.dot,
        )}
        style={{ left: `${rail.markerPct}%` }}
      />
    </div>
  );
}

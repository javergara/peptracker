"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MetricChart,
  type MetricPoint,
} from "@/components/metrics/metric-chart";
import { EmptyState } from "@/components/common/empty-state";
import type { TrendSeries } from "@/components/metrics/metrics-trends";

/**
 * Focused "one metric over time" chart. Unlike {@link MetricsTrends} (which
 * overlays many series on hidden axes so their *shapes* line up), this plots a
 * single selected series on a real, labeled Y axis — so you can read how e.g.
 * bodyweight is actually evolving in its own units. Defaults to weight.
 *
 * The selection is mirrored to the URL (?focus=key) so it's shareable and
 * survives reload. Data is pre-windowed to the page's range by the server.
 */
export function MetricFocus({ series }: { series: TrendSeries[] }) {
  const usable = React.useMemo(
    () => series.filter((s) => s.points.length > 0),
    [series],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultKey = React.useMemo(() => {
    const weight = usable.find((s) => /weight/i.test(s.label));
    return weight?.key ?? usable[0]?.key ?? "";
  }, [usable]);

  const [picked, setPicked] = React.useState<string | null>(() => {
    const fromUrl = searchParams.get("focus");
    return fromUrl && usable.some((s) => s.key === fromUrl) ? fromUrl : null;
  });

  // Effective selection is derived (never synced via an effect): the user's
  // pick if it's still a valid series, otherwise the default (weight/first).
  const selected =
    picked && usable.some((s) => s.key === picked) ? picked : defaultKey;

  function onChange(key: string | null) {
    if (!key) return;
    setPicked(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("focus", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const current = usable.find((s) => s.key === selected) ?? usable[0];

  const data: MetricPoint[] = React.useMemo(() => {
    if (!current) return [];
    return current.points.map((p) => ({
      date: new Date(p.t).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: p.value,
    }));
  }, [current]);

  const items = React.useMemo(
    () =>
      Object.fromEntries(
        usable.map((s) => [s.key, `${s.label}${s.unit ? ` (${s.unit})` : ""}`]),
      ),
    [usable],
  );

  if (usable.length === 0 || !current) {
    return (
      <EmptyState
        icon={<LineChartIcon className="size-6" />}
        title="No data to chart yet"
        description="Log a measurement like weight (here or when logging a dose) to see it plotted over time."
      />
    );
  }

  // Net change across the visible window — a plain-language read of the trend.
  const first = current.points[0]?.value;
  const last = current.points[current.points.length - 1]?.value;
  const diff = first != null && last != null ? last - first : null;
  const isFivePoint = current.unit === "/5";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="metric-focus" className="sr-only">
            Metric to plot
          </label>
          <Select value={selected} onValueChange={onChange} items={items}>
            <SelectTrigger id="metric-focus" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {usable.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                  {s.unit ? ` (${s.unit})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {diff != null && Math.abs(diff) > 0.001 ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            {diff < 0 ? (
              <TrendingDown className="size-4" />
            ) : (
              <TrendingUp className="size-4" />
            )}
            <span className="num text-foreground font-medium">
              {diff > 0 ? "+" : ""}
              {diff.toFixed(1)}
              {current.unit ? ` ${current.unit}` : ""}
            </span>
            over this window
          </span>
        ) : null}
      </div>

      {data.length < 2 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Only one {current.label.toLowerCase()} point in this range — log more
          to see the trend line.
        </p>
      ) : (
        <MetricChart
          data={data}
          color={current.color}
          unit={current.unit}
          mood={isFivePoint}
        />
      )}
    </div>
  );
}

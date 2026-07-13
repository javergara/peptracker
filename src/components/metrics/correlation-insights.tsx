import { TrendingUp, TrendingDown } from "lucide-react";

import {
  describeInsight,
  findStrongCorrelations,
  type Insight,
} from "@/lib/correlations";
import { Eyebrow } from "@/components/common/eyebrow";
import { Disclaimer } from "@/components/disclaimer";
import { cn } from "@/lib/utils";

/** Same point/series shape the /metrics page already builds for the explorer. */
export interface CorrelationInsightsSeries {
  key: string;
  label: string;
  unit?: string | null;
  /** sorted ascending by t (ms) */
  points: { t: number; value: number }[];
}

function InsightCard({ insight }: { insight: Insight }) {
  const positive = insight.direction === "positive";
  const Icon = positive ? TrendingUp : TrendingDown;
  const signedR = `${insight.r < 0 ? "−" : ""}${Math.abs(insight.r).toFixed(2)}`;

  return (
    <div className="card-surface flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full",
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span
          className={cn(
            "eyebrow shrink-0 rounded-full px-2 py-1 capitalize",
            insight.strength === "strong"
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {insight.strength}
        </span>
      </div>

      <p className="text-foreground text-[13.5px] leading-[1.5]">
        {describeInsight(insight)}
      </p>

      <div className="text-muted-foreground num flex gap-4 text-xs">
        <span>r = {signedR}</span>
        <span>n = {insight.n}</span>
        <span>
          p{" "}
          {insight.pValue < 0.001
            ? "< 0.001"
            : `= ${insight.pValue.toFixed(3)}`}
        </span>
      </div>
    </div>
  );
}

/**
 * Proactive correlation insight cards — scans every pair of logged series and
 * surfaces the strongest, best-sampled relationships automatically (instead of
 * making the user hunt with the CorrelationExplorer below). Renders nothing if
 * no pair qualifies.
 */
export function CorrelationInsights({
  series,
}: {
  series: CorrelationInsightsSeries[];
}) {
  const insights = findStrongCorrelations(
    series.map((s) => ({
      key: s.key,
      label: s.label,
      unit: s.unit,
      points: s.points.map((p) => ({ date: p.t, value: p.value })),
    })),
  );

  if (insights.length === 0) return null;

  return (
    <section aria-label="Correlation insights" className="space-y-3">
      <Eyebrow>Insights</Eyebrow>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard
            key={`${insight.aKey}::${insight.bKey}`}
            insight={insight}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Correlation, not causation — associations in your own logged data.
      </p>
      <Disclaimer />
    </section>
  );
}

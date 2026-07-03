import { AdherenceRing } from "@/components/common/adherence-ring";
import { Eyebrow } from "@/components/common/eyebrow";
import { readinessLabel, type ReadinessResult } from "@/lib/readiness";

const COMPONENT_LABELS: Record<string, string> = {
  sleep: "Sleep",
  hrv: "HRV",
  restingHr: "Resting HR",
  mood: "Mood",
};

/**
 * Compact dashboard tile for the readiness score: a gauge (reuses
 * `AdherenceRing`) + qualitative label + the contributing signals. Renders
 * nothing when there's no readiness data yet (server component — the caller
 * computes `readiness` via `computeReadiness`/`deriveReadinessInputs` and
 * passes it down as a prop).
 */
export function ReadinessTile({
  readiness,
}: {
  readiness: ReadinessResult | null;
}) {
  if (readiness == null) return null;
  const label = readinessLabel(readiness.score);

  return (
    <div
      className="card-surface flex flex-col rounded-[20px] p-6 [box-shadow:var(--shadow-card)]"
      aria-label="Readiness score"
    >
      <Eyebrow>READINESS</Eyebrow>
      <div className="mt-3.5 flex items-center gap-[18px]">
        <AdherenceRing
          percent={readiness.score}
          size={116}
          subtitle={label}
          showSubtitle
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          {readiness.components.map((c) => (
            <div
              key={c.key}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <span className="text-muted-foreground">
                {COMPONENT_LABELS[c.key] ?? c.key}
              </span>
              <span className="num text-foreground font-medium">
                {Math.round(c.contribution)}
              </span>
            </div>
          ))}
          {readiness.available.length < 4 ? (
            <p className="text-muted-foreground mt-1 text-[11.5px]">
              Based on {readiness.available.length} of 4 signals
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

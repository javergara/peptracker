import { Activity, TrendingDown, TrendingUp } from "lucide-react";

import { Eyebrow } from "@/components/common/eyebrow";
import { UseGoalButton } from "@/components/food/use-goal-button";
import { suggestGoalCalories, type TdeeResult } from "@/lib/tdee";

const RATES = [
  { label: "Lose 0.5 kg/wk", rate: -0.5 },
  { label: "Lose 0.25 kg/wk", rate: -0.25 },
  { label: "Maintain", rate: 0 },
  { label: "Gain 0.25 kg/wk", rate: 0.25 },
];

/**
 * Adaptive-TDEE readout — estimated maintenance calories from the weight trend +
 * logged intake, with suggested targets you can adopt as your calorie goal.
 * Educational estimate (renders inside the food page, under the Disclaimer).
 */
export function TdeeCard({ result }: { result: TdeeResult }) {
  const enough = result.confidence !== "none" && result.tdeeKcal != null;

  return (
    <div className="card-surface rounded-2xl p-5">
      <Eyebrow className="mb-2 flex items-center gap-1.5">
        <Activity className="size-3.5" />
        Estimated maintenance
      </Eyebrow>

      {!enough ? (
        <p className="text-muted-foreground text-sm">
          Log your weight and food for about{" "}
          <span className="num">{Math.max(0, 10 - result.intakeDays)}</span>{" "}
          more day(s) and this will estimate your real maintenance calories from
          how your weight trends against what you eat.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="num text-foreground text-3xl font-semibold">
              {result.tdeeKcal}
            </span>
            <span className="text-muted-foreground text-sm">kcal / day</span>
            <span className="text-muted-foreground ml-1 inline-flex items-center gap-1 text-xs capitalize">
              · {result.confidence} confidence
            </span>
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
            <span className="num inline-flex items-center gap-1">
              {result.weightSlopeKgPerWeek <= 0 ? (
                <TrendingDown className="size-3.5" />
              ) : (
                <TrendingUp className="size-3.5" />
              )}
              {result.weightSlopeKgPerWeek > 0 ? "+" : ""}
              {result.weightSlopeKgPerWeek} kg/wk
            </span>
            <span className="num">avg intake {result.avgIntakeKcal} kcal</span>
            <span className="num">
              {result.intakeDays}d intake · {result.weightReadings} weigh-ins
            </span>
          </div>

          <div className="border-border mt-4 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs">
              Set a calorie goal for a target rate:
            </p>
            <div className="flex flex-wrap gap-2">
              {RATES.map((r) => {
                const kcal = suggestGoalCalories(result.tdeeKcal, r.rate);
                if (kcal == null) return null;
                return (
                  <UseGoalButton
                    key={r.label}
                    kcal={kcal}
                    label={`${r.label} · ${kcal}`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
      <p className="text-muted-foreground mt-3 text-[11px]">
        Educational estimate from your own data — not medical or nutritional
        advice.
      </p>
    </div>
  );
}

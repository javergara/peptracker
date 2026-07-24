import { AdherenceRing } from "@/components/common/adherence-ring";
import { Eyebrow } from "@/components/common/eyebrow";
import {
  goalProgress,
  isOverGoal,
  type Nutrition,
  type NutritionGoals,
} from "@/lib/food";
import { MACROS, MICROS } from "@/types/food";

/** A single macro progress bar (grams consumed vs goal). */
function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number | null;
  color: string;
}) {
  const pct = goalProgress(value, goal);
  const over = isOverGoal(value, goal);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="num text-foreground">
          {Math.round(value)}
          {goal ? (
            <span className="text-muted-foreground"> / {goal} g</span>
          ) : (
            <span className="text-muted-foreground"> g</span>
          )}
        </span>
      </div>
      <div className="bg-accent h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{
            width: `${goal ? pct : value > 0 ? 100 : 0}%`,
            background: over ? "var(--warn)" : color,
          }}
          role="progressbar"
          aria-valuenow={Math.round(value)}
          aria-valuemin={0}
          aria-valuemax={goal ?? undefined}
          aria-label={label}
        />
      </div>
    </div>
  );
}

/**
 * Daily nutrition readout: a calorie progress ring (reuses AdherenceRing) plus
 * per-macro bars against the profile's goals. Pure presentational — totals are
 * computed by the caller via src/lib/food.ts.
 */
export function NutritionSummary({
  totals,
  goals,
}: {
  totals: Nutrition;
  goals: NutritionGoals;
}) {
  const caloriePct = goalProgress(totals.calories, goals.calorieGoal);
  const remaining =
    goals.calorieGoal != null ? goals.calorieGoal - totals.calories : null;
  const macroGoal: Record<string, number | null> = {
    protein: goals.proteinGoal,
    carbs: goals.carbGoal,
    fat: goals.fatGoal,
  };

  return (
    <div className="card-surface rounded-2xl p-5">
      <Eyebrow className="mb-3">Today&rsquo;s intake</Eyebrow>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex shrink-0 flex-col items-center">
          <AdherenceRing
            percent={caloriePct}
            size={132}
            label={`${totals.calories}`}
            subtitle="kcal"
          />
          {remaining != null ? (
            <p className="num text-muted-foreground mt-1 text-xs">
              {remaining >= 0
                ? `${remaining} kcal left`
                : `${Math.abs(remaining)} kcal over`}
              {" · "}goal {goals.calorieGoal}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">
              Set a goal in the Goals tab
            </p>
          )}
        </div>
        <div className="w-full flex-1 space-y-3">
          {MACROS.map((m) => (
            <MacroBar
              key={m.key}
              label={m.label}
              value={totals[m.key]}
              goal={macroGoal[m.key]}
              color={m.color}
            />
          ))}
        </div>
      </div>

      {/* Micros row — fiber/sugar/sat-fat/sodium (goal shown for fiber/sodium). */}
      <div className="border-border mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t pt-3">
        {MICROS.map((m) => {
          const value = totals[m.key];
          if (value == null) return null;
          const goal =
            m.key === "fiber"
              ? goals.fiberGoal
              : m.key === "sodium"
                ? goals.sodiumGoal
                : null;
          return (
            <div key={m.key} className="text-sm">
              <span className="text-muted-foreground">{m.label} </span>
              <span className="num text-foreground">
                {Math.round(value)}
                {goal ? (
                  <span className="text-muted-foreground">
                    /{goal} {m.unit}
                  </span>
                ) : (
                  <span className="text-muted-foreground"> {m.unit}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

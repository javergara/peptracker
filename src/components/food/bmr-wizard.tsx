"use client";

import { useState, useTransition } from "react";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

import { Eyebrow } from "@/components/common/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyComputedGoals, setHeightCm } from "@/lib/actions/food";
import {
  ACTIVITY_LEVELS,
  mifflinStJeorBmr,
  suggestMacros,
  tdeeFromBmr,
  type Sex,
} from "@/lib/bmr";

const ACTIVITY_ITEMS: Record<string, string> = Object.fromEntries(
  ACTIVITY_LEVELS.map((a) => [a.key, a.label]),
);

/**
 * Formula-based goal wizard (Mifflin-St Jeor). Uses the profile's weight/age/sex
 * plus an editable height + activity level to estimate TDEE and a macro split,
 * then adopts them as goals. Complements the data-driven TDEE card.
 */
export function BmrWizard({
  weightKg,
  age,
  sex,
  heightCm,
  weightUnitLabel,
}: {
  weightKg: number | null;
  age: number | null;
  /** Profile sex, if set to M/F; otherwise the user picks below (not persisted). */
  sex: Sex | null;
  heightCm: number | null;
  weightUnitLabel: string;
}) {
  const [height, setHeight] = useState(heightCm ? String(heightCm) : "");
  const [activity, setActivity] = useState("moderate");
  const [sexChoice, setSexChoice] = useState<Sex>(sex ?? "M");
  const [isPending, start] = useTransition();

  const effectiveSex: Sex = sex ?? sexChoice;
  const h = Number(height) || null;
  const bmr = mifflinStJeorBmr({
    weightKg: weightKg ?? undefined,
    heightCm: h ?? undefined,
    age: age ?? undefined,
    sex: effectiveSex,
  });
  const tdee = tdeeFromBmr(bmr, activity);
  const macros = tdee ? suggestMacros(tdee, weightKg ?? 0) : null;

  const missing: string[] = [];
  if (!weightKg) missing.push("a weight (log one in Metrics)");
  if (!age) missing.push("your birth year (Settings)");
  if (!h) missing.push("your height below");

  return (
    <div className="card-surface rounded-2xl p-5">
      <Eyebrow className="mb-3 flex items-center gap-1.5">
        <Calculator className="size-3.5" />
        Goal calculator (Mifflin-St Jeor)
      </Eyebrow>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="bmr-height" className="text-sm font-medium">
            Height (cm)
          </label>
          <div className="flex gap-2">
            <Input
              id="bmr-height"
              type="number"
              min={0}
              step={1}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 178"
              className="num"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending || !h}
              onClick={() =>
                start(async () => {
                  await setHeightCm(Number(height));
                  toast.success("Height saved");
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bmr-activity" className="text-sm font-medium">
            Activity
          </label>
          <Select
            value={activity}
            onValueChange={(v) => setActivity(String(v))}
            items={ACTIVITY_ITEMS}
          >
            <SelectTrigger id="bmr-activity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_LEVELS.map((a) => (
                <SelectItem key={a.key} value={a.key}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sex == null ? (
          <div className="space-y-1.5">
            <label htmlFor="bmr-sex" className="text-sm font-medium">
              Sex (for the estimate)
            </label>
            <Select
              value={sexChoice}
              onValueChange={(v) => setSexChoice(v as Sex)}
              items={{ M: "Male", F: "Female" }}
            >
              <SelectTrigger id="bmr-sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {tdee && macros ? (
        <div className="border-border mt-4 border-t pt-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="num text-foreground text-2xl font-semibold">
              {tdee}
            </span>
            <span className="text-muted-foreground text-sm">
              kcal / day (TDEE)
            </span>
            <span className="num text-muted-foreground text-xs">
              BMR {bmr} · P {macros.protein} · C {macros.carbs} · F {macros.fat}
            </span>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              start(async () => {
                await applyComputedGoals({ calories: tdee, ...macros });
                toast.success("Goals set from calculator");
              })
            }
          >
            Use as goals
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Add {missing.join(", ")} to estimate your calories.
          {weightKg ? (
            <span className="num">
              {" "}
              Current weight: {weightKg.toFixed(1)} {weightUnitLabel}.
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

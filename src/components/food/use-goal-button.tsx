"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyCalorieGoal } from "@/lib/actions/food";

/** Sets the calorie goal to a suggested value (from the TDEE card). */
export function UseGoalButton({
  kcal,
  label,
}: {
  kcal: number;
  label: string;
}) {
  const [isPending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          try {
            await applyCalorieGoal(kcal);
            toast.success(`Calorie goal set to ${kcal}`);
          } catch {
            toast.error("Could not set goal.");
          }
        })
      }
    >
      {label}
    </Button>
  );
}

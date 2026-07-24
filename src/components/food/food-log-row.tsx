"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteFoodLog,
  restoreFoodLog,
  updateFoodLog,
} from "@/lib/actions/food";
import { toDateInputValue } from "@/lib/dates";
import { MEAL_TYPES } from "@/types/food";

const MEAL_ITEMS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.key, m.label]),
);

export interface FoodLogRowData {
  id: string;
  date: Date;
  mealType: string;
  name: string;
  quantity: number;
  servingUnit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  sodium: number | null;
  notes: string | null;
}

export function FoodLogRow({ log }: { log: FoodLogRowData }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const boundUpdate = updateFoodLog.bind(null, log.id);
  const dateValue = toDateInputValue(log.date);

  function handleDelete() {
    startDelete(async () => {
      try {
        const snapshot = await deleteFoodLog(log.id);
        toast.success("Food removed", {
          action: {
            label: "Undo",
            onClick: () =>
              restoreFoodLog(snapshot)
                .then(() => toast.success("Food restored"))
                .catch(() => toast.error("Couldn't undo.")),
          },
        });
      } catch {
        toast.error("Could not remove food.");
      }
    });
  }

  if (editing) {
    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Edit food</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <ActionForm
          action={async (fd) => {
            await boundUpdate(fd);
            setEditing(false);
          }}
          success="Food updated"
          resetOnSuccess={false}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Keep the entry on its original day; edit treats the shown totals as
              one serving (servings defaults to 1) so the math round-trips. */}
          <input type="hidden" name="date" value={dateValue} />
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor={`f-name-${log.id}`} className="text-sm font-medium">
              Food
            </label>
            <Input
              id={`f-name-${log.id}`}
              name="name"
              required
              defaultValue={log.name}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-meal-${log.id}`} className="text-sm font-medium">
              Meal
            </label>
            <Select
              name="mealType"
              defaultValue={log.mealType}
              items={MEAL_ITEMS}
            >
              <SelectTrigger id={`f-meal-${log.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-qty-${log.id}`} className="text-sm font-medium">
              Servings
            </label>
            <Input
              id={`f-qty-${log.id}`}
              name="quantity"
              type="number"
              min={0}
              step="any"
              defaultValue={1}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-cal-${log.id}`} className="text-sm font-medium">
              Calories
            </label>
            <Input
              id={`f-cal-${log.id}`}
              name="calories"
              type="number"
              min={0}
              step="any"
              required
              defaultValue={log.calories}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-pro-${log.id}`} className="text-sm font-medium">
              Protein (g)
            </label>
            <Input
              id={`f-pro-${log.id}`}
              name="protein"
              type="number"
              min={0}
              step="any"
              defaultValue={log.protein}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-carb-${log.id}`} className="text-sm font-medium">
              Carbs (g)
            </label>
            <Input
              id={`f-carb-${log.id}`}
              name="carbs"
              type="number"
              min={0}
              step="any"
              defaultValue={log.carbs}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`f-fat-${log.id}`} className="text-sm font-medium">
              Fat (g)
            </label>
            <Input
              id={`f-fat-${log.id}`}
              name="fat"
              type="number"
              min={0}
              step="any"
              defaultValue={log.fat}
              className="num"
            />
          </div>
          {/* Preserve the optional nutrients (edit uses servings=1, so these
              totals are the per-serving values updateFoodLog re-scales). */}
          {log.fiber != null ? (
            <input type="hidden" name="fiber" value={log.fiber} />
          ) : null}
          {log.sugar != null ? (
            <input type="hidden" name="sugar" value={log.sugar} />
          ) : null}
          {log.saturatedFat != null ? (
            <input type="hidden" name="saturatedFat" value={log.saturatedFat} />
          ) : null}
          {log.sodium != null ? (
            <input type="hidden" name="sodium" value={log.sodium} />
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor={`f-notes-${log.id}`}
              className="text-sm font-medium"
            >
              Notes
            </label>
            <Input
              id={`f-notes-${log.id}`}
              name="notes"
              defaultValue={log.notes ?? ""}
              placeholder="optional"
              maxLength={280}
            />
          </div>
          <div className="flex items-end gap-2">
            <SubmitButton size="sm">
              <Check className="size-3.5" />
              Save
            </SubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </ActionForm>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{log.name}</span>
          {log.quantity !== 1 ? (
            <span className="num text-muted-foreground text-xs">
              ×{log.quantity}
              {log.servingUnit ? ` ${log.servingUnit}` : ""}
            </span>
          ) : log.servingUnit ? (
            <span className="text-muted-foreground text-xs">
              {log.servingUnit}
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
          <span className="num text-foreground font-medium">
            {log.calories} kcal
          </span>
          <span className="num">P {Math.round(log.protein)}g</span>
          <span className="num">C {Math.round(log.carbs)}g</span>
          <span className="num">F {Math.round(log.fat)}g</span>
        </div>
        {log.notes ? (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {log.notes}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${log.name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${log.name}`}
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

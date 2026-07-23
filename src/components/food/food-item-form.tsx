"use client";

import { Check, Plus } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFoodItem, updateFoodItem } from "@/lib/actions/food";

export interface FoodItemData {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
}

/**
 * Add or edit a reusable "My Foods" library entry. Nutrition here is stored
 * per-serving; logging scales it by servings. Reused for the add card and the
 * inline edit form on each library row.
 */
export function FoodItemForm({
  item,
  onDone,
}: {
  item?: FoodItemData;
  onDone?: () => void;
}) {
  const editing = !!item;
  const action = editing ? updateFoodItem.bind(null, item.id) : addFoodItem;

  return (
    <ActionForm
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      success={editing ? "Food updated" : "Food saved"}
      resetOnSuccess={!editing}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <label
          htmlFor={`fi-name-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id={`fi-name-${item?.id ?? "new"}`}
          name="name"
          required
          defaultValue={item?.name ?? ""}
          placeholder="e.g. Greek yogurt"
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-brand-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Brand{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`fi-brand-${item?.id ?? "new"}`}
          name="brand"
          defaultValue={item?.brand ?? ""}
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label
            htmlFor={`fi-size-${item?.id ?? "new"}`}
            className="text-sm font-medium"
          >
            Serving
          </label>
          <Input
            id={`fi-size-${item?.id ?? "new"}`}
            name="servingSize"
            type="number"
            min={0}
            step="any"
            defaultValue={item?.servingSize ?? ""}
            placeholder="100"
            className="num"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`fi-unit-${item?.id ?? "new"}`}
            className="text-sm font-medium"
          >
            Unit
          </label>
          <Input
            id={`fi-unit-${item?.id ?? "new"}`}
            name="servingUnit"
            defaultValue={item?.servingUnit ?? ""}
            placeholder="g"
            maxLength={40}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-cal-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Calories <span className="text-destructive">*</span>
        </label>
        <Input
          id={`fi-cal-${item?.id ?? "new"}`}
          name="calories"
          type="number"
          min={0}
          step="any"
          required
          defaultValue={item?.calories ?? ""}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-pro-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Protein (g)
        </label>
        <Input
          id={`fi-pro-${item?.id ?? "new"}`}
          name="protein"
          type="number"
          min={0}
          step="any"
          defaultValue={item?.protein ?? ""}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-carb-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Carbs (g)
        </label>
        <Input
          id={`fi-carb-${item?.id ?? "new"}`}
          name="carbs"
          type="number"
          min={0}
          step="any"
          defaultValue={item?.carbs ?? ""}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-fat-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Fat (g)
        </label>
        <Input
          id={`fi-fat-${item?.id ?? "new"}`}
          name="fat"
          type="number"
          min={0}
          step="any"
          defaultValue={item?.fat ?? ""}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`fi-fiber-${item?.id ?? "new"}`}
          className="text-sm font-medium"
        >
          Fiber (g){" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`fi-fiber-${item?.id ?? "new"}`}
          name="fiber"
          type="number"
          min={0}
          step="any"
          defaultValue={item?.fiber ?? ""}
          className="num"
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <SubmitButton size={editing ? "sm" : "default"}>
          {editing ? (
            <Check className="size-3.5" />
          ) : (
            <Plus className="size-4" />
          )}
          {editing ? "Save" : "Save to My Foods"}
        </SubmitButton>
        {editing && onDone ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </ActionForm>
  );
}

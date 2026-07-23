"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

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
  FoodItemForm,
  type FoodItemData,
} from "@/components/food/food-item-form";
import { deleteFoodItem, logFoodItem } from "@/lib/actions/food";
import { MEAL_TYPES } from "@/types/food";

const MEAL_ITEMS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.key, m.label]),
);

/** One library row: nutrition summary + quick-add-to-log + edit/delete. */
function FoodItemRow({ item, date }: { item: FoodItemData; date: string }) {
  const [editing, setEditing] = useState(false);
  const [meal, setMeal] = useState<string>("snack");
  const [qty, setQty] = useState("1");
  const [isBusy, start] = useTransition();

  function quickAdd() {
    start(async () => {
      const fd = new FormData();
      fd.set("mealType", meal);
      fd.set("date", date);
      fd.set("quantity", qty || "1");
      try {
        await logFoodItem(item.id, fd);
        toast.success(`Added ${item.name} to log`);
      } catch {
        toast.error("Could not add to log.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${item.name}" from My Foods?`)) return;
    start(async () => {
      try {
        await deleteFoodItem(item.id);
        toast.success("Food deleted");
      } catch {
        toast.error("Could not delete food.");
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
        <FoodItemForm item={item} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.brand ? (
            <span className="text-muted-foreground text-xs">{item.brand}</span>
          ) : null}
          {item.servingSize || item.servingUnit ? (
            <span className="num text-muted-foreground text-xs">
              per {item.servingSize ?? ""} {item.servingUnit ?? "serving"}
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-sm">
          <span className="num text-foreground font-medium">
            {item.calories} kcal
          </span>
          <span className="num">P {Math.round(item.protein)}g</span>
          <span className="num">C {Math.round(item.carbs)}g</span>
          <span className="num">F {Math.round(item.fat)}g</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Servings"
          type="number"
          min={0}
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="num h-8 w-16"
        />
        <Select
          value={meal}
          onValueChange={(v) => setMeal(String(v))}
          items={MEAL_ITEMS}
        >
          <SelectTrigger size="sm" className="w-28" aria-label="Meal">
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
        <Button size="sm" disabled={isBusy} onClick={quickAdd}>
          <Plus className="size-3.5" />
          Add
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${item.name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${item.name}`}
          disabled={isBusy}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function MyFoodsList({
  items,
  date,
}: {
  items: FoodItemData[];
  /** yyyy-MM-dd the quick-add logs into (the viewed day). */
  date: string;
}) {
  return (
    <div className="card-surface divide-border divide-y rounded-2xl">
      {items.map((item) => (
        <FoodItemRow key={item.id} item={item} date={date} />
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addFoodLog } from "@/lib/actions/food";
import { MEAL_TYPES, type MealTypeKey } from "@/types/food";

export interface FoodItemOption {
  id: string;
  name: string;
  brand: string | null;
  servingUnit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
}

const MEAL_ITEMS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.key, m.label]),
);

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));

/**
 * Add-food form for the daily log. Free entry by default; picking a saved food
 * from "My Foods" auto-fills the nutrition fields (still editable) and scales by
 * quantity. Inputs are controlled so the library pick can populate them and the
 * form clears after a successful log.
 */
export function AddFoodForm({
  date,
  items,
  defaultMeal = "breakfast",
}: {
  /** yyyy-MM-dd of the day being logged. */
  date: string;
  items: FoodItemOption[];
  defaultMeal?: MealTypeKey;
}) {
  const [foodItemId, setFoodItemId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<string>(defaultMeal);
  const [quantity, setQuantity] = useState("1");
  const [servingUnit, setServingUnit] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  const options = items.map((i) => ({
    value: i.id,
    label: i.brand ? `${i.name} — ${i.brand}` : i.name,
  }));

  function reset() {
    setFoodItemId(null);
    setName("");
    setQuantity("1");
    setServingUnit("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
  }

  function pickItem(id: string | null) {
    setFoodItemId(id);
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setName(item.name);
    setServingUnit(item.servingUnit ?? "");
    setCalories(numStr(item.calories));
    setProtein(numStr(item.protein));
    setCarbs(numStr(item.carbs));
    setFat(numStr(item.fat));
    setFiber(numStr(item.fiber));
    setQuantity("1");
  }

  return (
    <ActionForm
      action={async (fd) => {
        await addFoodLog(fd);
        reset();
      }}
      success="Food logged"
      resetOnSuccess={false}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Carried in FormData for the server action. */}
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="foodItemId" value={foodItemId ?? ""} />

      {items.length > 0 ? (
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <label className="text-sm font-medium">
            Quick pick from My Foods{" "}
            <span className="text-muted-foreground font-normal">
              — optional
            </span>
          </label>
          <SearchableSelect
            options={options}
            value={foodItemId}
            onValueChange={pickItem}
            placeholder="Search saved foods…"
            aria-label="Pick a saved food"
          />
        </div>
      ) : null}

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="food-name" className="text-sm font-medium">
          Food <span className="text-destructive">*</span>
        </label>
        <Input
          id="food-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Greek yogurt"
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-meal" className="text-sm font-medium">
          Meal
        </label>
        <Select
          name="mealType"
          value={meal}
          onValueChange={(v) => setMeal(String(v))}
          items={MEAL_ITEMS}
        >
          <SelectTrigger id="food-meal">
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
        <label htmlFor="food-qty" className="text-sm font-medium">
          Servings
        </label>
        <Input
          id="food-qty"
          name="quantity"
          type="number"
          min={0}
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-cal" className="text-sm font-medium">
          Calories <span className="text-destructive">*</span>{" "}
          <span className="text-muted-foreground font-normal">/ serving</span>
        </label>
        <Input
          id="food-cal"
          name="calories"
          type="number"
          min={0}
          step="any"
          required
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-protein" className="text-sm font-medium">
          Protein (g)
        </label>
        <Input
          id="food-protein"
          name="protein"
          type="number"
          min={0}
          step="any"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-carbs" className="text-sm font-medium">
          Carbs (g)
        </label>
        <Input
          id="food-carbs"
          name="carbs"
          type="number"
          min={0}
          step="any"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-fat" className="text-sm font-medium">
          Fat (g)
        </label>
        <Input
          id="food-fat"
          name="fat"
          type="number"
          min={0}
          step="any"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-fiber" className="text-sm font-medium">
          Fiber (g){" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id="food-fiber"
          name="fiber"
          type="number"
          min={0}
          step="any"
          value={fiber}
          onChange={(e) => setFiber(e.target.value)}
          className="num"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="food-unit" className="text-sm font-medium">
          Serving unit{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id="food-unit"
          name="servingUnit"
          value={servingUnit}
          onChange={(e) => setServingUnit(e.target.value)}
          placeholder="e.g. 1 cup, 100 g"
          maxLength={40}
        />
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <SubmitButton>
          <Plus className="size-4" />
          Log food
        </SubmitButton>
        <span className="text-muted-foreground ml-3 inline-flex items-center gap-1 text-xs">
          <UtensilsCrossed className="size-3.5" />
          Macros are per serving and scaled by servings.
        </span>
      </div>
    </ActionForm>
  );
}

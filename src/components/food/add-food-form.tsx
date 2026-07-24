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
import {
  FOOD_CATALOG,
  FOOD_CATEGORY_LABELS,
  catalogServingNutrition,
  getCatalogFood,
  type CatalogFood,
} from "@/lib/food-catalog";
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
  sugar: number | null;
  saturatedFat: number | null;
  sodium: number | null;
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
  const [source, setSource] = useState<string | null>(null);
  const [foodItemId, setFoodItemId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogFood | null>(null);
  const [servingIdx, setServingIdx] = useState(0);
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<string>(defaultMeal);
  const [quantity, setQuantity] = useState("1");
  const [servingUnit, setServingUnit] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [sodium, setSodium] = useState("");

  // Grouped picker: the user's saved foods first, then the built-in catalog by
  // category. Values are namespaced so we know which set was chosen.
  const options = [
    ...items.map((i) => ({
      value: `item:${i.id}`,
      label: i.brand ? `${i.name} — ${i.brand}` : i.name,
      group: "My Foods",
    })),
    ...FOOD_CATALOG.map((f) => ({
      value: `cat:${f.slug}`,
      label: f.name,
      group: FOOD_CATEGORY_LABELS[f.category] ?? "Other",
    })),
  ];

  function fillNutrition(n: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number | null;
    sugar?: number | null;
    saturatedFat?: number | null;
    sodium?: number | null;
  }) {
    setCalories(numStr(n.calories));
    setProtein(numStr(n.protein));
    setCarbs(numStr(n.carbs));
    setFat(numStr(n.fat));
    setFiber(numStr(n.fiber));
    setSugar(numStr(n.sugar));
    setSaturatedFat(numStr(n.saturatedFat));
    setSodium(numStr(n.sodium));
  }

  function applyServing(food: CatalogFood, idx: number) {
    const serving = food.servings[idx] ?? food.servings[0];
    setServingUnit(serving.label);
    fillNutrition(catalogServingNutrition(food, serving));
  }

  function reset() {
    setSource(null);
    setFoodItemId(null);
    setCatalog(null);
    setServingIdx(0);
    setName("");
    setQuantity("1");
    setServingUnit("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setSugar("");
    setSaturatedFat("");
    setSodium("");
  }

  function pickSource(value: string | null) {
    setSource(value);
    if (!value) {
      setFoodItemId(null);
      setCatalog(null);
      return;
    }
    if (value.startsWith("item:")) {
      const item = items.find((i) => `item:${i.id}` === value);
      setCatalog(null);
      setServingIdx(0);
      if (!item) return;
      setFoodItemId(item.id);
      setName(item.name);
      setServingUnit(item.servingUnit ?? "");
      fillNutrition(item);
      setQuantity("1");
    } else if (value.startsWith("cat:")) {
      const food = getCatalogFood(value.slice(4));
      setFoodItemId(null);
      if (!food) return;
      setCatalog(food);
      setServingIdx(0);
      setName(food.name);
      applyServing(food, 0);
      setQuantity("1");
    }
  }

  function pickServing(idx: number) {
    setServingIdx(idx);
    if (catalog) applyServing(catalog, idx);
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

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
        <label className="text-sm font-medium">
          Pick a food{" "}
          <span className="text-muted-foreground font-normal">
            — search the built-in list or your saved foods
          </span>
        </label>
        <SearchableSelect
          options={options}
          value={source}
          onValueChange={pickSource}
          placeholder="Search foods… e.g. egg, arroz, aguacate"
          aria-label="Pick a food"
        />
      </div>

      {catalog ? (
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="food-serving" className="text-sm font-medium">
            Serving
          </label>
          <Select
            value={String(servingIdx)}
            onValueChange={(v) => pickServing(Number(v))}
            items={Object.fromEntries(
              catalog.servings.map((s, i) => [String(i), s.label]),
            )}
          >
            <SelectTrigger id="food-serving">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalog.servings.map((s, i) => (
                <SelectItem key={s.label} value={String(i)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <details className="group sm:col-span-2 lg:col-span-4">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium select-none">
          More nutrients &amp; serving unit{" "}
          <span className="font-normal">— optional</span>
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="food-fiber" className="text-sm font-medium">
              Fiber (g)
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
            <label htmlFor="food-sugar" className="text-sm font-medium">
              Sugar (g)
            </label>
            <Input
              id="food-sugar"
              name="sugar"
              type="number"
              min={0}
              step="any"
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="food-satfat" className="text-sm font-medium">
              Sat. fat (g)
            </label>
            <Input
              id="food-satfat"
              name="saturatedFat"
              type="number"
              min={0}
              step="any"
              value={saturatedFat}
              onChange={(e) => setSaturatedFat(e.target.value)}
              className="num"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="food-sodium" className="text-sm font-medium">
              Sodium (mg)
            </label>
            <Input
              id="food-sodium"
              name="sodium"
              type="number"
              min={0}
              step="any"
              value={sodium}
              onChange={(e) => setSodium(e.target.value)}
              className="num"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="food-unit" className="text-sm font-medium">
              Serving unit
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
        </div>
      </details>

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

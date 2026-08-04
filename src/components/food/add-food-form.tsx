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
import { scaleNutrition, type Nutrition } from "@/lib/food";
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
  servingSize: number | null;
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

// Serving units we can convert to an arbitrary weight/volume. A saved food whose
// serving is measured in these can be logged "by weight" — we scale its
// per-serving macros by grams ÷ servingSize.
const WEIGHT_UNITS = new Set(["g", "gr", "gram", "grams", "ml", "milliliter"]);

/** The item's serving size in g/ml if it's a weight-based serving, else null. */
function itemWeightBasis(item: FoodItemOption): number | null {
  const unit = item.servingUnit?.trim().toLowerCase();
  if (!unit || !WEIGHT_UNITS.has(unit)) return null;
  return item.servingSize && item.servingSize > 0 ? item.servingSize : null;
}

/** A saved food's per-serving nutrition as a Nutrition object. */
function itemNutrition(i: FoodItemOption): Nutrition {
  return {
    calories: i.calories,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
    fiber: i.fiber,
    sugar: i.sugar,
    saturatedFat: i.saturatedFat,
    sodium: i.sodium,
  };
}

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
  const [item, setItem] = useState<FoodItemOption | null>(null);
  const [catalog, setCatalog] = useState<CatalogFood | null>(null);
  const [servingIdx, setServingIdx] = useState(0);
  // "By weight" mode: enter an exact gram/ml amount and let the system compute
  // the macros (e.g. "60 g of meat"). Available for catalog foods (per-100 g)
  // and for saved foods whose serving is weight/volume-based (per servingSize).
  const [byWeight, setByWeight] = useState(false);
  const [grams, setGrams] = useState("100");
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

  // Reference nutrition + basis (grams the reference is measured over) + unit
  // for the current weighable source, or null when the source can't be weighed.
  function weighBasis(): {
    ref: Nutrition;
    basis: number;
    unit: string;
  } | null {
    if (catalog) return { ref: { ...catalog.per100g }, basis: 100, unit: "g" };
    if (item) {
      const basis = itemWeightBasis(item);
      if (basis == null) return null;
      return {
        ref: itemNutrition(item),
        basis,
        unit: item.servingUnit?.trim().toLowerCase() ?? "g",
      };
    }
    return null;
  }

  function applyGrams(g: string) {
    const w = weighBasis();
    if (!w) return;
    const n = Math.max(Number(g) || 0, 0);
    setServingUnit(`${n} ${w.unit}`);
    fillNutrition(scaleNutrition(w.ref, n / w.basis));
  }

  function reset() {
    setSource(null);
    setFoodItemId(null);
    setItem(null);
    setCatalog(null);
    setServingIdx(0);
    setByWeight(false);
    setGrams("100");
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
    setByWeight(false);
    setGrams("100");
    if (!value) {
      setFoodItemId(null);
      setItem(null);
      setCatalog(null);
      return;
    }
    if (value.startsWith("item:")) {
      const picked = items.find((i) => `item:${i.id}` === value) ?? null;
      setCatalog(null);
      setItem(picked);
      setServingIdx(0);
      if (!picked) return;
      setFoodItemId(picked.id);
      setName(picked.name);
      setServingUnit(picked.servingUnit ?? "");
      fillNutrition(picked);
      setQuantity("1");
    } else if (value.startsWith("cat:")) {
      const food = getCatalogFood(value.slice(4));
      setFoodItemId(null);
      setItem(null);
      if (!food) return;
      setCatalog(food);
      setServingIdx(0);
      setName(food.name);
      applyServing(food, 0);
      setQuantity("1");
    }
  }

  function pickServing(value: string) {
    if (value === "custom") {
      setByWeight(true);
      applyGrams(grams);
      return;
    }
    setByWeight(false);
    if (catalog) {
      const idx = Number(value);
      setServingIdx(idx);
      applyServing(catalog, idx);
    } else if (item) {
      // Back to the item's single per-serving basis (quantity multiplies it).
      setServingUnit(item.servingUnit ?? "");
      fillNutrition(item);
    }
  }

  function pickGrams(g: string) {
    setGrams(g);
    applyGrams(g);
  }

  // Weighable = a catalog food (per-100 g) or a saved food with a g/ml serving.
  const itemBasis = item ? itemWeightBasis(item) : null;
  const canWeigh = catalog != null || itemBasis != null;
  const weighUnit = catalog
    ? "g"
    : (item?.servingUnit?.trim().toLowerCase() ?? "g");
  const itemServingLabel =
    item && item.servingSize
      ? `1 serving (${item.servingSize} ${item.servingUnit ?? ""})`.trim()
      : "1 serving";
  const servingOptions: [string, string][] = catalog
    ? [
        ...catalog.servings.map(
          (s, i) => [String(i), s.label] as [string, string],
        ),
        ["custom", `By weight (${weighUnit})…`],
      ]
    : itemBasis != null
      ? [
          ["0", itemServingLabel],
          ["custom", `By weight (${weighUnit})…`],
        ]
      : [];

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

      {canWeigh ? (
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="food-serving" className="text-sm font-medium">
            Serving
          </label>
          <Select
            value={byWeight ? "custom" : catalog ? String(servingIdx) : "0"}
            onValueChange={(v) => pickServing(String(v))}
            items={Object.fromEntries(servingOptions)}
          >
            <SelectTrigger id="food-serving">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {servingOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {canWeigh && byWeight ? (
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="food-grams" className="text-sm font-medium">
            Weight ({weighUnit})
          </label>
          <Input
            id="food-grams"
            type="number"
            min={0}
            step="any"
            value={grams}
            onChange={(e) => pickGrams(e.target.value)}
            placeholder="e.g. 60"
            className="num"
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            {catalog
              ? "Macros are computed from this food’s per-100 g values."
              : `Macros are computed from this food’s per-${item?.servingSize ?? ""} ${weighUnit} serving.`}
          </p>
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

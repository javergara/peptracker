"use client";

import { useState } from "react";
import { ChefHat, Plus, X } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodItemOption } from "@/components/food/add-food-form";
import { saveRecipe } from "@/lib/actions/food";
import { scaleNutrition, sumNutrition, type Nutrition } from "@/lib/food";
import {
  FOOD_CATALOG,
  FOOD_CATEGORY_LABELS,
  catalogServingNutrition,
  getCatalogFood,
} from "@/lib/food-catalog";
import type { RecipeIngredient } from "@/types/food";

/**
 * Build a saved recipe from catalog + My Foods ingredients. Each added
 * ingredient carries its TOTAL nutrition; the recipe's per-serving nutrition =
 * summed ingredients ÷ "makes N servings". Saves as a FoodItem, so it then logs
 * like any food. All math is client-side via the shared food libs.
 */
export function RecipeBuilder({ items }: { items: FoodItemOption[] }) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servings, setServings] = useState("1");

  // Add-ingredient sub-state.
  const [source, setSource] = useState<string | null>(null);
  const [servingIdx, setServingIdx] = useState(0);
  const [qty, setQty] = useState("1");

  const catalog = source?.startsWith("cat:")
    ? getCatalogFood(source.slice(4))
    : undefined;

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

  function addIngredient() {
    if (!source) return;
    const q = Math.max(Number(qty) || 1, 0) || 1;
    let base: Nutrition | null = null;
    let name = "";
    let unit = "serving";

    if (source.startsWith("cat:") && catalog) {
      const serving = catalog.servings[servingIdx] ?? catalog.servings[0];
      base = catalogServingNutrition(catalog, serving);
      name = catalog.name;
      unit = serving.label;
    } else if (source.startsWith("item:")) {
      const item = items.find((i) => `item:${i.id}` === source);
      if (item) {
        base = {
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sugar: item.sugar,
          saturatedFat: item.saturatedFat,
          sodium: item.sodium,
        };
        name = item.name;
        unit = item.servingUnit ?? "serving";
      }
    }
    if (!base) return;

    const total = scaleNutrition(base, q);
    setIngredients((prev) => [
      ...prev,
      {
        name,
        amount: q,
        unit,
        calories: total.calories,
        protein: total.protein,
        carbs: total.carbs,
        fat: total.fat,
        fiber: total.fiber,
        sugar: total.sugar,
        saturatedFat: total.saturatedFat,
        sodium: total.sodium,
      },
    ]);
    setSource(null);
    setServingIdx(0);
    setQty("1");
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  const totals = sumNutrition(ingredients);
  const nServings = Math.max(Number(servings) || 1, 0) || 1;
  const perServing = scaleNutrition(totals, 1 / nServings);

  return (
    <ActionForm
      action={async (fd) => {
        await saveRecipe(fd);
        setIngredients([]);
        setServings("1");
      }}
      success="Recipe saved"
      resetOnSuccess={false}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(ingredients)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="recipe-name" className="text-sm font-medium">
            Recipe name <span className="text-destructive">*</span>
          </label>
          <Input
            id="recipe-name"
            name="name"
            required
            placeholder="e.g. Chicken & rice bowl"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="recipe-brand" className="text-sm font-medium">
            Note{" "}
            <span className="text-muted-foreground font-normal">
              — optional
            </span>
          </label>
          <Input id="recipe-brand" name="brand" maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="recipe-servings" className="text-sm font-medium">
            Makes (servings)
          </label>
          <Input
            id="recipe-servings"
            name="recipeServings"
            type="number"
            min={1}
            step="any"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="num"
          />
        </div>
      </div>

      {/* Ingredient adder */}
      <div className="border-border grid items-end gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ingredient</label>
          <SearchableSelect
            options={options}
            value={source}
            onValueChange={(v) => {
              setSource(v);
              setServingIdx(0);
            }}
            placeholder="Search foods…"
            aria-label="Ingredient"
          />
        </div>
        {catalog ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Serving</label>
            <Select
              value={String(servingIdx)}
              onValueChange={(v) => setServingIdx(Number(v))}
              items={Object.fromEntries(
                catalog.servings.map((s, i) => [String(i), s.label]),
              )}
            >
              <SelectTrigger className="w-40">
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
        <div className="space-y-1.5">
          <label htmlFor="ing-qty" className="text-sm font-medium">
            Qty
          </label>
          <Input
            id="ing-qty"
            type="number"
            min={0}
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="num w-20"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!source}
          onClick={addIngredient}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {/* Ingredient list + totals */}
      {ingredients.length > 0 ? (
        <div className="card-surface divide-border divide-y rounded-2xl">
          {ingredients.map((ing, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {ing.name}
                <span className="num text-muted-foreground ml-2 text-xs">
                  ×{ing.amount} {ing.unit}
                </span>
              </span>
              <span className="num text-muted-foreground text-xs">
                {ing.calories} kcal
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${ing.name}`}
                onClick={() => removeIngredient(i)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="bg-accent/40 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span className="font-medium">
              Per serving{" "}
              <span className="text-muted-foreground font-normal">
                (of {nServings})
              </span>
            </span>
            <span className="num text-muted-foreground">
              {perServing.calories} kcal · P {Math.round(perServing.protein)} ·
              C {Math.round(perServing.carbs)} · F {Math.round(perServing.fat)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Add ingredients above to build the recipe.
        </p>
      )}

      <SubmitButton disabled={ingredients.length === 0}>
        <ChefHat className="size-4" />
        Save recipe
      </SubmitButton>
    </ActionForm>
  );
}

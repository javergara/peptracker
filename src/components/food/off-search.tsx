"use client";

import { useState, useTransition } from "react";
import { Barcode, Loader2, Plus, Search } from "lucide-react";
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
import { addFoodLog } from "@/lib/actions/food";
import { lookupFoodBarcode, searchFoodDatabase } from "@/lib/actions/off";
import { scaleNutrition } from "@/lib/food";
import type { OffFood } from "@/lib/off";
import { MEAL_TYPES, type MealTypeKey } from "@/types/food";

const MEAL_ITEMS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.key, m.label]),
);

/** Best-effort grams from OFF's free-text serving size (e.g. "30 g" → 30). */
function parseGrams(serving: string | null): number {
  const m = serving?.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
  return m ? Number(m[1]) : 100;
}

function ResultRow({
  food,
  date,
  defaultMeal,
}: {
  food: OffFood;
  date: string;
  defaultMeal: MealTypeKey;
}) {
  const [grams, setGrams] = useState(String(parseGrams(food.servingSize)));
  const [meal, setMeal] = useState<string>(defaultMeal);
  const [isPending, start] = useTransition();

  function log() {
    const g = Math.max(Number(grams) || 0, 0);
    if (g <= 0) {
      toast.error("Enter a gram amount.");
      return;
    }
    const totals = scaleNutrition(food.per100g, g / 100);
    start(async () => {
      const fd = new FormData();
      fd.set("name", food.brand ? `${food.name} (${food.brand})` : food.name);
      fd.set("mealType", meal);
      fd.set("date", date);
      fd.set("quantity", "1");
      fd.set("servingUnit", `${g} g`);
      fd.set("calories", String(totals.calories));
      fd.set("protein", String(totals.protein));
      fd.set("carbs", String(totals.carbs));
      fd.set("fat", String(totals.fat));
      if (totals.fiber != null) fd.set("fiber", String(totals.fiber));
      if (totals.sugar != null) fd.set("sugar", String(totals.sugar));
      if (totals.saturatedFat != null)
        fd.set("saturatedFat", String(totals.saturatedFat));
      if (totals.sodium != null) fd.set("sodium", String(totals.sodium));
      try {
        await addFoodLog(fd);
        toast.success(`Logged ${food.name}`);
      } catch {
        toast.error("Could not log food.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{food.name}</span>
          {food.brand ? (
            <span className="text-muted-foreground text-xs">{food.brand}</span>
          ) : null}
        </div>
        <div className="num text-muted-foreground text-xs">
          {food.per100g.calories} kcal / 100 g · P{" "}
          {Math.round(food.per100g.protein)} · C{" "}
          {Math.round(food.per100g.carbs)} · F {Math.round(food.per100g.fat)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Grams"
          type="number"
          min={0}
          step="any"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="num h-8 w-20"
        />
        <span className="text-muted-foreground text-xs">g</span>
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
        <Button size="sm" disabled={isPending} onClick={log}>
          <Plus className="size-3.5" />
          Log
        </Button>
      </div>
    </div>
  );
}

/**
 * Search the Open Food Facts database (~3M products) by name or barcode, then
 * log a chosen result for a chosen gram amount. Fetches run server-side (see
 * actions/off.ts). Live camera scanning isn't offered (unsupported on iOS
 * Safari) — enter the barcode number instead.
 */
export function OffSearch({
  date,
  defaultMeal = "snack",
}: {
  date: string;
  defaultMeal?: MealTypeKey;
}) {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<OffFood[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, start] = useTransition();

  function runSearch() {
    if (!query.trim()) return;
    start(async () => {
      try {
        const r = await searchFoodDatabase(query);
        setResults(r);
        setSearched(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Search failed.");
      }
    });
  }

  function runBarcode() {
    if (!barcode.trim()) return;
    start(async () => {
      try {
        const f = await lookupFoodBarcode(barcode);
        setResults(f ? [f] : []);
        setSearched(true);
        if (!f) toast.error("No product found for that barcode.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Lookup failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex gap-2">
          <Input
            placeholder="Search foods… e.g. Alpina yogurt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={runSearch}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Search
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Barcode #"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runBarcode();
              }
            }}
            className="num w-36"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={runBarcode}
            aria-label="Look up barcode"
          >
            <Barcode className="size-4" />
          </Button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="card-surface divide-border divide-y rounded-2xl">
          {results.map((f, i) => (
            <ResultRow
              key={`${f.code ?? f.name}-${i}`}
              food={f}
              date={date}
              defaultMeal={defaultMeal}
            />
          ))}
        </div>
      ) : searched && !isPending ? (
        <p className="text-muted-foreground text-sm">No matches found.</p>
      ) : null}
    </div>
  );
}

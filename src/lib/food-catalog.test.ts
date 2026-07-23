import { describe, expect, it } from "vitest";

import {
  catalogServingNutrition,
  FOOD_CATALOG,
  FOOD_CATEGORY_LABELS,
  getCatalogFood,
} from "./food-catalog";

describe("FOOD_CATALOG integrity", () => {
  it("has unique slugs", () => {
    const slugs = FOOD_CATALOG.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every food a known category and at least one serving", () => {
    for (const food of FOOD_CATALOG) {
      expect(FOOD_CATEGORY_LABELS[food.category]).toBeTruthy();
      expect(food.servings.length).toBeGreaterThan(0);
    }
  });

  it("includes a 100 g/ml serving for every food", () => {
    for (const food of FOOD_CATALOG) {
      expect(food.servings.some((s) => s.grams === 100)).toBe(true);
    }
  });
});

describe("catalogServingNutrition", () => {
  it("scales per-100g nutrition to the serving grams", () => {
    const egg = getCatalogFood("egg")!;
    // 1 egg = 50 g → half of per-100g.
    const oneEgg = catalogServingNutrition(egg, { label: "1 egg", grams: 50 });
    expect(oneEgg.calories).toBe(72); // round(143 * 0.5)
    expect(oneEgg.protein).toBe(6.3); // round(12.6 * 0.5, 1)
    expect(oneEgg.fat).toBe(4.8); // round(9.5 * 0.5, 1)
  });

  it("returns per-100g values unchanged for a 100 g serving", () => {
    const rice = getCatalogFood("white-rice")!;
    const per100 = catalogServingNutrition(rice, {
      label: "100 g",
      grams: 100,
    });
    expect(per100.calories).toBe(130);
    expect(per100.carbs).toBe(28);
  });
});

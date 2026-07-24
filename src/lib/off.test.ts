import { describe, expect, it } from "vitest";

import { normalizeOffProduct } from "./off";

describe("normalizeOffProduct", () => {
  it("maps nutriments to per-100g nutrition", () => {
    const food = normalizeOffProduct({
      code: "123",
      product_name: "Test Yogurt",
      brands: "Alpina, SubBrand",
      serving_size: "170 g",
      nutriments: {
        "energy-kcal_100g": 59,
        proteins_100g: 10,
        carbohydrates_100g: 3.6,
        fat_100g: 0.4,
        fiber_100g: 0,
        sugars_100g: 3.6,
        "saturated-fat_100g": 0.1,
        sodium_100g: 0.036, // grams → 36 mg
      },
    });
    expect(food).not.toBeNull();
    expect(food!.name).toBe("Test Yogurt");
    expect(food!.brand).toBe("Alpina"); // first brand only
    expect(food!.per100g.calories).toBe(59);
    expect(food!.per100g.sodium).toBe(36);
    expect(food!.per100g.sugar).toBe(3.6);
  });

  it("falls back from kJ energy and from salt to sodium", () => {
    const food = normalizeOffProduct({
      product_name: "KJ Food",
      nutriments: { energy_100g: 418.4, salt_100g: 2.5 }, // 100 kcal, sodium 1000 mg
    });
    expect(food!.per100g.calories).toBe(100);
    expect(food!.per100g.sodium).toBe(1000);
  });

  it("returns null without a name or usable energy", () => {
    expect(
      normalizeOffProduct({ nutriments: { "energy-kcal_100g": 100 } }),
    ).toBeNull();
    expect(
      normalizeOffProduct({ product_name: "No energy", nutriments: {} }),
    ).toBeNull();
  });
});

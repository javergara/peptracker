import { scaleNutrition, type Nutrition } from "@/lib/food";

/**
 * Built-in, GLOBAL food catalog — common + Colombian staples with per-100g
 * nutrition and a few serving presets (e.g. "1 egg" vs "100 g"). Selecting one
 * in the log form auto-fills the macros for the chosen serving; the "servings"
 * quantity then multiplies it (so "2 eggs" = serving "1 egg" × 2). Static
 * reference data, like the peptide library — no DB, available to every profile.
 *
 * Values are approximate/educational (USDA-style per-100g figures); users can
 * always edit a filled-in entry before logging.
 */

export const FOOD_CATEGORIES = [
  { key: "protein", label: "Proteins" },
  { key: "carb", label: "Carbs & grains" },
  { key: "fruit", label: "Fruits" },
  { key: "vegetable", label: "Vegetables" },
  { key: "dairy", label: "Dairy" },
  { key: "fat", label: "Fats & nuts" },
] as const;

export type FoodCategoryKey = (typeof FOOD_CATEGORIES)[number]["key"];

export const FOOD_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FOOD_CATEGORIES.map((c) => [c.key, c.label]),
);

export type CatalogServing = { label: string; grams: number };

export type CatalogFood = {
  slug: string;
  /** Bilingual name so Spanish search terms match (e.g. "Chicken (Pechuga)"). */
  name: string;
  category: FoodCategoryKey;
  /** Canonical nutrition per 100 g. */
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  /** Serving presets; the first is the default. Always includes a 100 g/ml one. */
  servings: CatalogServing[];
};

const G100: CatalogServing = { label: "100 g", grams: 100 };

export const FOOD_CATALOG: CatalogFood[] = [
  // --- Proteins ---
  {
    slug: "egg",
    name: "Egg (Huevo)",
    category: "protein",
    per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
    servings: [
      { label: "1 egg (50 g)", grams: 50 },
      { label: "2 eggs (100 g)", grams: 100 },
      G100,
    ],
  },
  {
    slug: "chicken-breast",
    name: "Chicken breast (Pechuga de pollo)",
    category: "protein",
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    servings: [G100, { label: "1 fillet (120 g)", grams: 120 }],
  },
  {
    slug: "beef-lean",
    name: "Beef, lean (Carne de res)",
    category: "protein",
    per100g: { calories: 187, protein: 26, carbs: 0, fat: 8.5, fiber: 0 },
    servings: [G100, { label: "Steak (150 g)", grams: 150 }],
  },
  {
    slug: "ground-beef",
    name: "Ground beef (Carne molida)",
    category: "protein",
    per100g: { calories: 217, protein: 26, carbs: 0, fat: 12, fiber: 0 },
    servings: [G100],
  },
  {
    slug: "pork-loin",
    name: "Pork loin (Lomo de cerdo)",
    category: "protein",
    per100g: { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 },
    servings: [G100, { label: "Chop (120 g)", grams: 120 }],
  },
  {
    slug: "tilapia",
    name: "Tilapia (Tilapia)",
    category: "protein",
    per100g: { calories: 128, protein: 26, carbs: 0, fat: 2.7, fiber: 0 },
    servings: [G100, { label: "1 fillet (120 g)", grams: 120 }],
  },
  {
    slug: "salmon",
    name: "Salmon (Salmón)",
    category: "protein",
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
    servings: [G100, { label: "1 fillet (150 g)", grams: 150 }],
  },
  {
    slug: "tuna-canned",
    name: "Canned tuna (Atún)",
    category: "protein",
    per100g: { calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 },
    servings: [{ label: "1 can (120 g)", grams: 120 }, G100],
  },
  {
    slug: "shrimp",
    name: "Shrimp (Camarón)",
    category: "protein",
    per100g: { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
    servings: [G100],
  },
  {
    slug: "whey-protein",
    name: "Whey protein (Proteína whey)",
    category: "protein",
    per100g: { calories: 400, protein: 80, carbs: 10, fat: 5, fiber: 0 },
    servings: [{ label: "1 scoop (30 g)", grams: 30 }, G100],
  },
  {
    slug: "lentils",
    name: "Lentils, cooked (Lentejas)",
    category: "protein",
    per100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
    servings: [{ label: "1 cup (198 g)", grams: 198 }, G100],
  },
  {
    slug: "black-beans",
    name: "Black beans (Fríjoles)",
    category: "protein",
    per100g: { calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7 },
    servings: [{ label: "1 cup (172 g)", grams: 172 }, G100],
  },

  // --- Carbs & grains ---
  {
    slug: "white-rice",
    name: "White rice, cooked (Arroz)",
    category: "carb",
    per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
    servings: [{ label: "1 cup (158 g)", grams: 158 }, G100],
  },
  {
    slug: "arepa",
    name: "Arepa (Arepa)",
    category: "carb",
    per100g: { calories: 217, protein: 4.7, carbs: 44, fat: 2.9, fiber: 2 },
    servings: [{ label: "1 arepa (100 g)", grams: 100 }, G100],
  },
  {
    slug: "potato",
    name: "Potato, boiled (Papa)",
    category: "carb",
    per100g: { calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
    servings: [{ label: "1 medium (150 g)", grams: 150 }, G100],
  },
  {
    slug: "plantain",
    name: "Plantain (Plátano)",
    category: "carb",
    per100g: { calories: 122, protein: 1.3, carbs: 32, fat: 0.4, fiber: 2.3 },
    servings: [{ label: "1 plantain (180 g)", grams: 180 }, G100],
  },
  {
    slug: "cassava",
    name: "Cassava (Yuca)",
    category: "carb",
    per100g: { calories: 160, protein: 1.4, carbs: 38, fat: 0.3, fiber: 1.8 },
    servings: [G100],
  },
  {
    slug: "white-bread",
    name: "White bread (Pan)",
    category: "carb",
    per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
    servings: [{ label: "1 slice (28 g)", grams: 28 }, G100],
  },
  {
    slug: "oats",
    name: "Oats, dry (Avena)",
    category: "carb",
    per100g: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6 },
    servings: [{ label: "1/2 cup (40 g)", grams: 40 }, G100],
  },
  {
    slug: "pasta",
    name: "Pasta, cooked (Pasta)",
    category: "carb",
    per100g: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8 },
    servings: [{ label: "1 cup (140 g)", grams: 140 }, G100],
  },
  {
    slug: "corn",
    name: "Corn (Maíz / Mazorca)",
    category: "carb",
    per100g: { calories: 96, protein: 3.4, carbs: 21, fat: 1.5, fiber: 2.4 },
    servings: [{ label: "1 ear (90 g)", grams: 90 }, G100],
  },

  // --- Fruits ---
  {
    slug: "blueberry",
    name: "Blueberries (Arándanos)",
    category: "fruit",
    per100g: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
    servings: [{ label: "1 cup (148 g)", grams: 148 }, G100],
  },
  {
    slug: "strawberry",
    name: "Strawberries (Fresas)",
    category: "fruit",
    per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
    servings: [{ label: "1 cup (152 g)", grams: 152 }, G100],
  },
  {
    slug: "tomato",
    name: "Tomato (Tomate)",
    category: "fruit",
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
    servings: [{ label: "1 tomato (123 g)", grams: 123 }, G100],
  },
  {
    slug: "avocado",
    name: "Avocado (Aguacate)",
    category: "fruit",
    per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
    servings: [
      { label: "1/2 avocado (100 g)", grams: 100 },
      { label: "Whole (200 g)", grams: 200 },
    ],
  },
  {
    slug: "banana",
    name: "Banana (Banano)",
    category: "fruit",
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
    servings: [{ label: "1 banana (118 g)", grams: 118 }, G100],
  },
  {
    slug: "apple",
    name: "Apple (Manzana)",
    category: "fruit",
    per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
    servings: [{ label: "1 apple (182 g)", grams: 182 }, G100],
  },
  {
    slug: "mango",
    name: "Mango (Mango)",
    category: "fruit",
    per100g: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
    servings: [{ label: "1 cup (165 g)", grams: 165 }, G100],
  },
  {
    slug: "papaya",
    name: "Papaya (Papaya)",
    category: "fruit",
    per100g: { calories: 43, protein: 0.5, carbs: 11, fat: 0.3, fiber: 1.7 },
    servings: [{ label: "1 cup (145 g)", grams: 145 }, G100],
  },
  {
    slug: "pineapple",
    name: "Pineapple (Piña)",
    category: "fruit",
    per100g: { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 },
    servings: [{ label: "1 cup (165 g)", grams: 165 }, G100],
  },
  {
    slug: "orange",
    name: "Orange (Naranja)",
    category: "fruit",
    per100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 },
    servings: [{ label: "1 orange (131 g)", grams: 131 }, G100],
  },
  {
    slug: "guava",
    name: "Guava (Guayaba)",
    category: "fruit",
    per100g: { calories: 68, protein: 2.6, carbs: 14, fat: 0.95, fiber: 5.4 },
    servings: [{ label: "1 fruit (55 g)", grams: 55 }, G100],
  },

  // --- Vegetables ---
  {
    slug: "broccoli",
    name: "Broccoli (Brócoli)",
    category: "vegetable",
    per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
    servings: [{ label: "1 cup (91 g)", grams: 91 }, G100],
  },
  {
    slug: "carrot",
    name: "Carrot (Zanahoria)",
    category: "vegetable",
    per100g: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
    servings: [{ label: "1 carrot (61 g)", grams: 61 }, G100],
  },
  {
    slug: "spinach",
    name: "Spinach (Espinaca)",
    category: "vegetable",
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
    servings: [{ label: "1 cup (30 g)", grams: 30 }, G100],
  },

  // --- Dairy ---
  {
    slug: "milk-whole",
    name: "Milk, whole (Leche entera)",
    category: "dairy",
    per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
    servings: [
      { label: "1 glass (244 g)", grams: 244 },
      { label: "100 ml", grams: 100 },
    ],
  },
  {
    slug: "greek-yogurt",
    name: "Greek yogurt (Yogur griego)",
    category: "dairy",
    per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
    servings: [{ label: "1 cup (170 g)", grams: 170 }, G100],
  },
  {
    slug: "fresh-cheese",
    name: "Fresh cheese (Queso campesino)",
    category: "dairy",
    per100g: { calories: 264, protein: 18, carbs: 3, fat: 20, fiber: 0 },
    servings: [{ label: "1 slice (30 g)", grams: 30 }, G100],
  },

  // --- Fats & nuts ---
  {
    slug: "peanut-butter",
    name: "Peanut butter (Mantequilla de maní)",
    category: "fat",
    per100g: { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
    servings: [{ label: "1 tbsp (16 g)", grams: 16 }, G100],
  },
  {
    slug: "almonds",
    name: "Almonds (Almendras)",
    category: "fat",
    per100g: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
    servings: [{ label: "1 handful (28 g)", grams: 28 }, G100],
  },
  {
    slug: "olive-oil",
    name: "Olive oil (Aceite de oliva)",
    category: "fat",
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
    servings: [{ label: "1 tbsp (14 g)", grams: 14 }, G100],
  },
];

/** Nutrition for a chosen serving (per-100g scaled by grams/100). */
export function catalogServingNutrition(
  food: CatalogFood,
  serving: CatalogServing,
): Nutrition {
  return scaleNutrition({ ...food.per100g }, serving.grams / 100);
}

/** Look up a catalog food by slug. */
export function getCatalogFood(slug: string): CatalogFood | undefined {
  return FOOD_CATALOG.find((f) => f.slug === slug);
}

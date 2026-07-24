import type { Nutrition } from "@/lib/food";

/**
 * Open Food Facts integration — a free, open food database (~3M products, no API
 * key). `normalizeOffProduct` (pure, unit-tested) maps a raw OFF product to our
 * per-100g Nutrition shape; the fetch helpers run server-side (in the action).
 */

export interface OffFood {
  /** Barcode, when known. */
  code: string | null;
  name: string;
  brand: string | null;
  /** OFF's serving-size label, e.g. "30 g" (free text). */
  servingSize: string | null;
  /** Nutrition per 100 g/ml (sodium in mg; the rest grams). */
  per100g: Nutrition;
}

type OffNutriments = Record<string, number | string | undefined>;
interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
}

function n(nutriments: OffNutriments, key: string): number | null {
  const v = nutriments[key];
  const num = typeof v === "string" ? Number(v) : v;
  return typeof num === "number" && Number.isFinite(num) ? num : null;
}

/**
 * Map a raw OFF product to an OffFood, or null when it lacks a name or usable
 * energy value. Calories come from `energy-kcal_100g`, falling back to
 * `energy_100g` (kJ → kcal). Sodium is derived from `sodium_100g` (g→mg) or
 * `salt_100g` (÷2.5, g→mg).
 */
export function normalizeOffProduct(product: OffProduct): OffFood | null {
  const name = (product.product_name ?? "").trim();
  if (!name) return null;
  const nut = product.nutriments ?? {};

  let calories = n(nut, "energy-kcal_100g");
  if (calories == null) {
    const kj = n(nut, "energy_100g");
    if (kj != null) calories = Math.round(kj / 4.184);
  }
  if (calories == null) return null;

  const sodiumG = n(nut, "sodium_100g");
  const saltG = n(nut, "salt_100g");
  const sodiumMg =
    sodiumG != null
      ? Math.round(sodiumG * 1000)
      : saltG != null
        ? Math.round((saltG / 2.5) * 1000)
        : null;

  const per100g: Nutrition = {
    calories: Math.round(calories),
    protein: n(nut, "proteins_100g") ?? 0,
    carbs: n(nut, "carbohydrates_100g") ?? 0,
    fat: n(nut, "fat_100g") ?? 0,
    fiber: n(nut, "fiber_100g"),
    sugar: n(nut, "sugars_100g"),
    saturatedFat: n(nut, "saturated-fat_100g"),
    sodium: sodiumMg,
  };

  const brand = (product.brands ?? "").split(",")[0]?.trim() || null;
  return {
    code: product.code ?? null,
    name,
    brand,
    servingSize: (product.serving_size ?? "").trim() || null,
    per100g,
  };
}

const OFF_HEADERS = {
  // OFF asks apps to identify themselves.
  "User-Agent": "PeptraFoodTracker/1.0 (personal health app)",
};
const FIELDS = "code,product_name,brands,serving_size,nutriments";
const TIMEOUT_MS = 7000;

/** Fetch with a hard timeout so a slow OFF endpoint can't hang the request. */
async function offFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: OFF_HEADERS,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up a single product by barcode (EAN/UPC). Returns null when the product
 * isn't in the database; THROWS on a network/HTTP failure (so the UI can tell
 * "not found" apart from "couldn't reach the database").
 */
export async function lookupOffBarcode(
  barcode: string,
): Promise<OffFood | null> {
  const code = barcode.replace(/\D/g, "");
  if (!code) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return normalizeOffProduct(data.product);
}

/** How much of the optional nutrient data a result carries (for ranking). */
function completeness(f: OffFood): number {
  const p = f.per100g;
  let score = 0;
  for (const v of [p.fiber, p.sugar, p.saturatedFat, p.sodium]) {
    if (v != null) score += 1;
  }
  if (p.protein > 0 || p.carbs > 0 || p.fat > 0) score += 1;
  return score;
}

/**
 * Search products by name; returns up to `limit` normalized matches. Fetches a
 * wider page, then dedupes by name+brand and ranks the most complete entries
 * first (OFF is crowdsourced, so results are noisy and often duplicated).
 */
export async function searchOff(query: string, limit = 12): Promise<OffFood[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit * 3}&fields=${FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = (await res.json()) as { products?: OffProduct[] };

  const seen = new Set<string>();
  const deduped: OffFood[] = [];
  for (const product of data.products ?? []) {
    const food = normalizeOffProduct(product);
    if (!food) continue;
    const key = `${food.name}|${food.brand ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(food);
  }
  return deduped
    .sort((a, b) => completeness(b) - completeness(a))
    .slice(0, limit);
}

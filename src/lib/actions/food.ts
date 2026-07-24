"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { parseLocalDate, toDateInputValue } from "@/lib/dates";
import { scaleNutrition, sumNutrition } from "@/lib/food";
import { asRecipeIngredients, parseMealType } from "@/types/food";

/**
 * Food & calorie tracker mutations. FoodLog + FoodItem are profile-owned, so
 * every mutation resolves the active profile and scopes by it. Numeric
 * nutrition is stored as the TOTAL for the logged quantity (per-serving values
 * are scaled server-side via scaleNutrition), so the metrics page can sum
 * columns directly.
 */

/** Parse a number-ish form field, falling back to `fallback`. */
function num(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

/** Local midnight of today (matches FoodLog.date normalization). */
function todayLocal(): Date {
  return parseLocalDate(toDateInputValue(new Date())) ?? new Date();
}

function readItemNutrition(formData: FormData) {
  const optional = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw ? num(formData.get(key)) : null;
  };
  return {
    calories: num(formData.get("calories")),
    protein: num(formData.get("protein")),
    carbs: num(formData.get("carbs")),
    fat: num(formData.get("fat")),
    fiber: optional("fiber"),
    sugar: optional("sugar"),
    saturatedFat: optional("saturatedFat"),
    sodium: optional("sodium"),
  };
}

// --- Food logs ---

/** Snapshot of a deleted food log, enough to re-create it (for undo). */
export type RestorableFoodLog = {
  date: string;
  mealType: string;
  foodItemId: string | null;
  name: string;
  quantity: number;
  servingUnit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  sodium: number | null;
  notes: string | null;
};

/**
 * Log a food entry. The submitted calories/macros are treated as PER-SERVING
 * values and multiplied by `quantity` (defaults to 1, so free-typed totals pass
 * through unchanged). An optional `foodItemId` links the source library item —
 * it's verified against the active profile and dropped if it isn't owned.
 */
export async function addFoodLog(formData: FormData) {
  const user = await getActiveUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A food name is required.");

  const mealType = parseMealType(String(formData.get("mealType") ?? ""));
  const date =
    parseLocalDate(String(formData.get("date") ?? "")) ?? todayLocal();
  const quantity = Math.max(num(formData.get("quantity"), 1), 0) || 1;
  const servingUnit = String(formData.get("servingUnit") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let foodItemId = String(formData.get("foodItemId") ?? "").trim() || null;
  if (foodItemId) {
    const owned = await prisma.foodItem.findFirst({
      where: { id: foodItemId, userId: user.id },
      select: { id: true },
    });
    if (!owned) foodItemId = null;
  }

  const totals = scaleNutrition(readItemNutrition(formData), quantity);

  await prisma.foodLog.create({
    data: {
      userId: user.id,
      date,
      mealType,
      foodItemId,
      name,
      quantity,
      servingUnit,
      ...totals,
      notes,
    },
  });

  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

/**
 * Quick-add a saved library item to the log. Nutrition is read from the FoodItem
 * server-side (never trusted from the client) and scaled by quantity.
 */
export async function logFoodItem(foodItemId: string, formData: FormData) {
  const user = await getActiveUser();
  const item = await prisma.foodItem.findFirst({
    where: { id: foodItemId, userId: user.id },
  });
  if (!item) throw new Error("Food not found.");

  const mealType = parseMealType(String(formData.get("mealType") ?? "snack"));
  const date =
    parseLocalDate(String(formData.get("date") ?? "")) ?? todayLocal();
  const quantity = Math.max(num(formData.get("quantity"), 1), 0) || 1;

  const totals = scaleNutrition(
    {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sugar: item.sugar,
      saturatedFat: item.saturatedFat,
      sodium: item.sodium,
    },
    quantity,
  );

  await prisma.foodLog.create({
    data: {
      userId: user.id,
      date,
      mealType,
      foodItemId: item.id,
      name: item.name,
      quantity,
      servingUnit: item.servingUnit,
      ...totals,
    },
  });

  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

/**
 * Edit a logged food entry. Like doses, edited nutrition fields are stored as
 * given (treated as per-serving × quantity) so a correction is exact.
 */
export async function updateFoodLog(id: string, formData: FormData) {
  const user = await getActiveUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A food name is required.");

  const mealType = parseMealType(String(formData.get("mealType") ?? ""));
  const date =
    parseLocalDate(String(formData.get("date") ?? "")) ?? todayLocal();
  const quantity = Math.max(num(formData.get("quantity"), 1), 0) || 1;
  const servingUnit = String(formData.get("servingUnit") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const totals = scaleNutrition(readItemNutrition(formData), quantity);

  const res = await prisma.foodLog.updateMany({
    where: { id, userId: user.id },
    data: { date, mealType, name, quantity, servingUnit, ...totals, notes },
  });
  if (res.count === 0) throw new Error("Food log not found.");

  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

export async function deleteFoodLog(id: string): Promise<RestorableFoodLog> {
  const user = await getActiveUser();
  const log = await prisma.foodLog.findFirst({
    where: { id, userId: user.id },
  });
  if (!log) throw new Error("Food log not found.");

  await prisma.foodLog.delete({ where: { id } });

  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");

  return {
    date: log.date.toISOString(),
    mealType: log.mealType,
    foodItemId: log.foodItemId,
    name: log.name,
    quantity: log.quantity,
    servingUnit: log.servingUnit,
    calories: log.calories,
    protein: log.protein,
    carbs: log.carbs,
    fat: log.fat,
    fiber: log.fiber,
    sugar: log.sugar,
    saturatedFat: log.saturatedFat,
    sodium: log.sodium,
    notes: log.notes,
  };
}

/** Re-create a food log removed via deleteFoodLog (undo). */
export async function restoreFoodLog(data: RestorableFoodLog) {
  const user = await getActiveUser();
  // Only relink the source item if it still belongs to the profile.
  let foodItemId = data.foodItemId;
  if (foodItemId) {
    const owned = await prisma.foodItem.findFirst({
      where: { id: foodItemId, userId: user.id },
      select: { id: true },
    });
    if (!owned) foodItemId = null;
  }
  await prisma.foodLog.create({
    data: {
      userId: user.id,
      date: new Date(data.date),
      mealType: data.mealType,
      foodItemId,
      name: data.name,
      quantity: data.quantity,
      servingUnit: data.servingUnit,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      sugar: data.sugar,
      saturatedFat: data.saturatedFat,
      sodium: data.sodium,
      notes: data.notes,
    },
  });
  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

// --- My Foods library ---

function readFoodItemFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const servingSizeRaw = String(formData.get("servingSize") ?? "").trim();
  const servingUnit = String(formData.get("servingUnit") ?? "").trim() || null;
  return {
    name,
    brand,
    servingSize: servingSizeRaw ? num(formData.get("servingSize")) : null,
    servingUnit,
    ...readItemNutrition(formData),
  };
}

export async function addFoodItem(formData: FormData) {
  const user = await getActiveUser();
  const data = readFoodItemFields(formData);
  if (!data.name) throw new Error("A food name is required.");
  await prisma.foodItem.create({ data: { userId: user.id, ...data } });
  revalidatePath("/food");
}

export async function updateFoodItem(id: string, formData: FormData) {
  const user = await getActiveUser();
  const data = readFoodItemFields(formData);
  if (!data.name) throw new Error("A food name is required.");
  const res = await prisma.foodItem.updateMany({
    where: { id, userId: user.id },
    data,
  });
  if (res.count === 0) throw new Error("Food not found.");
  revalidatePath("/food");
}

export async function deleteFoodItem(id: string) {
  const user = await getActiveUser();
  await prisma.foodItem.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/food");
}

// --- Nutrition goals (stored on the profile) ---

export async function setNutritionGoals(formData: FormData) {
  const user = await getActiveUser();
  const goal = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      calorieGoal: goal("calorieGoal"),
      proteinGoal: goal("proteinGoal"),
      carbGoal: goal("carbGoal"),
      fatGoal: goal("fatGoal"),
      fiberGoal: goal("fiberGoal"),
      sodiumGoal: goal("sodiumGoal"),
      waterGoal: goal("waterGoal"),
    },
  });
  revalidatePath("/food");
  revalidatePath("/");
}

/** Set only the calorie goal (used by the TDEE card's "Use as goal"). */
export async function applyCalorieGoal(kcal: number) {
  const user = await getActiveUser();
  const value = Math.round(kcal);
  if (!Number.isFinite(value) || value <= 0) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { calorieGoal: value },
  });
  revalidatePath("/food");
  revalidatePath("/");
}

/** Set calorie + macro goals together (used by the BMR goal wizard). */
export async function applyComputedGoals(goals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const user = await getActiveUser();
  const pos = (n: number) =>
    Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      calorieGoal: pos(goals.calories),
      proteinGoal: pos(goals.protein),
      carbGoal: pos(goals.carbs),
      fatGoal: pos(goals.fat),
    },
  });
  revalidatePath("/food");
  revalidatePath("/");
}

/** Persist the profile's height (cm) — set from the BMR wizard. */
export async function setHeightCm(cm: number) {
  const user = await getActiveUser();
  const value = Math.round(cm);
  await prisma.user.update({
    where: { id: user.id },
    data: { heightCm: Number.isFinite(value) && value > 0 ? value : null },
  });
  revalidatePath("/food");
}

// --- Recipes (a FoodItem composed of ingredients) ---

/**
 * Build a recipe's stored fields from its posted ingredients. Ingredient
 * nutrition is the TOTAL each contributes; the recipe's per-serving nutrition =
 * summed ingredients ÷ servings.
 */
function buildRecipe(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const recipeServings =
    Math.max(num(formData.get("recipeServings"), 1), 0) || 1;

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(String(formData.get("ingredients") ?? "[]"));
  } catch {
    parsed = [];
  }
  const ingredients = asRecipeIngredients(parsed);
  if (ingredients.length === 0) {
    throw new Error("Add at least one ingredient.");
  }

  const perServing = scaleNutrition(
    sumNutrition(ingredients),
    1 / recipeServings,
  );
  return {
    name,
    brand,
    servingSize: 1,
    servingUnit: "1 serving",
    source: "Recipe",
    recipeServings,
    ingredients,
    ...perServing,
  };
}

export async function saveRecipe(formData: FormData) {
  const user = await getActiveUser();
  const data = buildRecipe(formData);
  if (!data.name) throw new Error("A recipe name is required.");
  await prisma.foodItem.create({ data: { userId: user.id, ...data } });
  revalidatePath("/food");
}

export async function updateRecipe(id: string, formData: FormData) {
  const user = await getActiveUser();
  const data = buildRecipe(formData);
  if (!data.name) throw new Error("A recipe name is required.");
  const res = await prisma.foodItem.updateMany({
    where: { id, userId: user.id },
    data,
  });
  if (res.count === 0) throw new Error("Recipe not found.");
  revalidatePath("/food");
}

// --- Recents / copy-day / log-again ---

/** Re-log a past food entry onto a target day + meal (snapshot copy). */
export async function logAgain(foodLogId: string, formData: FormData) {
  const user = await getActiveUser();
  const log = await prisma.foodLog.findFirst({
    where: { id: foodLogId, userId: user.id },
  });
  if (!log) throw new Error("Food not found.");

  const date =
    parseLocalDate(String(formData.get("date") ?? "")) ?? todayLocal();
  const mealType = parseMealType(
    String(formData.get("mealType") ?? log.mealType),
  );

  await prisma.foodLog.create({
    data: {
      userId: user.id,
      date,
      mealType,
      foodItemId: log.foodItemId,
      name: log.name,
      quantity: log.quantity,
      servingUnit: log.servingUnit,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      fiber: log.fiber,
      sugar: log.sugar,
      saturatedFat: log.saturatedFat,
      sodium: log.sodium,
    },
  });
  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

/** Copy every log from one day to another (e.g. "copy yesterday"). */
export async function copyDay(formData: FormData) {
  const user = await getActiveUser();
  const from = parseLocalDate(String(formData.get("fromDate") ?? ""));
  const to =
    parseLocalDate(String(formData.get("toDate") ?? "")) ?? todayLocal();
  if (!from) throw new Error("Pick a day to copy from.");

  const logs = await prisma.foodLog.findMany({
    where: { userId: user.id, date: from },
  });
  if (logs.length === 0) throw new Error("That day has no food to copy.");

  await prisma.foodLog.createMany({
    data: logs.map((l) => ({
      userId: user.id,
      date: to,
      mealType: l.mealType,
      foodItemId: l.foodItemId,
      name: l.name,
      quantity: l.quantity,
      servingUnit: l.servingUnit,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      fiber: l.fiber,
      sugar: l.sugar,
      saturatedFat: l.saturatedFat,
      sodium: l.sodium,
    })),
  });
  revalidatePath("/food");
  revalidatePath("/");
  revalidatePath("/metrics");
}

// --- Water (a type:"water" Measurement, in mL) ---

/** Log a water amount (mL) on a given day; anchored at noon so day-bucketing is TZ-safe. */
export async function logWater(ml: number, dateStr: string) {
  const user = await getActiveUser();
  const amount = Math.round(ml);
  if (!Number.isFinite(amount) || amount === 0) return;
  const day = parseLocalDate(dateStr) ?? todayLocal();
  const recordedAt = new Date(day.getTime() + 12 * 60 * 60 * 1000);

  await prisma.measurement.create({
    data: {
      userId: user.id,
      type: "water",
      value: amount,
      unit: "mL",
      recordedAt,
    },
  });
  revalidatePath("/food");
  revalidatePath("/metrics");
}

/** Remove the most recent water entry on a day (undo for the +250 buttons). */
export async function undoLastWater(dateStr: string) {
  const user = await getActiveUser();
  const day = parseLocalDate(dateStr) ?? todayLocal();
  const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const last = await prisma.measurement.findFirst({
    where: {
      userId: user.id,
      type: "water",
      recordedAt: { gte: day, lt: next },
    },
    orderBy: { recordedAt: "desc" },
  });
  if (last) await prisma.measurement.delete({ where: { id: last.id } });
  revalidatePath("/food");
  revalidatePath("/metrics");
}

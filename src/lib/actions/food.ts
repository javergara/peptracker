"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { parseLocalDate, toDateInputValue } from "@/lib/dates";
import { scaleNutrition } from "@/lib/food";
import { parseMealType } from "@/types/food";

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
  const fiberRaw = String(formData.get("fiber") ?? "").trim();
  return {
    calories: num(formData.get("calories")),
    protein: num(formData.get("protein")),
    carbs: num(formData.get("carbs")),
    fat: num(formData.get("fat")),
    fiber: fiberRaw ? num(formData.get("fiber")) : null,
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
    },
  });
  revalidatePath("/food");
  revalidatePath("/");
}

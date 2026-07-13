"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { parseLocalDate } from "@/lib/dates";
import {
  CHECKIN_MARKER_KEYS,
  checkInRatingsSchema,
  type CheckInRatings,
} from "@/types/checkin";

/**
 * Parse a `yyyy-MM-dd` `<input type="date">` value into a **local midnight**
 * Date (matches the CheckIn schema's normalization comment + the
 * `@@unique([userId, date])` day key). Falls back to today when missing/bad.
 */
function parseCheckInDate(value: string): Date {
  const parsed = parseLocalDate(value);
  if (parsed) return parsed;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Read `rating:<key>` fields (1-5, or absent to skip that marker). */
function parseRatings(formData: FormData): CheckInRatings {
  const raw: Record<string, number> = {};
  for (const key of CHECKIN_MARKER_KEYS) {
    const value = formData.get(`rating:${key}`);
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) raw[key] = n;
  }
  return checkInRatingsSchema.parse(raw);
}

/** Side effects come in as a comma-separated field (and/or repeated fields). */
function parseSideEffects(formData: FormData): string[] {
  return formData
    .getAll("sideEffects")
    .map(String)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Create or update the active profile's check-in for a given day — one row
 * per {userId, date} (the unique constraint), so re-submitting the same date
 * edits it in place instead of creating a duplicate.
 */
export async function saveCheckIn(formData: FormData) {
  const user = await getActiveUser();
  const date = parseCheckInDate(String(formData.get("date") ?? ""));
  const ratings = parseRatings(formData);
  if (Object.keys(ratings).length === 0) {
    throw new Error("Rate at least one marker.");
  }
  const sideEffects = parseSideEffects(formData);
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.checkIn.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      ratings,
      sideEffects: sideEffects.length ? sideEffects : undefined,
      notes: notes || null,
    },
    update: {
      ratings,
      // Overwrite unconditionally (an empty array clears previously stored
      // side effects), matching updateDose's convention.
      sideEffects,
      notes: notes || null,
    },
  });

  revalidatePath("/checkin");
  revalidatePath("/");
  revalidatePath("/metrics");
}

export async function deleteCheckIn(id: string) {
  const user = await getActiveUser();
  const result = await prisma.checkIn.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Check-in not found.");

  revalidatePath("/checkin");
  revalidatePath("/");
  revalidatePath("/metrics");
}

"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export async function addMeasurement(formData: FormData) {
  const user = await getCurrentUser();
  const type = String(formData.get("type") ?? "weight");
  const label = String(formData.get("label") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const unit = String(formData.get("unit") ?? "").trim();
  const recordedAt = String(formData.get("recordedAt") ?? "");

  if (!type || Number.isNaN(value)) {
    throw new Error("Type and a numeric value are required.");
  }

  await prisma.measurement.create({
    data: {
      userId: user.id,
      type,
      label: label || null,
      value,
      unit: unit || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
  });

  revalidatePath("/metrics");
  revalidatePath("/");
}

/**
 * Correct a logged measurement's value/date (and optional label). Ownership-
 * scoped via `updateMany` + a count check so one profile can never edit
 * another's row.
 */
export async function updateMeasurement(id: string, formData: FormData) {
  const user = await getCurrentUser();
  const label = String(formData.get("label") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const recordedAt = String(formData.get("recordedAt") ?? "");

  if (Number.isNaN(value)) {
    throw new Error("A numeric value is required.");
  }

  const result = await prisma.measurement.updateMany({
    where: { id, userId: user.id },
    data: {
      value,
      label: label || null,
      ...(recordedAt ? { recordedAt: new Date(recordedAt) } : {}),
    },
  });
  if (result.count === 0) {
    throw new Error("Measurement not found.");
  }

  revalidatePath("/metrics");
  revalidatePath("/");
}

export async function deleteMeasurement(id: string) {
  const user = await getCurrentUser();
  // Ownership-scoped: only deletes when the row belongs to the active profile.
  const result = await prisma.measurement.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) {
    throw new Error("Measurement not found.");
  }
  revalidatePath("/metrics");
  revalidatePath("/");
}

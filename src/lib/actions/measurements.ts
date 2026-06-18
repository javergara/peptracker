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

export async function deleteMeasurement(id: string) {
  await prisma.measurement.delete({ where: { id } });
  revalidatePath("/metrics");
}

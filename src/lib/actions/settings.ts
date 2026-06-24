"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export async function updateUserSettings(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim() || "Me";
  const weightUnit = String(formData.get("weightUnit") ?? "kg");
  const doseUnit = String(formData.get("doseUnit") ?? "mcg");

  await prisma.user.update({
    where: { id: user.id },
    data: { name, weightUnit, doseUnit },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

/** Export all user-owned data as a JSON-serializable object (local backup). */
export async function exportUserData() {
  const user = await getCurrentUser();
  const [cycles, doseLogs, measurements, journal, customStacks] =
    await Promise.all([
      prisma.cycle.findMany({ where: { userId: user.id } }),
      prisma.doseLog.findMany({ where: { userId: user.id } }),
      prisma.measurement.findMany({ where: { userId: user.id } }),
      prisma.journalEntry.findMany({ where: { userId: user.id } }),
      prisma.stack.findMany({
        where: { userId: user.id, isPreset: false },
        include: { items: true },
      }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    user: {
      name: user.name,
      weightUnit: user.weightUnit,
      doseUnit: user.doseUnit,
    },
    cycles,
    doseLogs,
    measurements,
    journal,
    customStacks,
  };
}

type ImportPayload = {
  measurements?: {
    type: string;
    label?: string | null;
    value: number;
    unit?: string | null;
    recordedAt?: string;
  }[];
};

/** Minimal import: restores measurements (safe, additive). Extend as needed. */
export async function importUserData(json: string) {
  const user = await getCurrentUser();
  let payload: ImportPayload;
  try {
    payload = JSON.parse(json) as ImportPayload;
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const measurements = payload.measurements ?? [];
  for (const m of measurements) {
    await prisma.measurement.create({
      data: {
        userId: user.id,
        type: m.type,
        label: m.label ?? null,
        value: m.value,
        unit: m.unit ?? null,
        recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
      },
    });
  }

  revalidatePath("/metrics");
  revalidatePath("/settings");
  return measurements.length;
}

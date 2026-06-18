"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

export async function logDose(formData: FormData) {
  const peptideId = String(formData.get("peptideId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const unit = String(formData.get("unit") ?? "mcg");
  const route = String(formData.get("route") ?? "").trim();
  const site = String(formData.get("site") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!peptideId || !amount) {
    throw new Error("Peptide and amount are required.");
  }

  await prisma.doseLog.create({
    data: {
      peptideId,
      cycleId: cycleId || null,
      amount,
      unit,
      route: route || null,
      site: site || null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });

  revalidatePath("/log");
  revalidatePath("/");
  if (cycleId) revalidatePath(`/cycles/${cycleId}`);
}

export async function deleteDose(id: string) {
  const dose = await prisma.doseLog.delete({ where: { id } });
  revalidatePath("/log");
  revalidatePath("/");
  if (dose.cycleId) revalidatePath(`/cycles/${dose.cycleId}`);
}

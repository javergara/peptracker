"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

export async function logDose(formData: FormData) {
  const user = await getActiveUser();
  const peptideId = String(formData.get("peptideId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const vialId = String(formData.get("vialId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const unit = String(formData.get("unit") ?? "mcg");
  const route = String(formData.get("route") ?? "").trim();
  const site = String(formData.get("site") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const moodRaw = formData.get("mood");
  const energyRaw = formData.get("energy");
  const sideEffects = formData
    .getAll("sideEffects")
    .map(String)
    .filter(Boolean);

  if (!peptideId || !amount) {
    throw new Error("Peptide and amount are required.");
  }

  await prisma.doseLog.create({
    data: {
      userId: user.id,
      peptideId,
      cycleId: cycleId || null,
      vialId: vialId || null,
      amount,
      unit,
      route: route || null,
      site: site || null,
      mood: moodRaw != null && moodRaw !== "" ? Number(moodRaw) : null,
      energy: energyRaw != null && energyRaw !== "" ? Number(energyRaw) : null,
      sideEffects: sideEffects.length ? sideEffects : undefined,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });

  // Decrement the source vial (in mcg) and mark empty when depleted.
  if (vialId) {
    const vial = await prisma.vial.findUnique({ where: { id: vialId } });
    if (vial) {
      const usedMcg = unit === "mg" ? amount * 1000 : amount;
      const remaining = Math.max(0, vial.remainingMcg - usedMcg);
      await prisma.vial.update({
        where: { id: vialId },
        data: {
          remainingMcg: remaining,
          status: remaining <= 0 ? "empty" : "active",
        },
      });
      revalidatePath("/inventory");
    }
  }

  revalidatePath("/log");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (cycleId) revalidatePath(`/cycles/${cycleId}`);
}

export async function deleteDose(id: string) {
  const dose = await prisma.doseLog.delete({ where: { id } });
  revalidatePath("/log");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (dose.cycleId) revalidatePath(`/cycles/${dose.cycleId}`);
}

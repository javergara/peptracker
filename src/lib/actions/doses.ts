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
  const weightRaw = formData.get("weight");
  const sideEffects = formData
    .getAll("sideEffects")
    .map(String)
    .filter(Boolean);

  if (!peptideId || !amount) {
    throw new Error("Peptide and amount are required.");
  }

  const takenAtDate = takenAt ? new Date(takenAt) : new Date();

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
      takenAt: takenAtDate,
      notes: notes || null,
    },
  });

  // Optionally record bodyweight at this dose (handy for weekly GLP-1 dosing).
  // Stored as a normal weight Measurement so it flows into the Metrics charts.
  const weight = Number(weightRaw ?? 0);
  if (weightRaw != null && weightRaw !== "" && weight > 0) {
    await prisma.measurement.create({
      data: {
        userId: user.id,
        type: "weight",
        value: weight,
        unit: user.weightUnit,
        recordedAt: takenAtDate,
      },
    });
    revalidatePath("/metrics");
  }

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

/**
 * Edit an already-logged dose. Updates the recorded fields only — it does NOT
 * re-run vial decrement math, so the source vial link/balance is left as-is
 * (changing a logged amount won't retroactively adjust vial inventory).
 */
export async function updateDose(id: string, formData: FormData) {
  const user = await getActiveUser();
  const existing = await prisma.doseLog.findFirst({
    where: { id, userId: user.id },
    select: { id: true, cycleId: true },
  });
  if (!existing) throw new Error("Dose not found.");

  const peptideId = String(formData.get("peptideId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
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

  await prisma.doseLog.update({
    where: { id },
    data: {
      peptideId,
      cycleId: cycleId || null,
      amount,
      unit,
      route: route || null,
      site: site || null,
      mood: moodRaw != null && moodRaw !== "" ? Number(moodRaw) : null,
      energy: energyRaw != null && energyRaw !== "" ? Number(energyRaw) : null,
      // Overwrite (empty array clears any previously stored side effects).
      sideEffects,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });

  revalidatePath("/log");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (existing.cycleId) revalidatePath(`/cycles/${existing.cycleId}`);
  if (cycleId && cycleId !== existing.cycleId) {
    revalidatePath(`/cycles/${cycleId}`);
  }
}

export async function deleteDose(id: string) {
  const user = await getActiveUser();
  const dose = await prisma.doseLog.findFirst({
    where: { id, userId: user.id },
    select: { id: true, cycleId: true },
  });
  if (!dose) throw new Error("Dose not found.");

  await prisma.doseLog.delete({ where: { id } });
  revalidatePath("/log");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (dose.cycleId) revalidatePath(`/cycles/${dose.cycleId}`);
}

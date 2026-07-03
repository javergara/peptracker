"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { RECONSTITUTED_SHELF_LIFE_DAYS, vialConcentration } from "@/lib/vials";

/**
 * Create a vial. If bacWaterMl is provided it's treated as reconstituted now
 * (sets concentration + expiry); otherwise it's a sealed/lyophilized vial.
 */
export async function createVial(formData: FormData) {
  const user = await getActiveUser();
  const peptideId = String(formData.get("peptideId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const totalMcg = Number(formData.get("totalMcg") ?? 0);
  const bacRaw = formData.get("bacWaterMl");
  const bacWaterMl = bacRaw != null && bacRaw !== "" ? Number(bacRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!peptideId || !totalMcg || totalMcg <= 0) {
    throw new Error("Peptide and a positive total amount are required.");
  }

  const reconstituted = bacWaterMl != null && bacWaterMl > 0;
  const reconstitutedAt = reconstituted ? new Date() : null;
  const expiresAt = reconstituted
    ? new Date(Date.now() + RECONSTITUTED_SHELF_LIFE_DAYS * 86_400_000)
    : null;

  await prisma.vial.create({
    data: {
      userId: user.id,
      peptideId,
      label: label || null,
      totalMcg,
      bacWaterMl,
      concentrationMcgPerMl: vialConcentration(totalMcg, bacWaterMl),
      remainingMcg: totalMcg,
      reconstitutedAt,
      expiresAt,
      status: reconstituted ? "active" : "sealed",
      notes: notes || null,
    },
  });

  revalidatePath("/inventory");
}

/** Reconstitute a sealed vial: set diluent, concentration, expiry, status. */
export async function reconstituteVial(formData: FormData) {
  const user = await getActiveUser();
  const id = String(formData.get("id") ?? "");
  const bacWaterMl = Number(formData.get("bacWaterMl") ?? 0);
  if (!id || !bacWaterMl || bacWaterMl <= 0) {
    throw new Error("Diluent volume is required.");
  }
  // Ownership scope: only the active profile's vials are mutable.
  const vial = await prisma.vial.findFirst({
    where: { id, userId: user.id },
  });
  if (!vial) throw new Error("Vial not found.");

  await prisma.vial.update({
    where: { id },
    data: {
      bacWaterMl,
      concentrationMcgPerMl: vialConcentration(vial.totalMcg, bacWaterMl),
      reconstitutedAt: new Date(),
      expiresAt: new Date(
        Date.now() + RECONSTITUTED_SHELF_LIFE_DAYS * 86_400_000,
      ),
      status: "active",
    },
  });
  revalidatePath("/inventory");
}

/** Manually set remaining amount / status (corrections). */
export async function adjustVial(formData: FormData) {
  const user = await getActiveUser();
  const id = String(formData.get("id") ?? "");
  const remainingMcg = Number(formData.get("remainingMcg") ?? 0);
  const status = String(formData.get("status") ?? "");
  if (!id) throw new Error("Vial id required.");
  const result = await prisma.vial.updateMany({
    where: { id, userId: user.id },
    data: {
      remainingMcg: Math.max(0, remainingMcg),
      ...(status ? { status } : {}),
    },
  });
  if (result.count === 0) throw new Error("Vial not found.");
  revalidatePath("/inventory");
}

export async function deleteVial(id: string) {
  const user = await getActiveUser();
  const result = await prisma.vial.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Vial not found.");
  revalidatePath("/inventory");
}

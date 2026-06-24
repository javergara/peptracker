"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

export async function addLab(formData: FormData) {
  const user = await getActiveUser();
  const marker = String(formData.get("marker") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const unit = String(formData.get("unit") ?? "").trim();
  const refLowRaw = formData.get("refLow");
  const refHighRaw = formData.get("refHigh");
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!marker || Number.isNaN(value)) {
    throw new Error("Marker and a numeric value are required.");
  }

  await prisma.labResult.create({
    data: {
      userId: user.id,
      marker,
      value,
      unit: unit || null,
      refLow: refLowRaw != null && refLowRaw !== "" ? Number(refLowRaw) : null,
      refHigh:
        refHighRaw != null && refHighRaw !== "" ? Number(refHighRaw) : null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });
  revalidatePath("/labs");
}

export async function deleteLab(id: string) {
  await prisma.labResult.delete({ where: { id } });
  revalidatePath("/labs");
}

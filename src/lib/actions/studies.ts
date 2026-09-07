"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { studyInputSchema } from "@/types/study";

function parseStudyForm(formData: FormData) {
  const parsed = studyInputSchema.parse({
    name: formData.get("name") ?? "",
    modality: formData.get("modality") ?? undefined,
    status: formData.get("status") ?? undefined,
    bodyRegion: formData.get("bodyRegion") ?? "",
    performedAt: formData.get("performedAt") ?? undefined,
    followUpAt: formData.get("followUpAt") ?? undefined,
    findings: formData.get("findings") ?? "",
    impression: formData.get("impression") ?? "",
    notes: formData.get("notes") ?? "",
  });
  return {
    name: parsed.name,
    modality: parsed.modality,
    status: parsed.status,
    bodyRegion: parsed.bodyRegion ?? null,
    performedAt: parsed.performedAt ?? null,
    followUpAt: parsed.followUpAt ?? null,
    findings: parsed.findings ?? null,
    impression: parsed.impression ?? null,
    notes: parsed.notes ?? null,
  };
}

export async function createStudy(formData: FormData) {
  const user = await getActiveUser();
  await prisma.imagingStudy.create({
    data: { userId: user.id, ...parseStudyForm(formData) },
  });
  revalidatePath("/studies");
}

export async function updateStudy(id: string, formData: FormData) {
  const user = await getActiveUser();
  const result = await prisma.imagingStudy.updateMany({
    where: { id, userId: user.id },
    data: parseStudyForm(formData),
  });
  if (result.count === 0) throw new Error("Study not found.");
  revalidatePath("/studies");
}

export async function deleteStudy(id: string) {
  const user = await getActiveUser();
  const result = await prisma.imagingStudy.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Study not found.");
  revalidatePath("/studies");
}

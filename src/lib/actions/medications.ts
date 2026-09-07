"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getActiveUser } from "@/lib/active-user";
import {
  doseChangeInputSchema,
  medicationInputSchema,
} from "@/types/medication";

/**
 * Collect a repeatable/multi-value form field into a clean string[] — accepts
 * either multiple same-named inputs (`getAll`) or a single comma-separated value.
 */
function parseSlugList(formData: FormData, name: string): string[] {
  const raw = formData.getAll(name).map(String);
  const cleaned = raw
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function parseMedicationForm(formData: FormData) {
  const parsed = medicationInputSchema.parse({
    name: formData.get("name") ?? "",
    code: formData.get("code") ?? "",
    status: formData.get("status") ?? undefined,
    startDate: formData.get("startDate") ?? undefined,
    notes: formData.get("notes") ?? "",
    biomarkerSlugs: parseSlugList(formData, "biomarkerSlugs"),
  });
  return {
    name: parsed.name,
    code: parsed.code ?? null,
    status: parsed.status,
    startDate: parsed.startDate ?? null,
    notes: parsed.notes ?? null,
    // Empty array -> SQL NULL so clearing the field clears the column on update.
    biomarkerSlugs: parsed.biomarkerSlugs?.length
      ? parsed.biomarkerSlugs
      : Prisma.DbNull,
  };
}

export async function createMedication(formData: FormData) {
  const user = await getActiveUser();
  const data = parseMedicationForm(formData);

  // An optional initial dose creates the first dose-change in the same write.
  const rawDose = String(formData.get("dose") ?? "").trim();
  const initialDose = rawDose
    ? doseChangeInputSchema.parse({
        dose: rawDose,
        reason: formData.get("reason") ?? "",
        effectiveAt:
          String(formData.get("effectiveAt") ?? "").trim() ||
          (data.startDate ?? new Date()).toISOString(),
      })
    : null;

  await prisma.medication.create({
    data: {
      userId: user.id,
      ...data,
      changes: initialDose
        ? {
            create: {
              userId: user.id,
              dose: initialDose.dose,
              reason: initialDose.reason ?? null,
              effectiveAt: initialDose.effectiveAt,
            },
          }
        : undefined,
    },
  });
  revalidatePath("/medications");
}

export async function updateMedication(id: string, formData: FormData) {
  const user = await getActiveUser();
  const result = await prisma.medication.updateMany({
    where: { id, userId: user.id },
    data: parseMedicationForm(formData),
  });
  if (result.count === 0) throw new Error("Medication not found.");
  revalidatePath("/medications");
}

export async function deleteMedication(id: string) {
  const user = await getActiveUser();
  // Cascade removes this medication's dose changes.
  const result = await prisma.medication.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Medication not found.");
  revalidatePath("/medications");
}

export async function addDoseChange(medicationId: string, formData: FormData) {
  const user = await getActiveUser();
  // Ownership: the medication must belong to the active profile.
  const med = await prisma.medication.findFirst({
    where: { id: medicationId, userId: user.id },
    select: { id: true },
  });
  if (!med) throw new Error("Medication not found.");

  const parsed = doseChangeInputSchema.parse({
    dose: formData.get("dose") ?? "",
    reason: formData.get("reason") ?? "",
    effectiveAt: formData.get("effectiveAt") ?? "",
  });
  await prisma.medicationDoseChange.create({
    data: {
      userId: user.id,
      medicationId: med.id,
      dose: parsed.dose,
      reason: parsed.reason ?? null,
      effectiveAt: parsed.effectiveAt,
    },
  });
  revalidatePath("/medications");
}

export async function deleteDoseChange(id: string) {
  const user = await getActiveUser();
  const result = await prisma.medicationDoseChange.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Dose change not found.");
  revalidatePath("/medications");
}

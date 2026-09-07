"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getActiveUser } from "@/lib/active-user";
import {
  conditionInputSchema,
  familyHistoryInputSchema,
} from "@/types/health-profile";

/**
 * Collect a repeatable/multi-value form field into a clean string[] — accepts
 * either multiple same-named inputs (`getAll`) or a single comma-separated value.
 */
function parseSlugList(formData: FormData, name: string): string[] {
  const raw = formData.getAll(name).map(String);
  const flattened = raw.flatMap((v) => v.split(","));
  const cleaned = flattened.map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

function parseConditionForm(formData: FormData) {
  const parsed = conditionInputSchema.parse({
    name: formData.get("name") ?? "",
    code: formData.get("code") ?? "",
    status: formData.get("status") ?? undefined,
    system: formData.get("system") ?? "",
    onsetDate: formData.get("onsetDate") ?? undefined,
    notes: formData.get("notes") ?? "",
    biomarkerSlugs: parseSlugList(formData, "biomarkerSlugs"),
    relatedPeptides: parseSlugList(formData, "relatedPeptides"),
  });
  // Store empty arrays as null (Json?) so unset stays unset.
  return {
    name: parsed.name,
    code: parsed.code ?? null,
    status: parsed.status,
    system: parsed.system ?? null,
    onsetDate: parsed.onsetDate ?? null,
    notes: parsed.notes ?? null,
    biomarkerSlugs: parsed.biomarkerSlugs?.length
      ? parsed.biomarkerSlugs
      : Prisma.DbNull,
    relatedPeptides: parsed.relatedPeptides?.length
      ? parsed.relatedPeptides
      : Prisma.DbNull,
  };
}

export async function createCondition(formData: FormData) {
  const user = await getActiveUser();
  await prisma.condition.create({
    data: { userId: user.id, ...parseConditionForm(formData) },
  });
  revalidatePath("/health");
}

export async function updateCondition(id: string, formData: FormData) {
  const user = await getActiveUser();
  const result = await prisma.condition.updateMany({
    where: { id, userId: user.id },
    data: parseConditionForm(formData),
  });
  if (result.count === 0) throw new Error("Condition not found.");
  revalidatePath("/health");
}

export async function deleteCondition(id: string) {
  const user = await getActiveUser();
  const result = await prisma.condition.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Condition not found.");
  revalidatePath("/health");
}

function parseFamilyForm(formData: FormData) {
  const parsed = familyHistoryInputSchema.parse({
    relative: formData.get("relative") ?? undefined,
    condition: formData.get("condition") ?? "",
    notes: formData.get("notes") ?? "",
  });
  return {
    relative: parsed.relative,
    condition: parsed.condition,
    notes: parsed.notes ?? null,
  };
}

export async function createFamilyHistory(formData: FormData) {
  const user = await getActiveUser();
  await prisma.familyHistoryEntry.create({
    data: { userId: user.id, ...parseFamilyForm(formData) },
  });
  revalidatePath("/health");
}

export async function updateFamilyHistory(id: string, formData: FormData) {
  const user = await getActiveUser();
  const result = await prisma.familyHistoryEntry.updateMany({
    where: { id, userId: user.id },
    data: parseFamilyForm(formData),
  });
  if (result.count === 0) throw new Error("Family history entry not found.");
  revalidatePath("/health");
}

export async function deleteFamilyHistory(id: string) {
  const user = await getActiveUser();
  const result = await prisma.familyHistoryEntry.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Family history entry not found.");
  revalidatePath("/health");
}

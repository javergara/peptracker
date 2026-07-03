"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import {
  ageFromBirthYear,
  asRefRanges,
  resolveRange,
  type ResolvedRange,
} from "@/types/biomarker";

/**
 * Resolve the profile-appropriate unit + reference range for a biomarker, so
 * lab entry can auto-fill and snapshot them onto the row. Returns nulls when the
 * marker isn't in the catalog.
 */
async function resolveForBiomarker(
  slug: string,
  sex: string | null,
  birthYear: number | null,
): Promise<{ name: string; unit: string; range: ResolvedRange | null } | null> {
  const bm = await prisma.biomarker.findUnique({ where: { slug } });
  if (!bm) return null;
  const range = resolveRange(asRefRanges(bm.ranges), {
    sex,
    age: ageFromBirthYear(birthYear),
  });
  return { name: bm.name, unit: range?.unit ?? bm.unit, range };
}

export async function addLab(formData: FormData) {
  const user = await getActiveUser();
  const biomarkerSlug = String(formData.get("biomarkerSlug") ?? "").trim();
  let marker = String(formData.get("marker") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  let unit = String(formData.get("unit") ?? "").trim();
  const refLowRaw = formData.get("refLow");
  const refHighRaw = formData.get("refHigh");
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  let refLow = refLowRaw != null && refLowRaw !== "" ? Number(refLowRaw) : null;
  let refHigh =
    refHighRaw != null && refHighRaw !== "" ? Number(refHighRaw) : null;

  // When linked to the catalog, auto-fill name/unit/range (range snapshotted so
  // flags stay stable even if the catalog later changes).
  if (biomarkerSlug) {
    const resolved = await resolveForBiomarker(
      biomarkerSlug,
      user.sex,
      user.birthYear,
    );
    if (resolved) {
      if (!marker) marker = resolved.name;
      if (!unit) unit = resolved.unit;
      if (refLow === null && refHigh === null && resolved.range) {
        refLow = resolved.range.low ?? null;
        refHigh = resolved.range.high ?? null;
      }
    }
  }

  if (!marker || Number.isNaN(value)) {
    throw new Error("Marker and a numeric value are required.");
  }

  await prisma.labResult.create({
    data: {
      userId: user.id,
      marker,
      biomarkerSlug: biomarkerSlug || null,
      value,
      unit: unit || null,
      refLow,
      refHigh,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });
  revalidatePath("/labs");
  if (biomarkerSlug) revalidatePath(`/biomarkers/${biomarkerSlug}`);
}

/**
 * Log a whole panel: one date, many catalog markers entered together. The form
 * submits parallel `slug[]` + `value[]` fields; empty values are skipped. Each
 * row auto-fills unit + range from the catalog for the active profile.
 */
export async function addLabPanel(formData: FormData) {
  const user = await getActiveUser();
  const takenAtRaw = String(formData.get("takenAt") ?? "");
  const takenAt = takenAtRaw ? new Date(takenAtRaw) : new Date();
  const notes = String(formData.get("notes") ?? "").trim();

  const slugs = formData.getAll("slug").map((s) => String(s));
  const values = formData.getAll("value").map((v) => String(v));

  const age = ageFromBirthYear(user.birthYear);
  const rows: {
    marker: string;
    biomarkerSlug: string;
    value: number;
    unit: string | null;
    refLow: number | null;
    refHigh: number | null;
  }[] = [];

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]?.trim();
    const raw = values[i];
    if (!slug || raw == null || raw === "") continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;

    const bm = await prisma.biomarker.findUnique({ where: { slug } });
    if (!bm) continue;
    const range = resolveRange(asRefRanges(bm.ranges), { sex: user.sex, age });
    rows.push({
      marker: bm.name,
      biomarkerSlug: slug,
      value,
      unit: range?.unit ?? bm.unit,
      refLow: range?.low ?? null,
      refHigh: range?.high ?? null,
    });
  }

  if (rows.length === 0) {
    throw new Error("Enter a value for at least one marker.");
  }

  await prisma.labResult.createMany({
    data: rows.map((r) => ({
      userId: user.id,
      takenAt,
      notes: notes || null,
      ...r,
    })),
  });
  revalidatePath("/labs");
}

/**
 * Correct a logged result's value/date/notes. Reference ranges are
 * snapshotted at entry by design (so flags stay stable even if the catalog
 * range later changes) — this intentionally does NOT recompute refLow/refHigh,
 * marker name, unit, or biomarkerSlug.
 */
export async function updateLab(id: string, formData: FormData) {
  const user = await getActiveUser();
  const value = Number(formData.get("value") ?? 0);
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (Number.isNaN(value)) {
    throw new Error("A numeric value is required.");
  }

  const existing = await prisma.labResult.findFirst({
    where: { id, userId: user.id },
    select: { biomarkerSlug: true },
  });
  if (!existing) {
    throw new Error("Lab result not found.");
  }

  const result = await prisma.labResult.updateMany({
    where: { id, userId: user.id },
    data: {
      value,
      notes: notes || null,
      ...(takenAt ? { takenAt: new Date(takenAt) } : {}),
    },
  });
  if (result.count === 0) {
    throw new Error("Lab result not found.");
  }

  revalidatePath("/labs");
  if (existing.biomarkerSlug)
    revalidatePath(`/biomarkers/${existing.biomarkerSlug}`);
}

export async function deleteLab(id: string) {
  const user = await getActiveUser();
  // Ownership-scoped: only deletes when the row belongs to the active profile.
  await prisma.labResult.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/labs");
}

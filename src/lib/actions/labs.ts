"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import {
  ageFromBirthYear,
  asRefRanges,
  asQualitativeOptions,
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
 * Log a QUALITATIVE (categorical) result — e.g. an infectious serology whose
 * outcome is reactive / non-reactive rather than a number. The biomarker must be
 * a catalog entry with `valueType: "qualitative"`; the chosen result must be one
 * of its `qualitativeOptions.options`. Numeric `value` stores a 0 placeholder
 * (the column is non-null) and the real result lives in `qualitativeValue`.
 */
export async function addQualitativeLab(formData: FormData) {
  const user = await getActiveUser();
  const biomarkerSlug = String(formData.get("biomarkerSlug") ?? "").trim();
  const result = String(formData.get("qualitativeValue") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!biomarkerSlug) {
    throw new Error("Choose a serology marker.");
  }
  const bm = await prisma.biomarker.findUnique({
    where: { slug: biomarkerSlug },
  });
  if (!bm || bm.valueType !== "qualitative") {
    throw new Error("That marker isn't a qualitative serology.");
  }
  const options = asQualitativeOptions(bm.qualitativeOptions);
  if (!options) {
    throw new Error("This marker is missing its result options.");
  }
  const valid = options.options.some(
    (o) => o.trim().toLowerCase() === result.trim().toLowerCase(),
  );
  if (!result || !valid) {
    throw new Error("Choose a valid result.");
  }

  await prisma.labResult.create({
    data: {
      userId: user.id,
      marker: bm.name,
      biomarkerSlug,
      value: 0,
      qualitativeValue: result,
      unit: bm.unit || null,
      refLow: null,
      refHigh: null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
  });
  revalidatePath("/labs");
  revalidatePath(`/biomarkers/${biomarkerSlug}`);
}

/**
 * Bulk-import parsed lab rows (from the PDF-import review table). The client
 * sends a JSON `rows` payload it already let the user review + edit; each row is
 * a numeric result with an optional catalog link + per-row date. Ownership is
 * stamped here; ranges are snapshotted (provided values win, else resolved from
 * the catalog for the active profile).
 */
export async function importLabResults(formData: FormData) {
  const user = await getActiveUser();
  const raw = String(formData.get("rows") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not read the reviewed rows.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Add at least one row to import.");
  }

  const age = ageFromBirthYear(user.birthYear);
  const data: {
    userId: string;
    marker: string;
    biomarkerSlug: string | null;
    value: number;
    unit: string | null;
    refLow: number | null;
    refHigh: number | null;
    takenAt: Date;
    notes: string | null;
  }[] = [];

  for (const item of parsed as Record<string, unknown>[]) {
    const marker = String(item.marker ?? "").trim();
    const value = Number(item.value);
    if (!marker || Number.isNaN(value)) continue;

    const slug = String(item.biomarkerSlug ?? "").trim() || null;
    let unit = String(item.unit ?? "").trim() || null;
    let refLow =
      item.refLow != null && item.refLow !== "" ? Number(item.refLow) : null;
    let refHigh =
      item.refHigh != null && item.refHigh !== "" ? Number(item.refHigh) : null;
    if (refLow != null && Number.isNaN(refLow)) refLow = null;
    if (refHigh != null && Number.isNaN(refHigh)) refHigh = null;

    // Snapshot from catalog when linked and the row didn't carry a range/unit.
    let markerName = marker;
    if (slug) {
      const bm = await prisma.biomarker.findUnique({ where: { slug } });
      if (bm) {
        const range = resolveRange(asRefRanges(bm.ranges), {
          sex: user.sex,
          age,
        });
        markerName = bm.name;
        if (!unit) unit = range?.unit ?? bm.unit ?? null;
        if (refLow === null && refHigh === null && range) {
          refLow = range.low ?? null;
          refHigh = range.high ?? null;
        }
      }
    }

    const takenAtRaw = String(item.takenAt ?? "");
    const takenAt = takenAtRaw ? new Date(takenAtRaw) : new Date();
    if (Number.isNaN(takenAt.getTime())) continue;

    data.push({
      userId: user.id,
      marker: markerName,
      biomarkerSlug: slug,
      value,
      unit,
      refLow,
      refHigh,
      takenAt,
      notes: null,
    });
  }

  if (data.length === 0) {
    throw new Error("No valid rows to import.");
  }

  await prisma.labResult.createMany({ data });
  revalidatePath("/labs");
  revalidatePath("/metrics");
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

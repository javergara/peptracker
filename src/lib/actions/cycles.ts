"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";
import { protocolLabel } from "@/lib/titration";
import { parseLocalDate } from "@/lib/dates";
import { asDosage } from "@/types/peptide";

export type CycleStatusValue = "planned" | "active" | "paused" | "completed";

/**
 * Parse the shared cycle form fields (used by create + update). Titration
 * (`titrationLabel`) is single-peptide only: validated against the source
 * peptide's `dosage.protocols` so a stale/tampered label can't be stored.
 */
async function parseCycleForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const source = String(formData.get("source") ?? ""); // "peptide:<id>" | "stack:<id>"
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const status = (String(formData.get("status") ?? "active") ||
    "active") as CycleStatusValue;
  const frequency = String(formData.get("frequency") ?? "daily");
  const dosePerAdmin = Number(formData.get("dosePerAdmin") ?? 0);
  const unit = String(formData.get("unit") ?? "mcg");
  const titrationLabelRaw = String(formData.get("titrationLabel") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const washoutDaysRaw = formData.get("washoutDays");
  const washoutDaysNum =
    washoutDaysRaw != null && washoutDaysRaw !== ""
      ? Number(washoutDaysRaw)
      : null;
  const washoutDays =
    washoutDaysNum != null && Number.isFinite(washoutDaysNum)
      ? Math.max(0, Math.round(washoutDaysNum))
      : null;

  const timesPerDayRaw = Number(formData.get("timesPerDay") ?? 1);
  const timesPerDay =
    Number.isFinite(timesPerDayRaw) && timesPerDayRaw >= 1
      ? Math.min(6, Math.round(timesPerDayRaw))
      : 1;
  const daysOfWeek = [
    ...new Set(formData.getAll("daysOfWeek").map((v) => Number(v))),
  ]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  if (!name || !startDate) {
    throw new Error("Name and start date are required.");
  }
  // These frequencies schedule doses only on explicitly picked weekdays —
  // without any, the cycle would silently never fire (isDoseDay = false).
  if (
    (frequency === "twice-weekly" || frequency === "custom") &&
    daysOfWeek.length === 0
  ) {
    throw new Error("Pick at least one day of the week for this frequency.");
  }

  const [kind, id] = source.split(":");

  const schedule = {
    frequency,
    timesPerDay,
    ...(daysOfWeek.length > 0 ? { daysOfWeek } : {}),
  };

  // Titration is single-peptide only. Re-validate the submitted label against
  // the peptide's own `dosage.protocols` (never trust the client) — an
  // unmatched/tampered/stale label is silently dropped (falls back to the
  // fixed dose).
  let titration: { label: string } | undefined;
  if (kind === "peptide" && id && titrationLabelRaw) {
    const peptide = await prisma.peptide.findUnique({ where: { id } });
    const protocols = peptide
      ? (asDosage(peptide.dosage)?.protocols ?? [])
      : [];
    const match = protocols.find(
      (proto, i) => protocolLabel(proto, i) === titrationLabelRaw,
    );
    if (match) titration = { label: titrationLabelRaw };
  }

  // Stack cycles carry a per-peptide dose (different peptides, different doses),
  // submitted as `itemDose:<peptideId>` / `itemUnit:<peptideId>`. Single-peptide
  // cycles keep the one `dosePerAdmin`/`unit`, plus an optional `titration`.
  const scheduleConfig =
    kind === "stack"
      ? { ...schedule, items: parseStackItems(formData) }
      : {
          ...schedule,
          dosePerAdmin,
          unit,
          ...(titration ? { titration } : {}),
        };

  return {
    name,
    // Parse form dates as LOCAL midnight (not UTC) so weekday anchoring and
    // range membership line up with the user's calendar, not the server's TZ.
    startDate: parseLocalDate(startDate) ?? new Date(),
    endDate: parseLocalDate(endDate),
    status,
    peptideId: kind === "peptide" ? id : null,
    stackId: kind === "stack" ? id : null,
    scheduleConfig,
    washoutDays,
    notes: notes || null,
  };
}

/**
 * Collect per-peptide config for a stack cycle. Beyond dose/unit
 * (`itemDose:<id>` / `itemUnit:<id>`), each peptide may override the cycle's
 * schedule via `itemFreq:<id>`, `itemDays:<id>` (repeated), `itemTimesPerDay:<id>`,
 * `itemStart:<id>`, `itemEnd:<id>`. Only fields that actually differ (or are
 * present) are stored, so the Json stays lean and untouched peptides just inherit
 * the cycle-level schedule.
 */
function parseStackItems(formData: FormData) {
  type Item = {
    peptideId: string;
    dose?: number;
    unit?: string;
    frequency?: string;
    daysOfWeek?: number[];
    timesPerDay?: number;
    startDate?: string;
    endDate?: string;
  };
  const items: Item[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("itemDose:")) continue;
    const peptideId = key.slice("itemDose:".length);
    if (!peptideId) continue;

    const dose = Number(value);
    const unit = String(formData.get(`itemUnit:${peptideId}`) ?? "mcg");

    const item: Item = {
      peptideId,
      dose: Number.isFinite(dose) && dose > 0 ? dose : undefined,
      unit,
    };

    // Optional per-peptide schedule override. "inherit" / empty => not stored.
    const freqRaw = String(formData.get(`itemFreq:${peptideId}`) ?? "").trim();
    if (freqRaw && freqRaw !== "inherit") {
      item.frequency = freqRaw;
      const days = [
        ...new Set(
          formData.getAll(`itemDays:${peptideId}`).map((v) => Number(v)),
        ),
      ]
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        .sort((a, b) => a - b);
      if (freqRaw === "twice-weekly" || freqRaw === "custom") {
        if (days.length === 0) {
          throw new Error(
            "Pick at least one day for each per-peptide custom frequency.",
          );
        }
        item.daysOfWeek = days;
      } else if (days.length > 0) {
        item.daysOfWeek = days;
      }
    }

    const tpdRaw = formData.get(`itemTimesPerDay:${peptideId}`);
    if (tpdRaw != null && tpdRaw !== "") {
      const tpd = Number(tpdRaw);
      if (Number.isFinite(tpd) && tpd >= 1)
        item.timesPerDay = Math.min(6, Math.round(tpd));
    }

    const startRaw = String(
      formData.get(`itemStart:${peptideId}`) ?? "",
    ).trim();
    if (startRaw) item.startDate = startRaw;
    const endRaw = String(formData.get(`itemEnd:${peptideId}`) ?? "").trim();
    if (endRaw) item.endDate = endRaw;

    items.push(item);
  }
  return items;
}

export async function createCycle(formData: FormData) {
  const user = await getCurrentUser();
  const cycle = await prisma.cycle.create({
    data: { userId: user.id, ...(await parseCycleForm(formData)) },
  });
  revalidatePath("/cycles");
  revalidatePath("/");
  return cycle.id;
}

export async function updateCycle(id: string, formData: FormData) {
  const user = await getCurrentUser();
  // Ownership check: only the active profile's cycles are editable.
  const owned = await prisma.cycle.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) throw new Error("Cycle not found.");

  await prisma.cycle.update({
    where: { id },
    data: await parseCycleForm(formData),
  });
  revalidatePath("/cycles");
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/");
}

export async function updateCycleStatus(id: string, status: CycleStatusValue) {
  const user = await getCurrentUser();
  const result = await prisma.cycle.updateMany({
    where: { id, userId: user.id },
    data: { status },
  });
  if (result.count === 0) throw new Error("Cycle not found.");
  revalidatePath("/cycles");
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/");
}

export async function deleteCycle(id: string) {
  const user = await getCurrentUser();
  const result = await prisma.cycle.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Cycle not found.");
  revalidatePath("/cycles");
  revalidatePath("/");
}

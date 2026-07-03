"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import { RECONSTITUTED_SHELF_LIFE_DAYS, vialConcentration } from "@/lib/vials";

/**
 * Stock reserve actions. All ownership-scoped to the active profile. Stock is a
 * quantity of unopened vials per peptide (see prisma StockItem); activating one
 * reconstitutes a vial into an active `Vial` usable when logging.
 */

/**
 * Add unopened vials to the reserve. Upserts by (peptide, vial size): an
 * existing matching row gets its quantity bumped and dose/frequency refreshed,
 * so the reserve reads as a single "×N vials" row per peptide + size.
 */
export async function addStock(formData: FormData) {
  const user = await getActiveUser();
  const peptideId = String(formData.get("peptideId") ?? "");
  const vialMg = Number(formData.get("vialMg") ?? 0);
  const quantity = Math.max(
    1,
    Math.floor(Number(formData.get("quantity") ?? 1)),
  );
  const doseRaw = formData.get("dose");
  const dose = doseRaw != null && doseRaw !== "" ? Number(doseRaw) : null;
  const doseUnit = String(formData.get("doseUnit") ?? "mcg");
  const frequency = String(formData.get("frequency") ?? "daily");
  const priceRaw = formData.get("price");
  const price = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!peptideId || !vialMg || vialMg <= 0) {
    throw new Error("Peptide and a positive vial size are required.");
  }
  const vialMcg = vialMg * 1000;

  const existing = await prisma.stockItem.findFirst({
    where: { userId: user.id, peptideId, vialMcg },
  });

  if (existing) {
    await prisma.stockItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + quantity,
        dose,
        doseUnit,
        frequency,
        price: price != null && price >= 0 ? price : null,
        notes: notes || null,
      },
    });
  } else {
    await prisma.stockItem.create({
      data: {
        userId: user.id,
        peptideId,
        vialMcg,
        quantity,
        dose,
        doseUnit,
        frequency,
        price: price != null && price >= 0 ? price : null,
        notes: notes || null,
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/");
}

/** Edit a stock item's planned dose / frequency / quantity / vial size. */
export async function updateStock(id: string, formData: FormData) {
  const user = await getActiveUser();
  const owned = await prisma.stockItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) throw new Error("Stock item not found.");

  const vialMg = Number(formData.get("vialMg") ?? 0);
  const quantity = Math.max(
    0,
    Math.floor(Number(formData.get("quantity") ?? 0)),
  );
  const doseRaw = formData.get("dose");
  const dose = doseRaw != null && doseRaw !== "" ? Number(doseRaw) : null;
  const doseUnit = String(formData.get("doseUnit") ?? "mcg");
  const frequency = String(formData.get("frequency") ?? "daily");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.stockItem.update({
    where: { id },
    data: {
      ...(vialMg > 0 ? { vialMcg: vialMg * 1000 } : {}),
      quantity,
      dose,
      doseUnit,
      frequency,
      notes: notes || null,
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

/** Nudge quantity up/down (± buttons). Clamped to ≥ 0. */
export async function adjustStockQuantity(id: string, delta: number) {
  const user = await getActiveUser();
  const item = await prisma.stockItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true, quantity: true },
  });
  if (!item) throw new Error("Stock item not found.");

  await prisma.stockItem.update({
    where: { id },
    data: { quantity: Math.max(0, item.quantity + delta) },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function deleteStock(id: string) {
  const user = await getActiveUser();
  const result = await prisma.stockItem.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Stock item not found.");
  revalidatePath("/inventory");
  revalidatePath("/");
}

/**
 * Activate one vial from the reserve: decrement the stock quantity and create an
 * active, reconstituted `Vial` (usable when logging). Reuses the vial
 * concentration + shelf-life helpers.
 */
export async function activateStock(formData: FormData) {
  const user = await getActiveUser();
  const stockId = String(formData.get("stockId") ?? "");
  const bacWaterMl = Number(formData.get("bacWaterMl") ?? 0);
  if (!bacWaterMl || bacWaterMl <= 0) {
    throw new Error("Diluent volume is required.");
  }

  const item = await prisma.stockItem.findFirst({
    where: { id: stockId, userId: user.id },
    include: { peptide: { select: { name: true } } },
  });
  if (!item) throw new Error("Stock item not found.");
  if (item.quantity <= 0)
    throw new Error("No vials left in stock to activate.");

  const now = new Date();
  await prisma.$transaction([
    prisma.stockItem.update({
      where: { id: item.id },
      data: { quantity: item.quantity - 1 },
    }),
    prisma.vial.create({
      data: {
        userId: user.id,
        peptideId: item.peptideId,
        label: item.peptide.name,
        totalMcg: item.vialMcg,
        bacWaterMl,
        concentrationMcgPerMl: vialConcentration(item.vialMcg, bacWaterMl),
        remainingMcg: item.vialMcg,
        reconstitutedAt: now,
        expiresAt: new Date(
          now.getTime() + RECONSTITUTED_SHELF_LIFE_DAYS * 86_400_000,
        ),
        status: "active",
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/");
}

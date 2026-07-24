/**
 * Seed the database from the researched, cited peptide JSON in prisma/data/.
 * Idempotent: re-running upserts peptides, rebuilds peptide<->peptide
 * interactions, the default user, and preset stacks.
 *
 * Run via: npm run db:seed  (or automatically after `prisma migrate dev`)
 */
import "dotenv/config";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import ws from "ws";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

// Seed/migrate prefer a direct (unpooled) connection.
const DATABASE_URL =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Demo login for local dev / the seeded household. Override via env in prod.
const DEMO_EMAIL = process.env.SEED_ACCOUNT_EMAIL ?? "local@peptides.app";
const DEMO_PASSWORD = process.env.SEED_ACCOUNT_PASSWORD ?? "peptides123";

type RawInteraction = { with: string; kind: string; note: string };
type RawPeptide = {
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  summary: string;
  mechanism: string;
  benefits: string[];
  risks: string[];
  sideEffects: string[];
  dosage: Record<string, unknown>;
  route: string;
  frequency: string;
  halfLife: string;
  halfLifeHours?: number;
  cycleLength: string;
  reconstitution: Record<string, unknown>;
  storage: string;
  contraindications: string[];
  interactions: RawInteraction[];
  references: { title: string; url: string }[];
  tags: string[];
  status: string;
};

function loadPeptides(): RawPeptide[] {
  const dir = path.join(process.cwd(), "prisma", "data");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as RawPeptide,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

type RawBiomarker = {
  slug: string;
  name: string;
  aliases: string[];
  system: string;
  unit: string;
  summary: string;
  whatItMeans: string;
  raises: string[];
  lowers: string[];
  confounders: string[];
  relatedPeptides: string[];
  ranges: Record<string, unknown>[];
  references: { title: string; url: string }[];
  direction?: string;
};

function loadBiomarkers(): RawBiomarker[] {
  const dir = path.join(process.cwd(), "prisma", "data", "biomarkers");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(readFileSync(path.join(dir, f), "utf8")) as RawBiomarker,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Preset stacks (curated). Each item references a peptide by slug.
const PRESET_STACKS = [
  {
    slug: "wolverine",
    name: "Wolverine Stack",
    goal: "Recovery & injury repair",
    description:
      "The classic healing combo: BPC-157 builds the repair infrastructure (angiogenesis, growth factors, collagen) while TB-500 mobilizes and migrates repair cells into the injured tissue. Overlapping but distinct pathways make them a popular synergistic pair for soft-tissue recovery.",
    tags: ["recovery-injury"],
    items: [
      { peptide: "bpc-157", timing: "AM/PM" },
      { peptide: "tb-500", timing: "Weekly loading" },
    ],
  },
  {
    slug: "metabolic-fat-loss",
    name: "Metabolic Fat-Loss Stack",
    goal: "Fat loss & metabolic health",
    description:
      "A metabolic pairing combining a potent incretin agonist with a mitochondrial regulator for additive fat-loss and glucose-lowering effects. Use with caution alongside insulin/sulfonylureas due to hypoglycemia risk.",
    tags: ["fat-loss", "metabolic"],
    items: [
      { peptide: "retatrutide", timing: "Weekly" },
      { peptide: "mots-c", timing: "2-3x weekly" },
    ],
  },
  {
    slug: "neuro-focus",
    name: "Neuro Focus & Calm Stack",
    goal: "Cognition & mood",
    description:
      "The classic Russian nootropic pairing: Selank's calming, anxiolytic action balances Semax's stimulating, BDNF-driven focus effects for clear-headed cognition without the edge.",
    tags: ["cognition-mood"],
    items: [
      { peptide: "semax", timing: "AM" },
      { peptide: "selank", timing: "AM/midday" },
    ],
  },
  {
    slug: "gh-axis",
    name: "GH-Axis Stack (CJC-1295 + Ipamorelin)",
    goal: "Growth hormone axis support",
    description:
      "The canonical GHRH + GHRP pairing: CJC-1295 (a GHRH analog) raises the baseline of growth-hormone release while Ipamorelin (a selective ghrelin/GH-secretagogue agonist) drives a clean, selective GH pulse with minimal cortisol or prolactin. Together they produce a larger, more physiological pulse than either alone — typically dosed before bed on an empty stomach.",
    tags: ["gh-axis", "muscle-growth", "recovery-injury"],
    items: [
      { peptide: "cjc-1295", timing: "PM (pre-sleep)" },
      { peptide: "ipamorelin", timing: "PM (pre-sleep)" },
    ],
  },
];

async function main() {
  const peptides = loadPeptides();
  console.log(`Loaded ${peptides.length} peptide records from prisma/data/`);

  // 1) Demo login account that owns the demo household profiles.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const account = await prisma.account.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, name: "Demo Household", passwordHash },
  });

  // Default profiles (multi-profile demo: "Me" + "Partner"), owned by the account.
  const user = await prisma.user.upsert({
    where: { email: "local@peptides.app" },
    update: { color: "#6366f1", accountId: account.id },
    create: {
      name: "Me",
      email: "local@peptides.app",
      color: "#6366f1",
      accountId: account.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "partner@peptides.app" },
    update: { color: "#A855F7", accountId: account.id },
    create: {
      name: "Partner",
      email: "partner@peptides.app",
      color: "#A855F7",
      accountId: account.id,
    },
  });

  // 2) Upsert peptides.
  for (const p of peptides) {
    const data = {
      name: p.name,
      aliases: p.aliases ?? [],
      category: p.category,
      summary: p.summary,
      mechanism: p.mechanism,
      benefits: p.benefits ?? [],
      risks: p.risks ?? [],
      sideEffects: p.sideEffects ?? [],
      dosage: (p.dosage ?? {}) as object,
      route: p.route,
      frequency: p.frequency,
      halfLife: p.halfLife,
      halfLifeHours: p.halfLifeHours ?? null,
      cycleLength: p.cycleLength,
      reconstitution: (p.reconstitution ?? {}) as object,
      storage: p.storage,
      contraindications: p.contraindications ?? [],
      interactions: p.interactions ?? [],
      references: p.references ?? [],
      tags: p.tags ?? [],
      status: p.status ?? "research",
    };
    await prisma.peptide.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });
  }

  // 2b) Upsert the biomarker catalog (global reference + knowledge base).
  const biomarkers = loadBiomarkers();
  console.log(
    `Loaded ${biomarkers.length} biomarker records from prisma/data/biomarkers/`,
  );
  for (const b of biomarkers) {
    const data = {
      name: b.name,
      aliases: b.aliases ?? [],
      system: b.system,
      unit: b.unit,
      summary: b.summary,
      whatItMeans: b.whatItMeans,
      raises: b.raises ?? [],
      lowers: b.lowers ?? [],
      confounders: b.confounders ?? [],
      relatedPeptides: b.relatedPeptides ?? [],
      ranges: (b.ranges ?? []) as object,
      references: b.references ?? [],
      direction: b.direction ?? null,
    };
    await prisma.biomarker.upsert({
      where: { slug: b.slug },
      update: data,
      create: { slug: b.slug, ...data },
    });
  }

  // 3) Build a resolver from any name/alias/slug -> canonical slug.
  const all = await prisma.peptide.findMany({
    select: { id: true, slug: true, name: true, aliases: true },
  });
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const lookup = new Map<string, string>();
  for (const p of all) {
    lookup.set(norm(p.slug), p.slug);
    lookup.set(norm(p.name), p.slug);
    for (const a of (p.aliases as string[]) ?? []) lookup.set(norm(a), p.slug);
  }

  // 4) Derive peptide<->peptide interactions (dedup with canonical ordering).
  await prisma.peptideInteraction.deleteMany();
  const seen = new Set<string>();
  for (const p of peptides) {
    for (const inter of p.interactions ?? []) {
      const targetSlug = lookup.get(norm(inter.with));
      if (!targetSlug || targetSlug === p.slug) continue; // skip non-peptides / self
      const a = bySlug.get(p.slug)!;
      const b = bySlug.get(targetSlug)!;
      const [aId, bId] = [a.id, b.id].sort();
      const key = `${aId}:${bId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await prisma.peptideInteraction.create({
        data: {
          peptideAId: aId,
          peptideBId: bId,
          kind: inter.kind,
          note: inter.note,
        },
      });
    }
  }
  console.log(`Created ${seen.size} peptide-to-peptide interactions`);

  // 5) Preset stacks.
  for (const s of PRESET_STACKS) {
    const items = s.items
      .map((it, order) => {
        const slug = lookup.get(norm(it.peptide));
        const pep = slug ? bySlug.get(slug) : undefined;
        return pep ? { peptideId: pep.id, timing: it.timing, order } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const stack = await prisma.stack.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        goal: s.goal,
        description: s.description,
        isPreset: true,
        tags: s.tags,
      },
      create: {
        slug: s.slug,
        name: s.name,
        goal: s.goal,
        description: s.description,
        isPreset: true,
        tags: s.tags,
      },
    });
    // Reset items for idempotency.
    await prisma.stackItem.deleteMany({ where: { stackId: stack.id } });
    for (const item of items) {
      await prisma.stackItem.create({ data: { stackId: stack.id, ...item } });
    }
  }
  console.log(`Upserted ${PRESET_STACKS.length} preset stacks`);

  // 6) Demo health data for the default profile (idempotent: only if empty).
  const tesa = bySlug.get("tesamorelin");
  if (tesa) {
    const vialCount = await prisma.vial.count({ where: { userId: user.id } });
    if (vialCount === 0) {
      await prisma.vial.create({
        data: {
          userId: user.id,
          peptideId: tesa.id,
          label: "Tesamorelin 10mg",
          totalMcg: 10000,
          bacWaterMl: 2,
          concentrationMcgPerMl: 5000,
          remainingMcg: 7500,
          reconstitutedAt: new Date(Date.now() - 6 * 86_400_000),
          expiresAt: new Date(Date.now() + 5 * 86_400_000), // expiring soon (demo)
          status: "active",
        },
      });
    }
  }
  // Stock reserve demo (idempotent): a healthy peptide + a low one for the alert.
  const stockCount = await prisma.stockItem.count({
    where: { userId: user.id },
  });
  if (stockCount === 0) {
    const bpc = bySlug.get("bpc-157");
    const tb = bySlug.get("tb-500");
    if (bpc) {
      await prisma.stockItem.create({
        data: {
          userId: user.id,
          peptideId: bpc.id,
          vialMcg: 5000,
          quantity: 3,
          dose: 250,
          doseUnit: "mcg",
          frequency: "daily",
        },
      });
    }
    if (tb) {
      await prisma.stockItem.create({
        data: {
          userId: user.id,
          peptideId: tb.id,
          vialMcg: 5000,
          quantity: 1, // one vial on hand → triggers the low-stock alert
          dose: 2,
          doseUnit: "mg",
          frequency: "twice-weekly",
        },
      });
    }
  }

  const labCount = await prisma.labResult.count({ where: { userId: user.id } });
  if (labCount === 0) {
    const igf = [
      { d: 90, v: 180 },
      { d: 45, v: 230 },
      { d: 5, v: 265 },
    ];
    for (const r of igf) {
      await prisma.labResult.create({
        data: {
          userId: user.id,
          marker: "IGF-1",
          value: r.v,
          unit: "ng/mL",
          refLow: 88,
          refHigh: 246,
          takenAt: new Date(Date.now() - r.d * 86_400_000),
        },
      });
    }
  }
  // Bodyweight series (aligns with IGF dates so the correlation view has data).
  const weightCount = await prisma.measurement.count({
    where: { userId: user.id, type: "weight" },
  });
  if (weightCount === 0) {
    const weights = [
      { d: 90, v: 82.5 },
      { d: 45, v: 84 },
      { d: 5, v: 85.6 },
    ];
    for (const w of weights) {
      await prisma.measurement.create({
        data: {
          userId: user.id,
          type: "weight",
          value: w.v,
          unit: "kg",
          recordedAt: new Date(Date.now() - w.d * 86_400_000),
        },
      });
    }
  }

  // Food tracker: default nutrition goals + a starter "My Foods" library and a
  // day of logs, so /food and its metrics series aren't empty in dev.
  if (user.calorieGoal == null) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        calorieGoal: 2200,
        proteinGoal: 160,
        carbGoal: 220,
        fatGoal: 70,
        fiberGoal: 30,
        sodiumGoal: 2300,
        waterGoal: 2500,
      },
    });
  }
  if (user.heightCm == null) {
    await prisma.user.update({
      where: { id: user.id },
      data: { heightCm: 178 },
    });
  }

  const foodItemCount = await prisma.foodItem.count({
    where: { userId: user.id },
  });
  if (foodItemCount === 0) {
    const foods = [
      {
        name: "Chicken breast",
        servingSize: 100,
        servingUnit: "g",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
      },
      {
        name: "White rice (cooked)",
        servingSize: 100,
        servingUnit: "g",
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        fiber: 0.4,
      },
      {
        name: "Greek yogurt (nonfat)",
        servingSize: 170,
        servingUnit: "g",
        calories: 100,
        protein: 17,
        carbs: 6,
        fat: 0.7,
        fiber: 0,
      },
      {
        name: "Whole egg",
        servingSize: 1,
        servingUnit: "large",
        calories: 72,
        protein: 6.3,
        carbs: 0.4,
        fat: 4.8,
        fiber: 0,
      },
      {
        name: "Banana",
        servingSize: 1,
        servingUnit: "medium",
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
        fiber: 3.1,
      },
      {
        name: "Olive oil",
        servingSize: 1,
        servingUnit: "tbsp",
        calories: 119,
        protein: 0,
        carbs: 0,
        fat: 13.5,
        fiber: 0,
      },
    ];
    await prisma.foodItem.createMany({
      data: foods.map((f) => ({ userId: user.id, ...f })),
    });
  }

  const midnight = (daysAgo: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  // Recipe (a composed FoodItem) so the recipe surface + badge have an example.
  const recipeCount = await prisma.foodItem.count({
    where: { userId: user.id, name: "Chicken & rice bowl" },
  });
  if (recipeCount === 0) {
    await prisma.foodItem.create({
      data: {
        userId: user.id,
        name: "Chicken & rice bowl",
        servingSize: 1,
        servingUnit: "1 serving",
        source: "Recipe",
        recipeServings: 2,
        // Per-serving = (2×chicken + 1.5×rice) ÷ 2.
        calories: 263,
        protein: 33,
        carbs: 21,
        fat: 3.9,
        ingredients: [
          {
            name: "Chicken breast",
            amount: 2,
            unit: "100 g",
            calories: 330,
            protein: 62,
            carbs: 0,
            fat: 7.2,
          },
          {
            name: "White rice (cooked)",
            amount: 1.5,
            unit: "1 cup",
            calories: 195,
            protein: 4.1,
            carbs: 42,
            fat: 0.5,
          },
        ],
      },
    });
  }

  const foodLogCount = await prisma.foodLog.count({
    where: { userId: user.id },
  });
  if (foodLogCount === 0) {
    // ~14 days of logs so the weekly report, streak, and adaptive-TDEE estimate
    // all have data to work with.
    const template = [
      {
        mealType: "breakfast",
        name: "Greek yogurt (nonfat)",
        quantity: 1,
        calories: 100,
        protein: 17,
        carbs: 6,
        fat: 0.7,
        fiber: 0,
        sugar: 4,
        sodium: 60,
      },
      {
        mealType: "breakfast",
        name: "Banana",
        quantity: 1,
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
        fiber: 3.1,
        sugar: 14,
        sodium: 1,
      },
      {
        mealType: "lunch",
        name: "Chicken breast",
        quantity: 2,
        calories: 330,
        protein: 62,
        carbs: 0,
        fat: 7.2,
        fiber: 0,
        sugar: 0,
        sodium: 148,
      },
      {
        mealType: "lunch",
        name: "White rice (cooked)",
        quantity: 1.5,
        calories: 195,
        protein: 4.1,
        carbs: 42,
        fat: 0.5,
        fiber: 0.6,
        sugar: 0.2,
        sodium: 2,
      },
      {
        mealType: "dinner",
        name: "Whole egg",
        quantity: 3,
        calories: 216,
        protein: 18.9,
        carbs: 1.2,
        fat: 14.4,
        fiber: 0,
        sugar: 1,
        sodium: 210,
      },
      {
        mealType: "dinner",
        name: "Olive oil",
        quantity: 1,
        calories: 119,
        protein: 0,
        carbs: 0,
        fat: 13.5,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      },
    ];
    const data = [];
    for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
      const date = midnight(daysAgo);
      for (const e of template) {
        const jitter = e.mealType === "dinner" ? (daysAgo % 3) * 40 : 0;
        data.push({
          userId: user.id,
          date,
          ...e,
          calories: e.calories + jitter,
        });
      }
    }
    await prisma.foodLog.createMany({ data });
  }

  // A gently downward weight trend across the window so TDEE reads a deficit.
  const recentWeightCount = await prisma.measurement.count({
    where: {
      userId: user.id,
      type: "weight",
      recordedAt: { gte: midnight(20) },
    },
  });
  if (recentWeightCount < 4) {
    const pts = [
      { d: 14, v: 85.8 },
      { d: 11, v: 85.6 },
      { d: 8, v: 85.3 },
      { d: 5, v: 85.1 },
      { d: 2, v: 84.9 },
    ];
    await prisma.measurement.createMany({
      data: pts.map((w) => ({
        userId: user.id,
        type: "weight",
        value: w.v,
        unit: "kg",
        recordedAt: midnight(w.d),
      })),
    });
  }

  // Today's water so the water ring isn't empty.
  const waterCount = await prisma.measurement.count({
    where: { userId: user.id, type: "water" },
  });
  if (waterCount === 0) {
    const now = new Date();
    await prisma.measurement.createMany({
      data: [500, 500, 250].map((ml) => ({
        userId: user.id,
        type: "water",
        value: ml,
        unit: "mL",
        recordedAt: now,
      })),
    });
  }

  console.log(`Seed complete for user "${user.name}" (${user.id})`);
  console.log(`Demo login -> ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

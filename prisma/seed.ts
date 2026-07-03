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
